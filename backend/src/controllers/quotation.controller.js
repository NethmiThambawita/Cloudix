import Quotation from '../models/Quotation.js';
import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import Company from '../models/Company.js';
import Product from '../models/Product.js';
import Sequence from '../models/Sequence.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';

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


export const getAllQuotations = async (req, res) => {
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
        { quotationNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } }
      ];
    }
    
    const quotations = await Quotation.find(query)
      .populate('customer', 'name email phone')
      .populate('supplier', 'name email phone')
      .populate('items.product', 'name')
      .populate('taxes', 'name type value')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const count = await Quotation.countDocuments(query);
    
    res.json({
      success: true,
      result: quotations,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getQuotationById = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('customer')
      .populate('supplier')
      .populate('items.product')
      .populate('taxes', 'name type value')
      .populate('createdBy', 'firstName lastName email');
    
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    // ✅ Non-admin users can only view their own quotations
    if (req.user?.role !== 'admin' && quotation.createdBy && quotation.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own quotations'
      });
    }
    
    res.json({ success: true, result: quotation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createQuotation = async (req, res) => {
  try {
    const company = await Company.findOne();
    const {
      items,
      discount = 0,
      taxes = []
    } = req.body;

    console.log('📝 Creating quotation with taxes:', { taxes });

    const { subtotal, taxAmount, discountAmount, total } =
      await calculateTotals(items, discount, taxes);

    const sequenceNumber = await getNextSequence('quotation');
    const prefix = company?.prefixes?.quotation || 'SQ-';
    const quotationNumber = `${prefix}${String(sequenceNumber).padStart(5, '0')}`;

    const terms = req.body.terms || company?.defaultTerms || '';
    const notes = req.body.notes || company?.defaultNotes || '';

    const quotation = await Quotation.create({
      ...req.body,
      quotationNumber,
      subtotal,
      taxes,
      taxAmount,
      discount: discountAmount,
      total,
      items,
      terms,
      notes,
      createdBy: req.user?._id
    });

    console.log('✅ Quotation created with taxes:', {
      subtotal,
      taxesCount: taxes.length,
      taxAmount,
      total
    });

    const populatedQuotation = await Quotation.findById(quotation._id)
      .populate('customer')
      .populate('supplier')
      .populate('items.product')
      .populate('taxes', 'name type value')

    res.status(201).json({
      success: true,
      result: populatedQuotation,
      message: 'Quotation created successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateQuotation = async (req, res) => {
  try {
    const existing = await Quotation.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    // ✅ Users can only edit their own quotations
    if (req.user.role !== 'admin' && existing.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own quotations'
      });
    }

    const {
      items,
      discount = 0,
      taxes = []
    } = req.body;

    console.log('📝 Updating quotation with taxes:', { taxes });

    if (items) {
      const { subtotal, taxAmount, discountAmount, total } =
        await calculateTotals(items, discount, taxes);

      req.body.subtotal = subtotal;
      req.body.taxAmount = taxAmount;
      req.body.discount = discountAmount;
      req.body.total = total;

      console.log('✅ Quotation updated with taxes:', {
        subtotal,
        taxesCount: taxes.length,
        taxAmount,
        total
      });
    }
    
    const quotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('customer')
    .populate('supplier')
    .populate('items.product')
    .populate('taxes', 'name type value')
    
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }
    
    res.json({ success: true, result: quotation, message: 'Quotation updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateQuotationStatus = async (req, res) => {
  try {
    console.log('📝 Updating quotation status:', req.params.id, req.body);
    
    const { status } = req.body;
    
    const validStatuses = ['draft', 'sent', 'approved', 'rejected', 'expired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
      });
    }
    
    const quotation = await Quotation.findById(req.params.id);
    
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }
    
    // ✅ REMOVED: Self-approval check - let admin approve any quotation
    // Allow status change
    
    quotation.status = status;
    await quotation.save();
    
    const updatedQuotation = await Quotation.findById(quotation._id)
      .populate('customer')
      .populate('supplier')
      .populate('items.product')
      .populate('createdBy', 'firstName lastName email')
      .lean();
    
    console.log('✅ Status updated successfully');
    
    res.json({ 
      success: true, 
      result: updatedQuotation, 
      message: `Quotation ${status}` 
    });
  } catch (error) {
    console.error('❌ Error updating status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


export const deleteQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findByIdAndDelete(req.params.id);
    
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }
    
    res.json({ success: true, message: 'Quotation deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// FIXED: PDF shows discount as % not Rs.
export const generateQuotationPDF = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('customer')
      .populate('supplier')
      .populate('items.product');

    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    // ✅ Non-admin users can only view PDFs of their own quotations
    if (req.user?.role !== 'admin' && quotation.createdBy && quotation.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only view PDFs of your own quotations'
      });
    }
    
    const company = await Company.findOne();

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const filename = `Quotation-${quotation.quotationNumber}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    doc.pipe(res);

    const pageWidth = doc.page.width;
    let yPos = 50;

    // Professional color scheme
    const primaryColor = '#1890ff';
    const secondaryColor = '#52c41a';
    const accentColor = '#faad14';
    const darkColor = '#001529';
    const lightGray = '#f0f2f5';
    const borderColor = '#d9d9d9';
    
    // ========================================
    // CENTERED QUOTATION TITLE AT TOP
    // ========================================
    doc.fontSize(28).font('Helvetica-Bold').fillColor(primaryColor);
    doc.text('QUOTATION', 0, yPos, { 
      width: pageWidth, 
      align: 'center' 
    });
    
    yPos += 35;
    
    // ========================================
    // COMPANY NAME CENTERED BELOW TITLE
    // ========================================
    doc.fontSize(14).font('Helvetica-Bold').fillColor(darkColor);
    doc.text(company?.name || 'Company Name', 0, yPos, { 
      width: pageWidth, 
      align: 'center' 
    });
    
    yPos += 25;
    
    // ========================================
    // QUOTATION REFERENCE DETAILS - RIGHT ALIGNED
    // ========================================
    doc.fontSize(9).font('Helvetica').fillColor('#333333');
    doc.text(`Quotation #: ${quotation.quotationNumber}`, 50, yPos);
    yPos += 12;
    doc.text(`Date: ${new Date(quotation.date).toLocaleDateString()}`, 50, yPos);
    yPos += 12;
    doc.text(`Valid Until: ${quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : 'N/A'}`, 50, yPos);
    yPos += 12;
    doc.text(`Status: ${quotation.status.toUpperCase()}`, 50, yPos);
    
    yPos += 25;
    doc.fontSize(10).font('Helvetica-Bold').text('Bill To:', 50, yPos);
    yPos += 15;
    doc.font('Helvetica');

    if (quotation.customer) {
      doc.text(quotation.customer.name || 'N/A', 50, yPos);
      yPos += 15;
      if (quotation.customer.email) {
        doc.text(quotation.customer.email, 50, yPos);
        yPos += 15;
      }
      if (quotation.customer.phone) {
        doc.text(quotation.customer.phone, 50, yPos);
        yPos += 15;
      }
      if (quotation.customer.address) {
        doc.text(quotation.customer.address, 50, yPos);
        yPos += 15;
      }
    } else {
      doc.text('[Customer Deleted]', 50, yPos);
      yPos += 15;
    }

    // Add supplier info if available
    if (quotation.supplier) {
      yPos += 10;
      doc.fontSize(10).font('Helvetica-Bold').text('Supplier:', 50, yPos);
      yPos += 15;
      doc.font('Helvetica');
      doc.text(quotation.supplier.name || 'N/A', 50, yPos);
      yPos += 15;
      if (quotation.supplier.email) {
        doc.text(quotation.supplier.email, 50, yPos);
        yPos += 15;
      }
      if (quotation.supplier.phone) {
        doc.text(quotation.supplier.phone, 50, yPos);
        yPos += 15;
      }
    }

    yPos += 20;
    const tableTop = yPos;
    
    // ✅ FIXED: Check if quotation has global taxRate or item-level taxRate
    const hasGlobalTax = quotation.taxRate !== undefined && quotation.taxRate !== null;
    const hasItemTax = quotation.items.some(item => item.taxRate !== undefined && item.taxRate !== null);
    
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('#', 50, tableTop, { width: 30 });
    doc.text('Description', 80, tableTop, { width: 200 });
    doc.text('Qty', 280, tableTop, { width: 40, align: 'center' });
    doc.text('Unit Price', 320, tableTop, { width: 80, align: 'right' });
    doc.text('Disc %', 400, tableTop, { width: 60, align: 'center' });
    
    // ✅ Only show Tax Rate column if items have tax
    if (hasItemTax && !hasGlobalTax) {
      doc.text('Tax %', 460, tableTop, { width: 50, align: 'center' });
      doc.text('Total', 510, tableTop, { width: 40, align: 'right' });
    } else {
      doc.text('Total', 460, tableTop, { width: 90, align: 'right' });
    }
    
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    
    yPos = tableTop + 25;
    doc.font('Helvetica');
    
    quotation.items.forEach((item, index) => {
      const itemTotal = formatCurrency(item.total, company?.currencySymbol || 'Rs.');
      const unitPrice = formatCurrency(item.unitPrice, company?.currencySymbol || 'Rs.');
      const discountPercent = item.discount || 0;
      
      doc.fontSize(9);
      doc.text(index + 1, 50, yPos, { width: 30 });
      doc.text(item.description || item.product?.name || 'N/A', 80, yPos, { width: 200 });
      doc.text(item.quantity.toString(), 280, yPos, { width: 40, align: 'center' });
      doc.text(unitPrice, 320, yPos, { width: 80, align: 'right' });
      doc.text(`${discountPercent}%`, 400, yPos, { width: 60, align: 'center' });
      
      if (hasItemTax && !hasGlobalTax) {
        doc.text(`${item.taxRate || 0}%`, 460, yPos, { width: 50, align: 'center' });
        doc.text(itemTotal, 510, yPos, { width: 40, align: 'right' });
      } else {
        doc.text(itemTotal, 460, yPos, { width: 90, align: 'right' });
      }
      
      yPos += 30;
    });
    
    doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
    yPos += 15;
    
    doc.fontSize(10).font('Helvetica');
    doc.text('Subtotal:', 360, yPos);
    doc.text(formatCurrency(quotation.subtotal, company?.currencySymbol || 'Rs.'), 460, yPos, { width: 90, align: 'right' });
    
    if (quotation.discount && quotation.discount > 0) {
      yPos += 20;
      doc.text('Discount:', 360, yPos);
      doc.text('-' + formatCurrency(quotation.discount, company?.currencySymbol || 'Rs.'), 460, yPos, { width: 90, align: 'right' });
    }
    
    // ✅ Show global tax if present
    if (hasGlobalTax && quotation.taxRate > 0) {
      yPos += 20;
      doc.text(`Tax (${quotation.taxRate}%):`, 360, yPos);
      doc.text(formatCurrency(quotation.taxAmount || 0, company?.currencySymbol || 'Rs.'), 460, yPos, { width: 90, align: 'right' });
    }
    
    yPos += 25;
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Total:', 360, yPos);
    doc.text(formatCurrency(quotation.total, company?.currencySymbol || 'Rs.'), 460, yPos, { width: 90, align: 'right' });
    
    yPos += 40;
    
    if (quotation.notes) {
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Notes:', 50, yPos);
      doc.font('Helvetica').fontSize(9);
      const notesLines = quotation.notes.split('\n');
      let notesY = yPos + 15;
      notesLines.forEach(line => {
        doc.text(line, 50, notesY, { width: 500 });
        notesY += 15;
      });
      yPos = notesY + 10;
    }
    
    if (quotation.terms) {
      doc.fontSize(10).font('Helvetica-Bold').fillColor(darkColor);
      doc.text('Terms & Conditions', 0, yPos, { 
        width: pageWidth, 
        align: 'center' 
      });
      doc.font('Helvetica').fontSize(9).fillColor('#333333');
      const termsLines = quotation.terms.split('\n');
      let termsY = yPos + 15;
      termsLines.forEach(line => {
        doc.text(line, 50, termsY, { 
          width: pageWidth - 100,
          align: 'center' 
        });
        termsY += 15;
      });
      yPos = termsY;
    }
    
    // ========================================
    // COMPANY INFO AT BOTTOM - Below Terms
    // ========================================
    yPos += 20;
    doc.fontSize(9).font('Helvetica').fillColor('#333333');
    
    if (company?.name) {
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text(company.name, 50, yPos);
      yPos += 12;
    }
    
    doc.fontSize(9).font('Helvetica');
    if (company?.address) {
      doc.text(company.address, 50, yPos, { width: 350 });
      yPos += 12;
    }
    if (company?.phone) {
      doc.text(`Phone: ${company.phone}`, 50, yPos);
      yPos += 12;
    }
    if (company?.taxNumber) {
      doc.text(`Tax No: ${company.taxNumber}`, 50, yPos);
      yPos += 12;
    }
    
    const footerText = company?.quotationFooter || "This quotation is valid for 30 days";
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
    console.error('❌ Error generating quotation PDF:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const convertToInvoice = async (req, res) => {
  try {
    console.log('🔄 Converting quotation to invoice:', req.params.id);
    
    const quotation = await Quotation.findById(req.params.id)
      .populate('customer')
      .populate('supplier')
      .populate('items.product');

    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    // ✅ FIXED: Allow conversion from approved OR sent status
    if (quotation.status !== 'approved' && quotation.status !== 'sent') {
      return res.status(400).json({ 
        success: false, 
        message: `Quotations must be approved or sent before conversion. Current status: ${quotation.status}` 
      });
    }
    
    if (quotation.convertedToInvoice) {
      return res.status(400).json({ 
        success: false, 
        message: 'Quotation has already been converted to an invoice' 
      });
    }
    
    const company = await Company.findOne();
    
    const sequenceNumber = await getNextSequence('invoice');
    const prefix = company?.prefixes?.invoice || 'SI-';
    const invoiceNumber = `${prefix}${String(sequenceNumber).padStart(5, '0')}`;
    
    // ✅ FIXED: Use quotation's taxRate (may be 0 if old quotation)
    const taxRate = quotation.taxRate || 0;
    
    const invoice = await Invoice.create({
      invoiceNumber,
      customer: quotation.customer._id,
      date: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      items: quotation.items.map(item => ({
        product: item.product._id || item.product,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        total: item.total
      })),
      subtotal: quotation.subtotal,
      taxRate: taxRate, // ✅ Use quotation's tax rate
      taxAmount: quotation.taxAmount || 0,
      discount: quotation.discount || 0,
      total: quotation.total,
      balanceAmount: quotation.total,
      paidAmount: 0,
      notes: quotation.notes,
      terms: quotation.terms,
      status: 'draft',
      approvalStatus: 'pending',
      quotation: quotation._id,
      createdBy: req.user._id
    });
    
    // Mark quotation as converted
    quotation.convertedToInvoice = true;
    quotation.invoice = invoice._id;
    await quotation.save();
    
    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('customer')
      .populate('supplier')
      .populate('items.product')
      .lean();
    
    console.log('✅ Invoice created:', invoice.invoiceNumber);
    
    res.status(201).json({ 
      success: true, 
      result: populatedInvoice,
      message: 'Quotation converted to invoice successfully'
    });
  } catch (error) {
    console.error('❌ Error converting to invoice:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// ============================================================
// FIX #5: Frontend - QuotationView.jsx
// ============================================================

// File: frontend/src/pages/QuotationView.jsx
// UPDATE the handleViewPDF function (around line 85):

const handleViewPDF = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    message.error('Please login to view PDF');
    return;
  }
  
  // ✅ FIXED: Use api base URL and add token as query parameter
  const baseURL = api.defaults.baseURL || 'http://localhost:5000/api/v1';
  const pdfUrl = `${baseURL}/quotations/${id}/pdf?token=${token}`;
  window.open(pdfUrl, '_blank');
};
