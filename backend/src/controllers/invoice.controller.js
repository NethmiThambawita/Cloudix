import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import Company from '../models/Company.js';
import Product from '../models/Product.js';
import Sequence from '../models/Sequence.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const getNextSequence = async (type) => {
  const sequence = await Sequence.findOneAndUpdate(
    { type },
    { $inc: { current: 1 } },
    { new: true, upsert: true }
  );
  return sequence.current;
};

const formatCurrency = (amount, symbol = 'Rs.') => {
  return `${symbol} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Tax calculation with multiple taxes
const calculateTotals = async (items, discount = 0, taxIds = []) => {
  let subtotal = 0;

  // Calculate subtotal with item discounts (NO TAX YET)
  items.forEach(item => {
    const itemTotal = item.quantity * item.unitPrice;
    const itemDiscountPercent = parseFloat(item.discount) || 0;
    const itemDiscountAmount = itemTotal * (itemDiscountPercent / 100);
    const itemSubtotal = itemTotal - itemDiscountAmount;

    subtotal += itemSubtotal;
    item.total = itemSubtotal; // Item total WITHOUT tax
  });

  // Apply overall discount percentage to subtotal
  const discountAmount = subtotal * (discount / 100);
  const finalSubtotal = subtotal - discountAmount;

  // Calculate total tax from all selected taxes
  let taxAmount = 0;
  if (taxIds && taxIds.length > 0) {
    const Tax = (await import('../models/Tax.js')).default;
    const taxes = await Tax.find({ _id: { $in: taxIds } });

    taxes.forEach(tax => {
      const individualTaxAmount = finalSubtotal * (tax.value / 100);
      taxAmount += individualTaxAmount;
    });
  }

  const total = finalSubtotal + taxAmount;

  console.log('💰 Tax Calculation:', {
    subtotal,
    discountAmount,
    finalSubtotal,
    selectedTaxes: taxIds.length,
    taxAmount,
    total
  });

  return {
    subtotal,
    taxAmount,
    discountAmount,
    total
  };
};


export const getAllInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, customer, search } = req.query;
    const query = {};
    
    // ✅ Filter by user role
    if (req.user.role !== 'admin') {
      query.createdBy = req.user._id;
    }
    
    if (status) query.status = status;
    if (customer) query.customer = customer;
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    const invoices = await Invoice.find(query)
      .populate('customer', 'name email phone')
      .populate('supplier', 'name email phone')
      .populate('items.product', 'name')
      .populate('taxes', 'name type value')
      .populate('createdBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();
    
    const count = await Invoice.countDocuments(query);
    
    return res.status(200).json({
      success: true,
      result: invoices,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error in getAllInvoices:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message
    });
  }
};

export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer')
      .populate('supplier')
      .populate('items.product')
      .populate('taxes', 'name type value')
      .populate('createdBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .lean();
    
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // ✅ Non-admin users can only view their own invoices
    if (req.user?.role !== 'admin' && invoice.createdBy && invoice.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own invoices'
      });
    }
    
    return res.status(200).json({ success: true, result: invoice });
  } catch (error) {
    console.error('Error in getInvoiceById:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createInvoice = async (req, res) => {
  try {
    const company = await Company.findOne();
    const {
      items,
      discount = 0,
      taxes = []
    } = req.body;

    console.log('📝 Creating invoice with taxes:', { taxes });

    // Calculate with multiple taxes
    const { subtotal, taxAmount, discountAmount, total } =
      await calculateTotals(items, discount, taxes);

    const sequenceNumber = await getNextSequence('invoice');
    const prefix = company?.prefixes?.invoice || 'SI-';
    const invoiceNumber = `${prefix}${String(sequenceNumber).padStart(5, '0')}`;

    const terms = req.body.terms || company?.defaultTerms || '';
    const notes = req.body.notes || company?.defaultNotes || '';

    const approvalData = {
      approvalStatus: 'pending',
      approvedBy: null,
      approvedAt: null
    };

    // ✅ STOCK DEDUCTION: Deduct stock immediately when invoice is created
    const Stock = (await import('../models/Stock.js')).default;
    const StockTransaction = (await import('../models/StockTransaction.js')).default;
    const Product = (await import('../models/Product.js')).default;
    const defaultLocation = 'Main Warehouse';

    // Validate stock availability for all items first
    for (const item of items) {
      const product = await Product.findById(item.product);

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.description || 'Unknown'}`
        });
      }

      const stock = await Stock.findOne({
        product: item.product,
        location: defaultLocation
      });

      if (!stock) {
        return res.status(400).json({
          success: false,
          message: `No stock record found for product: ${product.name || item.description}`
        });
      }

      if (stock.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name || item.description}. Available: ${stock.quantity}, Required: ${item.quantity}`
        });
      }
    }

    const invoice = await Invoice.create({
      ...req.body,
      type: 'invoice',
      invoiceNumber,
      subtotal,
      taxes,
      taxAmount,
      discount: discountAmount,
      total,
      balanceAmount: total,
      paidAmount: 0,
      items,
      terms,
      notes,
      createdBy: req.user?._id,
      ...approvalData
    });

    // All validation passed, now deduct stock and create transactions
    for (const item of items) {
      const product = await Product.findById(item.product);
      const stock = await Stock.findOne({
        product: item.product,
        location: defaultLocation
      });

      const balanceBefore = stock.quantity;
      const balanceAfter = balanceBefore - item.quantity;

      // Update stock quantity
      stock.quantity = balanceAfter;
      await stock.save();

      // Create stock transaction for audit trail
      await StockTransaction.create({
        transactionType: 'sale',
        product: item.product,
        quantity: item.quantity,
        fromLocation: defaultLocation,
        referenceType: 'Invoice',
        referenceId: invoice._id,
        referenceNumber: invoice.invoiceNumber,
        balanceBefore,
        balanceAfter,
        unitPrice: item.unitPrice,
        totalValue: item.total,
        reason: 'Stock deducted for invoice creation',
        notes: `Invoice ${invoice.invoiceNumber} created - ${item.quantity} units of ${product.name || item.description} sold`,
        performedBy: req.user._id,
        transactionDate: new Date()
      });
    }

    console.log(`✅ Stock deducted for invoice ${invoice.invoiceNumber} - ${items.length} items`);

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('customer')
      .populate('supplier')
      .populate('items.product')
      .populate('taxes')
      .populate('approvedBy', 'firstName lastName email')
      .lean();

    return res.status(201).json({
      success: true,
      result: populatedInvoice,
      message: 'Invoice created successfully'
    });
  } catch (error) {
    console.error('Error in createInvoice:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const existing = await Invoice.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // ✅ Only admin can edit approved invoices
    if (existing.approvalStatus === 'approved' && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Approved invoices cannot be modified'
      });
    }

    // ✅ Users can only edit their own invoices
    if (req.user.role !== 'admin' && existing.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own invoices'
      });
    }

    const {
      items,
      discount = 0,
      taxes = []
    } = req.body;

    console.log('📝 Updating invoice with taxes:', { taxes });

    if (items) {
      const { subtotal, taxAmount, discountAmount, total } =
        await calculateTotals(items, discount, taxes);

      req.body.subtotal = subtotal;
      req.body.taxAmount = taxAmount;
      req.body.discount = discountAmount;
      req.body.total = total;
      req.body.balanceAmount = total - (req.body.paidAmount || 0);

      console.log('✅ Invoice updated with taxes:', {
        subtotal,
        taxesCount: taxes.length,
        taxAmount,
        total
      });
    }

    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('customer')
    .populate('supplier')
    .populate('items.product')
    .populate('taxes', 'name type value')
    .populate('approvedBy', 'firstName lastName email')
    .lean();
    
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    
    return res.status(200).json({ 
      success: true, 
      result: invoice, 
      message: 'Invoice updated successfully' 
    });
  } catch (error) {
    console.error('Error in updateInvoice:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateInvoiceStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const validStatuses = ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
      });
    }
    
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
    .populate('customer')
    .populate('supplier')
    .populate('items.product')
    .populate('approvedBy', 'firstName lastName email')
    .lean();
    
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    
    return res.status(200).json({ 
      success: true, 
      result: invoice, 
      message: `Invoice status updated to ${status}` 
    });
  } catch (error) {
    console.error('Error in updateInvoiceStatus:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateInvoiceApproval = async (req, res) => {
  try {
    const { approvalStatus } = req.body;

    const validStatuses = ['approved', 'rejected', 'pending'];
    if (!validStatuses.includes(approvalStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid approval status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    const invoiceExisting = await Invoice.findById(req.params.id).populate('items.product');
    if (!invoiceExisting) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if ((approvalStatus === 'approved' || approvalStatus === 'rejected') && invoiceExisting.approvalStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Only pending invoices can be ${approvalStatus}`
      });
    }

    // Note: Stock is already deducted when invoice is created, no need to deduct again on approval

    const updateData = { approvalStatus };

    if (approvalStatus === 'approved' || approvalStatus === 'rejected') {
      updateData.approvedBy = req.user._id;
      updateData.approvedAt = new Date();
    } else {
      updateData.approvedBy = null;
      updateData.approvedAt = null;
    }

    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    )
      .populate('customer')
      .populate('supplier')
      .populate('items.product')
      .populate('approvedBy', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .lean();

    return res.status(200).json({
      success: true,
      result: invoice,
      message: `Invoice ${approvalStatus}`
    });
  } catch (error) {
    console.error('Error in updateInvoiceApproval:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'Invoice deleted successfully' 
    });
  } catch (error) {
    console.error('Error in deleteInvoice:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ UPDATED PDF - Shows global tax only
export const generateInvoicePDF = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer')
      .populate('supplier')
      .populate('items.product');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // ✅ Non-admin users can only view PDFs of their own invoices
    if (req.user?.role !== 'admin' && invoice.createdBy && invoice.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only view PDFs of your own invoices'
      });
    }
    
    const company = await Company.findOne();

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const filename = `Invoice-${invoice.invoiceNumber}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    doc.pipe(res);

    const pageWidth = doc.page.width;
    let yPos = 50;

    // Professional color scheme
    const primaryColor = '#1890ff';      // Blue
    const secondaryColor = '#52c41a';    // Green
    const accentColor = '#faad14';       // Gold
    const darkColor = '#001529';         // Dark Blue
    const lightGray = '#f0f2f5';
    const borderColor = '#d9d9d9';
    
    // Header background with gradient effect
    doc.rect(0, 0, pageWidth, 120).fill(darkColor);

    yPos = 30;

    if (company.logo && fs.existsSync(company.logo)) {
      doc.image(company.logo, 50, yPos, { width: 100, height: 60 });
    }

    // Company name in white
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text(company.name, 50, yPos + 70);

    // INVOICE title with primary color background
    doc.rect(400, 30, 145, 50).fill(primaryColor);
    doc.fillColor('#ffffff').fontSize(28).font('Helvetica-Bold')
       .text('INVOICE', 400, 45, { width: 145, align: 'center' });

    // Invoice details box
    yPos = 90;
    doc.roundedRect(390, yPos, 160, 80, 5).fill('#ffffff');

    doc.fillColor(darkColor).fontSize(9).font('Helvetica-Bold');
    doc.text('Invoice #:', 400, yPos + 10);
    doc.fillColor(primaryColor).font('Helvetica').text(invoice.invoiceNumber, 460, yPos + 10);

    doc.fillColor(darkColor).font('Helvetica-Bold').text('Date:', 400, yPos + 25);
    doc.fillColor('#000000').font('Helvetica').text(new Date(invoice.date).toLocaleDateString(), 460, yPos + 25);

    doc.fillColor(darkColor).font('Helvetica-Bold').text('Due Date:', 400, yPos + 40);
    doc.fillColor('#000000').font('Helvetica').text(invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A', 460, yPos + 40);

    doc.fillColor(darkColor).font('Helvetica-Bold').text('Status:', 400, yPos + 55);
    const statusColor = invoice.status === 'paid' ? secondaryColor : invoice.status === 'overdue' ? '#ff4d4f' : accentColor;
    doc.fillColor(statusColor).font('Helvetica-Bold').text(invoice.status.toUpperCase(), 460, yPos + 55);

    // Reset position after header
    yPos = 180;
    
    // Bill To section with colored box
    doc.roundedRect(45, yPos, 240, 100, 5).stroke(borderColor);
    doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('BILL TO', 55, yPos + 10);
    doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');

    if (invoice.customer) {
      doc.text(invoice.customer.name || 'N/A', 55, yPos + 30);
      doc.font('Helvetica').fontSize(9);
      if (invoice.customer.email) {
        doc.fillColor('#666666').text(invoice.customer.email, 55, yPos + 45);
      }
      if (invoice.customer.phone) {
        doc.fillColor('#666666').text(invoice.customer.phone, 55, yPos + 58);
      }
      if (invoice.customer.address) {
        doc.fillColor('#666666').text(invoice.customer.address, 55, yPos + 71, { width: 220 });
      }
    } else {
      doc.fillColor('#ff4d4f').text('[Customer Deleted]', 55, yPos + 30);
    }

    // Supplier section if available
    if (invoice.supplier) {
      doc.roundedRect(305, yPos, 240, 100, 5).stroke(borderColor);
      doc.fillColor(secondaryColor).fontSize(11).font('Helvetica-Bold').text('SUPPLIER', 315, yPos + 10);
      doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');
      doc.text(invoice.supplier.name || 'N/A', 315, yPos + 30);
      doc.font('Helvetica').fontSize(9);
      if (invoice.supplier.email) {
        doc.fillColor('#666666').text(invoice.supplier.email, 315, yPos + 45);
      }
      if (invoice.supplier.phone) {
        doc.fillColor('#666666').text(invoice.supplier.phone, 315, yPos + 58);
      }
    }

    yPos += 110;

    const tableTop = yPos;

    // Table header with colored background
    doc.rect(45, tableTop, 505, 25).fill(primaryColor);
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
    doc.text('#', 50, tableTop + 8, { width: 30 });
    doc.text('Description', 80, tableTop + 8, { width: 200 });
    doc.text('Qty', 280, tableTop + 8, { width: 40, align: 'center' });
    doc.text('Unit Price', 320, tableTop + 8, { width: 80, align: 'right' });
    doc.text('Disc %', 400, tableTop + 8, { width: 60, align: 'center' });
    doc.text('Total', 460, tableTop + 8, { width: 90, align: 'right' });
    
    yPos = tableTop + 30;
    doc.fillColor('#000000').font('Helvetica').fontSize(9);

    invoice.items.forEach((item, index) => {
      const itemTotal = formatCurrency(item.total, company.currencySymbol);
      const unitPrice = formatCurrency(item.unitPrice, company.currencySymbol);
      const discountPercent = item.discount || 0;

      // Alternating row colors for better readability
      if (index % 2 === 0) {
        doc.rect(45, yPos - 3, 505, 22).fill('#fafafa').stroke();
      }

      doc.fillColor('#000000');
      doc.text(index + 1, 50, yPos, { width: 30 });
      doc.text(item.description || item.product?.name || 'N/A', 80, yPos, { width: 200 });
      doc.text(item.quantity.toString(), 280, yPos, { width: 40, align: 'center' });
      doc.text(unitPrice, 320, yPos, { width: 80, align: 'right' });
      doc.fillColor(discountPercent > 0 ? secondaryColor : '#000000');
      doc.text(`${discountPercent}%`, 400, yPos, { width: 60, align: 'center' });
      doc.fillColor('#000000').font('Helvetica-Bold');
      doc.text(itemTotal, 460, yPos, { width: 90, align: 'right' });
      doc.font('Helvetica');

      yPos += 25;
    });

    // Bottom border of table
    doc.moveTo(45, yPos).lineTo(550, yPos).stroke(borderColor);
    yPos += 20;

    // Summary box with styling
    const summaryX = 350;
    const summaryWidth = 200;

    doc.fillColor('#000000').fontSize(10).font('Helvetica');
    doc.text('Subtotal:', summaryX, yPos);
    doc.font('Helvetica-Bold').text(formatCurrency(invoice.subtotal, company.currencySymbol), summaryX + 110, yPos, { width: 90, align: 'right' });

    if (invoice.discount && invoice.discount > 0) {
      yPos += 18;
      doc.fillColor(secondaryColor).font('Helvetica').text('Discount:', summaryX, yPos);
      doc.text('-' + formatCurrency(invoice.discount, company.currencySymbol), summaryX + 110, yPos, { width: 90, align: 'right' });
    }

    if (invoice.taxAmount && invoice.taxAmount > 0) {
      yPos += 18;
      doc.fillColor('#000000').font('Helvetica').text('Tax:', summaryX, yPos);
      doc.text(formatCurrency(invoice.taxAmount, company.currencySymbol), summaryX + 110, yPos, { width: 90, align: 'right' });
    }

    yPos += 25;
    // Total with colored background
    doc.roundedRect(summaryX - 10, yPos - 5, summaryWidth + 10, 30, 5).fill(darkColor);
    doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold');
    doc.text('TOTAL:', summaryX, yPos + 5);
    doc.fontSize(14).text(formatCurrency(invoice.total, company.currencySymbol), summaryX + 110, yPos + 5, { width: 90, align: 'right' });

    doc.fillColor('#000000');
    
    yPos += 40;
    
    if (invoice.notes) {
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Notes:', 50, yPos);
      doc.font('Helvetica').fontSize(9);
      const notesLines = invoice.notes.split('\n');
      let notesY = yPos + 15;
      notesLines.forEach(line => {
        doc.text(line, 50, notesY, { width: 500 });
        notesY += 15;
      });
      yPos = notesY + 10;
    }
    
    if (invoice.terms) {
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Terms & Conditions:', 50, yPos);
      doc.font('Helvetica').fontSize(9);
      const termsLines = invoice.terms.split('\n');
      let termsY = yPos + 15;
      termsLines.forEach(line => {
        doc.text(line, 50, termsY, { width: 500 });
        termsY += 15;
      });
      yPos = termsY;
    }
    
    const footerText = company.invoiceFooter || "This invoice was created on a computer and is valid without the signature and seal";
    doc.fontSize(8).font('Helvetica').text(
      footerText,
      50,
      doc.page.height - 70,
      {
        align: 'center',
        width: doc.page.width - 100
      }
    );
    
    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};