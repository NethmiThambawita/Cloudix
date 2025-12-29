import PurchaseOrder from '../models/PurchaseOrder.js';
import GRN from '../models/GRN.js';
import Tax from '../models/Tax.js';
import Sequence from '../models/Sequence.js';
import PDFDocument from 'pdfkit';

// Helper function to calculate PO totals with taxes
const calculatePOTotals = async (items, discount = 0, taxIds = []) => {
  // 1. Calculate item totals with item discounts
  let subtotal = 0;
  items.forEach(item => {
    const itemTotal = item.quantity * item.unitPrice;
    const itemDiscount = itemTotal * ((item.discount || 0) / 100);
    item.total = itemTotal - itemDiscount;
    subtotal += item.total;
  });

  // 2. Apply overall discount
  const discountAmount = subtotal * (discount / 100);
  const finalSubtotal = subtotal - discountAmount;

  // 3. Calculate taxes on final subtotal
  let taxAmount = 0;
  if (taxIds && taxIds.length > 0) {
    const taxes = await Tax.find({ _id: { $in: taxIds } });
    taxes.forEach(tax => {
      taxAmount += finalSubtotal * (tax.value / 100);
    });
  }

  const total = finalSubtotal + taxAmount;

  return { subtotal, taxAmount, total };
};

// Generate GRN number (year-based)
const generateGRNNumber = async (year) => {
  const sequence = await Sequence.findOneAndUpdate(
    { year, type: 'GRN' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `GRN-${year}-${String(sequence.seq).padStart(4, '0')}`;
};

// Get all POs
export const getAllPOs = async (req, res) => {
  try {
    const { status, supplier, startDate, endDate, search, convertedToGRN } = req.query;

    // Use aggregation pipeline when search is provided
    if (search) {
      const pipeline = [];

      // Lookup supplier
      pipeline.push({
        $lookup: {
          from: 'suppliers',
          localField: 'supplier',
          foreignField: '_id',
          as: 'supplierData'
        }
      });

      // Build match conditions
      const matchConditions = {
        $or: [
          { poNumber: { $regex: search, $options: 'i' } },
          { 'supplierData.name': { $regex: search, $options: 'i' } }
        ]
      };

      // Add other filters
      if (status) matchConditions.status = status;
      if (supplier) matchConditions.supplier = supplier;
      if (convertedToGRN !== undefined) matchConditions.convertedToGRN = convertedToGRN === 'true';
      if (startDate || endDate) {
        matchConditions.poDate = {};
        if (startDate) matchConditions.poDate.$gte = new Date(startDate);
        if (endDate) matchConditions.poDate.$lte = new Date(endDate);
      }

      pipeline.push({ $match: matchConditions });
      pipeline.push({ $sort: { poDate: -1 } });

      const pos = await PurchaseOrder.aggregate(pipeline);

      // Populate remaining fields
      await PurchaseOrder.populate(pos, [
        { path: 'supplier', select: 'name email phone address' },
        { path: 'items.product', select: 'name category' },
        { path: 'taxes', select: 'name value' },
        { path: 'createdBy', select: 'name email' },
        { path: 'approvedBy', select: 'name email' },
        { path: 'sentBy', select: 'name email' },
        { path: 'grn', select: 'grnNumber status' }
      ]);

      return res.json(pos);
    }

    // Use regular query when no search
    let query = {};

    if (status) query.status = status;
    if (supplier) query.supplier = supplier;
    if (convertedToGRN !== undefined) query.convertedToGRN = convertedToGRN === 'true';
    if (startDate || endDate) {
      query.poDate = {};
      if (startDate) query.poDate.$gte = new Date(startDate);
      if (endDate) query.poDate.$lte = new Date(endDate);
    }

    const pos = await PurchaseOrder.find(query)
      .populate('supplier', 'name email phone address')
      .populate('items.product', 'name category')
      .populate('taxes', 'name value')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('sentBy', 'name email')
      .populate('grn', 'grnNumber status')
      .sort({ poDate: -1 });

    res.json(pos);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching purchase orders', error: error.message });
  }
};

// Get PO by ID
export const getPOById = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id)
      .populate('supplier', 'name email phone address taxNumber')
      .populate('items.product', 'name category')
      .populate('taxes', 'name value')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('sentBy', 'name email')
      .populate('grn', 'grnNumber status');

    if (!po) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    res.json(po);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching purchase order', error: error.message });
  }
};

// Create PO
export const createPO = async (req, res) => {
  try {
    const { items, discount, taxes, supplier, expectedDeliveryDate, ...otherData } = req.body;

    // Validate required fields
    if (!supplier) {
      return res.status(400).json({ message: 'Supplier is required' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    if (!expectedDeliveryDate) {
      return res.status(400).json({ message: 'Expected delivery date is required' });
    }

    // Validate expected delivery date is in the future
    const expectedDate = new Date(expectedDeliveryDate);
    const poDate = otherData.poDate ? new Date(otherData.poDate) : new Date();
    if (expectedDate < poDate) {
      return res.status(400).json({ message: 'Expected delivery date must be on or after PO date' });
    }

    // Generate PO number
    const poNumber = await Sequence.getNext('purchase-order', 'PO-');

    // Calculate totals
    const { subtotal, taxAmount, total } = await calculatePOTotals(items, discount, taxes);

    // Create PO
    const po = new PurchaseOrder({
      poNumber,
      supplier,
      expectedDeliveryDate,
      items,
      discount: discount || 0,
      taxes: taxes || [],
      subtotal,
      taxAmount,
      total,
      createdBy: req.user.id,
      ...otherData
    });

    await po.save();

    // Populate and return
    const populatedPO = await PurchaseOrder.findById(po._id)
      .populate('supplier', 'name email phone address')
      .populate('items.product', 'name category')
      .populate('taxes', 'name value')
      .populate('createdBy', 'name email');

    res.status(201).json(populatedPO);
  } catch (error) {
    res.status(500).json({ message: 'Error creating purchase order', error: error.message });
  }
};

// Update PO
export const updatePO = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);

    if (!po) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    // Only allow updates if status is draft
    if (po.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft purchase orders can be updated' });
    }

    // Cannot update if converted to GRN
    if (po.convertedToGRN) {
      return res.status(400).json({ message: 'Cannot update purchase order that has been converted to GRN' });
    }

    const { items, discount, taxes, expectedDeliveryDate, ...otherData } = req.body;

    // Validate expected delivery date if provided
    if (expectedDeliveryDate) {
      const expectedDate = new Date(expectedDeliveryDate);
      const poDate = otherData.poDate ? new Date(otherData.poDate) : po.poDate;
      if (expectedDate < poDate) {
        return res.status(400).json({ message: 'Expected delivery date must be on or after PO date' });
      }
    }

    // Recalculate totals if items or taxes changed
    if (items || discount !== undefined || taxes) {
      const updatedItems = items || po.items;
      const updatedDiscount = discount !== undefined ? discount : po.discount;
      const updatedTaxes = taxes || po.taxes;

      const { subtotal, taxAmount, total } = await calculatePOTotals(updatedItems, updatedDiscount, updatedTaxes);

      po.items = updatedItems;
      po.discount = updatedDiscount;
      po.taxes = updatedTaxes;
      po.subtotal = subtotal;
      po.taxAmount = taxAmount;
      po.total = total;
    }

    // Update other fields
    if (expectedDeliveryDate) po.expectedDeliveryDate = expectedDeliveryDate;
    Object.keys(otherData).forEach(key => {
      if (otherData[key] !== undefined) {
        po[key] = otherData[key];
      }
    });

    await po.save();

    // Populate and return
    const populatedPO = await PurchaseOrder.findById(po._id)
      .populate('supplier', 'name email phone address')
      .populate('items.product', 'name category')
      .populate('taxes', 'name value')
      .populate('createdBy', 'name email');

    res.json(populatedPO);
  } catch (error) {
    res.status(500).json({ message: 'Error updating purchase order', error: error.message });
  }
};

// Approve PO
export const approvePO = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);

    if (!po) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    if (po.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft purchase orders can be approved' });
    }

    po.status = 'approved';
    po.approvedBy = req.user.id;
    po.approvedAt = new Date();

    await po.save();

    const populatedPO = await PurchaseOrder.findById(po._id)
      .populate('supplier', 'name email phone address')
      .populate('items.product', 'name category')
      .populate('taxes', 'name value')
      .populate('approvedBy', 'name email');

    res.json(populatedPO);
  } catch (error) {
    res.status(500).json({ message: 'Error approving purchase order', error: error.message });
  }
};

// Send PO to supplier
export const sendPO = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);

    if (!po) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    if (po.status !== 'approved') {
      return res.status(400).json({ message: 'Only approved purchase orders can be sent' });
    }

    po.status = 'sent';
    po.sentBy = req.user.id;
    po.sentAt = new Date();

    await po.save();

    const populatedPO = await PurchaseOrder.findById(po._id)
      .populate('supplier', 'name email phone address')
      .populate('items.product', 'name category')
      .populate('taxes', 'name value')
      .populate('sentBy', 'name email');

    res.json(populatedPO);
  } catch (error) {
    res.status(500).json({ message: 'Error sending purchase order', error: error.message });
  }
};

// Complete PO
export const completePO = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);

    if (!po) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    if (!['sent', 'approved'].includes(po.status)) {
      return res.status(400).json({ message: 'Only sent or approved purchase orders can be completed' });
    }

    po.status = 'completed';

    await po.save();

    const populatedPO = await PurchaseOrder.findById(po._id)
      .populate('supplier', 'name email phone address')
      .populate('items.product', 'name category')
      .populate('taxes', 'name value');

    res.json(populatedPO);
  } catch (error) {
    res.status(500).json({ message: 'Error completing purchase order', error: error.message });
  }
};

// Cancel PO
export const cancelPO = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);

    if (!po) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    if (po.convertedToGRN) {
      return res.status(400).json({ message: 'Cannot cancel purchase order that has been converted to GRN' });
    }

    po.status = 'cancelled';

    await po.save();

    const populatedPO = await PurchaseOrder.findById(po._id)
      .populate('supplier', 'name email phone address')
      .populate('items.product', 'name category')
      .populate('taxes', 'name value');

    res.json(populatedPO);
  } catch (error) {
    res.status(500).json({ message: 'Error cancelling purchase order', error: error.message });
  }
};

// Convert PO to GRN
export const convertPOToGRN = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id)
      .populate('supplier')
      .populate('items.product');

    if (!po) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    // Validation
    if (!['sent', 'approved'].includes(po.status)) {
      return res.status(400).json({
        message: 'Purchase order must be sent or approved before conversion'
      });
    }

    if (po.convertedToGRN) {
      return res.status(400).json({
        message: 'Purchase order already converted to GRN',
        grn: po.grn
      });
    }

    // Generate GRN number
    const year = new Date().getFullYear();
    const grnNumber = await generateGRNNumber(year);

    // Map PO items to GRN items
    const grnItems = po.items.map(item => ({
      product: item.product._id || item.product,
      orderedQuantity: item.quantity,
      receivedQuantity: 0,
      acceptedQuantity: 0,
      rejectedQuantity: 0,
      shortQuantity: item.quantity,
      unitPrice: item.unitPrice,
      batchNumber: '',
      serialNumbers: [],
      expiryDate: null,
      manufactureDate: null,
      inspectionNotes: ''
    }));

    // Create GRN
    const grn = new GRN({
      grnNumber,
      purchaseOrder: {
        poNumber: po.poNumber,
        poDate: po.poDate,
        poRef: po._id
      },
      supplier: po.supplier._id,
      customer: null,
      grnDate: new Date(),
      deliveryNote: {
        number: '',
        date: null
      },
      items: grnItems,
      location: 'Main Warehouse',
      status: 'draft',
      qualityStatus: 'pending',
      stockUpdated: false,
      notes: `Created from PO: ${po.poNumber}`,
      createdBy: req.user.id
    });

    await grn.save();

    // Update PO
    po.convertedToGRN = true;
    po.grn = grn._id;
    po.status = 'converted';
    await po.save();

    // Populate and return GRN
    const populatedGRN = await GRN.findById(grn._id)
      .populate('supplier', 'name email phone')
      .populate('items.product', 'name category')
      .populate('createdBy', 'name email')
      .populate('purchaseOrder.poRef');

    res.status(201).json({
      message: 'Purchase order converted to GRN successfully',
      grn: populatedGRN,
      po
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error converting purchase order to GRN',
      error: error.message
    });
  }
};

// Delete PO (Admin only)
export const deletePO = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);

    if (!po) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    // Only allow deletion if status is draft
    if (po.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft purchase orders can be deleted' });
    }

    // Cannot delete if converted to GRN
    if (po.convertedToGRN) {
      return res.status(400).json({ message: 'Cannot delete purchase order that has been converted to GRN' });
    }

    await PurchaseOrder.findByIdAndDelete(req.params.id);

    res.json({ message: 'Purchase order deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting purchase order', error: error.message });
  }
};

// Get PO Reports
export const getPOReports = async (req, res) => {
  try {
    const { startDate, endDate, supplier } = req.query;

    let query = {};
    if (startDate || endDate) {
      query.poDate = {};
      if (startDate) query.poDate.$gte = new Date(startDate);
      if (endDate) query.poDate.$lte = new Date(endDate);
    }
    if (supplier) query.supplier = supplier;

    const pos = await PurchaseOrder.find(query);

    // Calculate statistics
    const stats = {
      totalPOs: pos.length,
      byStatus: {
        draft: 0,
        approved: 0,
        sent: 0,
        completed: 0,
        cancelled: 0
      },
      totalValue: 0,
      convertedToGRN: 0,
      pendingConversion: 0
    };

    pos.forEach(po => {
      stats.byStatus[po.status]++;
      stats.totalValue += po.total;
      if (po.convertedToGRN) stats.convertedToGRN++;
      if (['sent', 'approved'].includes(po.status) && !po.convertedToGRN) stats.pendingConversion++;
    });

    // Supplier-wise breakdown
    const supplierStats = await PurchaseOrder.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$supplier',
          count: { $sum: 1 },
          totalValue: { $sum: '$total' }
        }
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: '_id',
          foreignField: '_id',
          as: 'supplier'
        }
      },
      {
        $unwind: '$supplier'
      },
      {
        $project: {
          supplier: '$supplier.name',
          count: 1,
          totalValue: 1
        }
      }
    ]);

    res.json({
      stats,
      supplierStats
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating reports', error: error.message });
  }
};

// Generate PO PDF
export const generatePOPDF = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id)
      .populate('supplier', 'name email phone address taxNumber')
      .populate('items.product', 'name category')
      .populate('taxes', 'name value')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email');

    if (!po) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=PO-${po.poNumber}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).text('PURCHASE ORDER', { align: 'center' });
    doc.moveDown();

    // PO Details
    doc.fontSize(12);
    doc.text(`PO Number: ${po.poNumber}`, { continued: true });
    doc.text(`Date: ${po.poDate.toLocaleDateString()}`, { align: 'right' });
    doc.text(`Status: ${po.status.toUpperCase()}`, { continued: true });
    doc.text(`Expected Delivery: ${po.expectedDeliveryDate.toLocaleDateString()}`, { align: 'right' });
    doc.moveDown();

    // Supplier Details
    doc.fontSize(14).text('Supplier:', { underline: true });
    doc.fontSize(10);
    doc.text(po.supplier.name);
    if (po.supplier.address) doc.text(po.supplier.address);
    if (po.supplier.phone) doc.text(`Phone: ${po.supplier.phone}`);
    if (po.supplier.email) doc.text(`Email: ${po.supplier.email}`);
    if (po.supplier.taxNumber) doc.text(`Tax Number: ${po.supplier.taxNumber}`);
    doc.moveDown();

    // Items Table
    doc.fontSize(14).text('Items:', { underline: true });
    doc.moveDown(0.5);

    // Table headers
    const tableTop = doc.y;
    const itemCodeX = 50;
    const descriptionX = 150;
    const qtyX = 300;
    const priceX = 350;
    const discountX = 420;
    const totalX = 480;

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Product', itemCodeX, tableTop);
    doc.text('Description', descriptionX, tableTop);
    doc.text('Qty', qtyX, tableTop);
    doc.text('Price', priceX, tableTop);
    doc.text('Disc%', discountX, tableTop);
    doc.text('Total', totalX, tableTop);

    doc.font('Helvetica');
    let y = tableTop + 20;

    po.items.forEach(item => {
      doc.text(item.product.name, itemCodeX, y, { width: 90 });
      doc.text(item.description || '-', descriptionX, y, { width: 140 });
      doc.text(item.quantity.toString(), qtyX, y);
      doc.text(item.unitPrice.toFixed(2), priceX, y);
      doc.text((item.discount || 0).toFixed(0), discountX, y);
      doc.text(item.total.toFixed(2), totalX, y);
      y += 20;
    });

    // Totals
    y += 10;
    doc.font('Helvetica-Bold');
    doc.text('Subtotal:', priceX, y);
    doc.text(po.subtotal.toFixed(2), totalX, y);
    y += 15;

    if (po.discount > 0) {
      doc.text(`Discount (${po.discount}%):`, priceX, y);
      doc.text((po.subtotal * (po.discount / 100)).toFixed(2), totalX, y);
      y += 15;
    }

    if (po.taxes && po.taxes.length > 0) {
      po.taxes.forEach(tax => {
        doc.text(`${tax.name} (${tax.value}%):`, priceX, y);
        const taxValue = (po.subtotal * (1 - po.discount / 100)) * (tax.value / 100);
        doc.text(taxValue.toFixed(2), totalX, y);
        y += 15;
      });
    }

    doc.fontSize(12);
    doc.text('TOTAL:', priceX, y);
    doc.text(po.total.toFixed(2), totalX, y);

    // Additional Info
    if (po.paymentTerms) {
      doc.moveDown(2);
      doc.fontSize(10).font('Helvetica-Bold').text('Payment Terms:');
      doc.font('Helvetica').text(po.paymentTerms);
    }

    if (po.notes) {
      doc.moveDown();
      doc.font('Helvetica-Bold').text('Notes:');
      doc.font('Helvetica').text(po.notes);
    }

    if (po.terms) {
      doc.moveDown();
      doc.font('Helvetica-Bold').text('Terms & Conditions:');
      doc.font('Helvetica').text(po.terms);
    }

    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Error generating PDF', error: error.message });
  }
};
