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

    console.log('✅ Invoice created with taxes:', {
      subtotal,
      taxesCount: taxes.length,
      taxAmount,
      total
    });

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('customer')
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

    const invoiceExisting = await Invoice.findById(req.params.id);
    if (!invoiceExisting) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if ((approvalStatus === 'approved' || approvalStatus === 'rejected') && invoiceExisting.approvalStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Only pending invoices can be ${approvalStatus}`
      });
    }

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
    
    if (company.logo && fs.existsSync(company.logo)) {
      doc.image(company.logo, 50, yPos, { width: 120 });
      yPos = 180;
    }
    
    doc.fontSize(20).font('Helvetica-Bold').text(company.name, 50, yPos);
    yPos += 25;
    
    doc.fontSize(10).font('Helvetica');
    doc.text(company.address, 50, yPos);
    yPos += 15;
    doc.text(company.phone, 50, yPos);
    yPos += 15;
    doc.text(company.email, 50, yPos);
    yPos += 15;
    
    if (company.taxNumber) {
      doc.text(`Tax No: ${company.taxNumber}`, 50, yPos);
      yPos += 15;
    }
    
    const titleY = 50;
    doc.fontSize(24).font('Helvetica-Bold').text('INVOICE', 400, titleY, { width: 150, align: 'right' });
    
    doc.fontSize(10).font('Helvetica');
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, 400, titleY + 35, { width: 150, align: 'right' });
    doc.text(`Date: ${new Date(invoice.date).toLocaleDateString()}`, 400, titleY + 50, { width: 150, align: 'right' });
    doc.text(`Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}`, 400, titleY + 65, { width: 150, align: 'right' });
    doc.text(`Status: ${invoice.status.toUpperCase()}`, 400, titleY + 80, { width: 150, align: 'right' });
    
    yPos += 30;
    doc.fontSize(10).font('Helvetica-Bold').text('Bill To:', 50, yPos);
    yPos += 15;
    doc.font('Helvetica');
    doc.text(invoice.customer.name, 50, yPos);
    yPos += 15;
    if (invoice.customer.email) {
      doc.text(invoice.customer.email, 50, yPos);
      yPos += 15;
    }
    if (invoice.customer.phone) {
      doc.text(invoice.customer.phone, 50, yPos);
      yPos += 15;
    }
    if (invoice.customer.address) {
      doc.text(invoice.customer.address, 50, yPos);
      yPos += 15;
    }
    
    yPos += 20;
    const tableTop = yPos;
    
    // ✅ REMOVED tax column from items table
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('#', 50, tableTop, { width: 30 });
    doc.text('Description', 80, tableTop, { width: 200 });
    doc.text('Qty', 280, tableTop, { width: 40, align: 'center' });
    doc.text('Unit Price', 320, tableTop, { width: 80, align: 'right' });
    doc.text('Disc %', 400, tableTop, { width: 60, align: 'center' });
    doc.text('Total', 460, tableTop, { width: 90, align: 'right' });
    
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    
    yPos = tableTop + 25;
    doc.font('Helvetica');
    
    invoice.items.forEach((item, index) => {
      const itemTotal = formatCurrency(item.total, company.currencySymbol);
      const unitPrice = formatCurrency(item.unitPrice, company.currencySymbol);
      const discountPercent = item.discount || 0;
      
      doc.fontSize(9);
      doc.text(index + 1, 50, yPos, { width: 30 });
      doc.text(item.description || item.product?.name, 80, yPos, { width: 200 });
      doc.text(item.quantity.toString(), 280, yPos, { width: 40, align: 'center' });
      doc.text(unitPrice, 320, yPos, { width: 80, align: 'right' });
      doc.text(`${discountPercent}%`, 400, yPos, { width: 60, align: 'center' });
      doc.text(itemTotal, 460, yPos, { width: 90, align: 'right' });
      
      yPos += 30;
    });
    
    doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
    yPos += 15;
    
    doc.fontSize(10).font('Helvetica');
    doc.text('Subtotal:', 360, yPos);
    doc.text(formatCurrency(invoice.subtotal, company.currencySymbol), 460, yPos, { width: 90, align: 'right' });
    
    if (invoice.discount && invoice.discount > 0) {
      yPos += 20;
      doc.text('Discount:', 360, yPos);
      doc.text('-' + formatCurrency(invoice.discount, company.currencySymbol), 460, yPos, { width: 90, align: 'right' });
    }
    
    // ✅ SHOW GLOBAL TAX
    if (invoice.taxRate && invoice.taxRate > 0) {
      yPos += 20;
      doc.text(`Tax (${invoice.taxRate}%):`, 360, yPos);
      doc.text(formatCurrency(invoice.taxAmount, company.currencySymbol), 460, yPos, { width: 90, align: 'right' });
    }
    
    yPos += 25;
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Total:', 360, yPos);
    doc.text(formatCurrency(invoice.total, company.currencySymbol), 460, yPos, { width: 90, align: 'right' });
    
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