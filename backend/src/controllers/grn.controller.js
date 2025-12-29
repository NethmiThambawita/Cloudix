import GRN from '../models/GRN.js';
import Stock from '../models/Stock.js';
import StockTransaction from '../models/StockTransaction.js';
import Sequence from '../models/Sequence.js';
import PDFDocument from 'pdfkit';

// Generate GRN number
const generateGRNNumber = async (year) => {
  const sequence = await Sequence.findOneAndUpdate(
    { year, type: 'GRN' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `GRN-${year}-${String(sequence.seq).padStart(4, '0')}`;
};

// Get all GRNs
export const getAllGRNs = async (req, res) => {
  try {
    const { status, supplier, customer, startDate, endDate, search } = req.query;

    // Use aggregation pipeline when search is provided to search across related collections
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

      // Lookup customer
      pipeline.push({
        $lookup: {
          from: 'customers',
          localField: 'customer',
          foreignField: '_id',
          as: 'customerData'
        }
      });

      // Build match conditions
      const matchConditions = {
        $or: [
          { grnNumber: { $regex: search, $options: 'i' } },
          { 'purchaseOrder.poNumber': { $regex: search, $options: 'i' } },
          { 'invoiceDetails.invoiceNumber': { $regex: search, $options: 'i' } },
          { 'supplierData.name': { $regex: search, $options: 'i' } },
          { 'customerData.name': { $regex: search, $options: 'i' } }
        ]
      };

      // Add other filters
      if (status) matchConditions.status = status;
      if (supplier) matchConditions.supplier = supplier;
      if (customer) matchConditions.customer = customer;
      if (startDate || endDate) {
        matchConditions.grnDate = {};
        if (startDate) matchConditions.grnDate.$gte = new Date(startDate);
        if (endDate) matchConditions.grnDate.$lte = new Date(endDate);
      }

      pipeline.push({ $match: matchConditions });

      // Sort
      pipeline.push({ $sort: { grnDate: -1 } });

      const grns = await GRN.aggregate(pipeline);

      // Populate remaining fields
      await GRN.populate(grns, [
        { path: 'supplier', select: 'name email phone' },
        { path: 'customer', select: 'name email phone' },
        { path: 'items.product', select: 'name category' },
        { path: 'createdBy', select: 'name email' },
        { path: 'inspectedBy', select: 'name email' },
        { path: 'approvedBy', select: 'name email' }
      ]);

      return res.json(grns);
    }

    // Use regular query when no search
    let query = {};

    if (status) {
      query.status = status;
    }

    if (supplier) {
      query.supplier = supplier;
    }

    if (customer) {
      query.customer = customer;
    }

    if (startDate || endDate) {
      query.grnDate = {};
      if (startDate) query.grnDate.$gte = new Date(startDate);
      if (endDate) query.grnDate.$lte = new Date(endDate);
    }

    const grns = await GRN.find(query)
      .populate('supplier', 'name email phone')
      .populate('customer', 'name email phone')
      .populate('items.product', 'name category')
      .populate('createdBy', 'name email')
      .populate('inspectedBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ grnDate: -1 });

    res.json(grns);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching GRNs', error: error.message });
  }
};

// Get single GRN
export const getGRNById = async (req, res) => {
  try {
    const { id } = req.params;
    const grn = await GRN.findById(id)
      .populate('supplier', 'name email phone address')
      .populate('customer', 'name email phone address')
      .populate('items.product', 'name category price')
      .populate('createdBy', 'name email')
      .populate('inspectedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('purchaseOrder.poRef');

    if (!grn) {
      return res.status(404).json({ message: 'GRN not found' });
    }

    res.json(grn);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching GRN', error: error.message });
  }
};

// Create GRN
export const createGRN = async (req, res) => {
  try {
    const {
      purchaseOrder,
      supplier,
      customer,
      grnDate,
      deliveryNote,
      items,
      location,
      notes
    } = req.body;

    const year = new Date(grnDate || Date.now()).getFullYear();
    const grnNumber = await generateGRNNumber(year);

    const grn = new GRN({
      grnNumber,
      purchaseOrder,
      supplier,
      customer,
      grnDate: grnDate || Date.now(),
      deliveryNote,
      items: items.map(item => ({
        ...item,
        acceptedQuantity: item.acceptedQuantity || item.receivedQuantity,
        rejectedQuantity: item.rejectedQuantity || 0,
        shortQuantity: (item.orderedQuantity || 0) - (item.receivedQuantity || 0)
      })),
      location: location || 'Main Warehouse',
      notes,
      status: 'draft',
      createdBy: req.user.id
    });

    await grn.save();
    const populatedGRN = await GRN.findById(grn._id)
      .populate('supplier', 'name email phone')
      .populate('customer', 'name email phone')
      .populate('items.product', 'name category')
      .populate('createdBy', 'name email');

    res.status(201).json(populatedGRN);
  } catch (error) {
    res.status(500).json({ message: 'Error creating GRN', error: error.message });
  }
};

// Update GRN
export const updateGRN = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const grn = await GRN.findById(id);
    if (!grn) {
      return res.status(404).json({ message: 'GRN not found' });
    }

    // Prevent updates if already completed
    if (grn.status === 'completed' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Cannot modify completed GRN' });
    }

    Object.assign(grn, updates);
    await grn.save();

    const updatedGRN = await GRN.findById(id)
      .populate('supplier', 'name email phone')
      .populate('customer', 'name email phone')
      .populate('items.product', 'name category')
      .populate('createdBy', 'name email')
      .populate('inspectedBy', 'name email')
      .populate('approvedBy', 'name email');

    res.json(updatedGRN);
  } catch (error) {
    res.status(500).json({ message: 'Error updating GRN', error: error.message });
  }
};

// Perform quality inspection
export const inspectGRN = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, qualityStatus, inspectionNotes } = req.body;

    const grn = await GRN.findById(id);
    if (!grn) {
      return res.status(404).json({ message: 'GRN not found' });
    }

    if (grn.status !== 'draft') {
      return res.status(400).json({ message: 'GRN is not in draft status' });
    }

    // Update items with inspection results
    if (items && items.length > 0) {
      grn.items = items.map((item, index) => ({
        ...grn.items[index].toObject(),
        ...item
      }));
    }

    grn.qualityStatus = qualityStatus || 'passed';
    grn.status = 'inspected';
    grn.inspectedBy = req.user.id;
    
    if (inspectionNotes) {
      grn.notes = grn.notes ? `${grn.notes}\n\nInspection: ${inspectionNotes}` : inspectionNotes;
    }

    await grn.save();

    const updatedGRN = await GRN.findById(id)
      .populate('supplier', 'name email phone')
      .populate('customer', 'name email phone')
      .populate('items.product', 'name category')
      .populate('inspectedBy', 'name email');

    res.json(updatedGRN);
  } catch (error) {
    res.status(500).json({ message: 'Error inspecting GRN', error: error.message });
  }
};

// Approve GRN
export const approveGRN = async (req, res) => {
  try {
    const { id } = req.params;

    const grn = await GRN.findById(id);
    if (!grn) {
      return res.status(404).json({ message: 'GRN not found' });
    }

    if (grn.status !== 'inspected') {
      return res.status(400).json({ message: 'GRN must be inspected before approval' });
    }

    grn.status = 'approved';
    grn.approvedBy = req.user.id;
    await grn.save();

    const updatedGRN = await GRN.findById(id)
      .populate('supplier', 'name email phone')
      .populate('customer', 'name email phone')
      .populate('items.product', 'name category')
      .populate('approvedBy', 'name email');

    res.json(updatedGRN);
  } catch (error) {
    res.status(500).json({ message: 'Error approving GRN', error: error.message });
  }
};

// Update stock from GRN (post goods to inventory)
export const updateStockFromGRN = async (req, res) => {
  try {
    const { id } = req.params;

    const grn = await GRN.findById(id).populate('items.product');
    if (!grn) {
      return res.status(404).json({ message: 'GRN not found' });
    }

    if (grn.status !== 'approved') {
      return res.status(400).json({ message: 'GRN must be approved before updating stock' });
    }

    if (grn.stockUpdated) {
      return res.status(400).json({ message: 'Stock already updated for this GRN' });
    }

    // Update stock for each item
    const stockUpdates = [];
    const transactions = [];

    for (const item of grn.items) {
      if (item.acceptedQuantity > 0) {
        // Find or create stock record
        let stock = await Stock.findOne({ product: item.product._id });
        
        if (!stock) {
          stock = new Stock({
            product: item.product._id,
            quantity: 0,
            location: grn.location,
            batchTracking: !!item.batchNumber,
            serialTracking: item.serialNumbers && item.serialNumbers.length > 0
          });
        }

        const balanceBefore = stock.quantity;
        stock.quantity += item.acceptedQuantity;
        const balanceAfter = stock.quantity;
        stock.lastRestockDate = new Date();

        // Add batch information if provided
        if (item.batchNumber) {
          stock.batches.push({
            batchNumber: item.batchNumber,
            quantity: item.acceptedQuantity,
            expiryDate: item.expiryDate,
            manufactureDate: item.manufactureDate,
            notes: item.inspectionNotes
          });
        }

        // Add serial numbers if provided
        if (item.serialNumbers && item.serialNumbers.length > 0) {
          item.serialNumbers.forEach(sn => {
            stock.serialNumbers.push({
              serialNumber: sn,
              status: 'available',
              location: grn.location
            });
          });
        }

        await stock.save();
        stockUpdates.push(stock);

        // Create stock transaction
        const transaction = new StockTransaction({
          transactionType: 'grn',
          product: item.product._id,
          quantity: item.acceptedQuantity,
          toLocation: grn.location,
          batchNumber: item.batchNumber,
          serialNumbers: item.serialNumbers,
          balanceBefore,
          balanceAfter,
          referenceType: 'GRN',
          referenceId: grn._id,
          referenceNumber: grn.grnNumber,
          unitPrice: item.unitPrice,
          totalValue: item.acceptedQuantity * (item.unitPrice || 0),
          notes: `GRN stock update - ${item.acceptedQuantity} units received`,
          performedBy: req.user.id,
          approvedBy: grn.approvedBy,
          transactionDate: grn.grnDate
        });

        await transaction.save();
        transactions.push(transaction);
      }
    }

    // Mark GRN as completed and stock updated
    grn.stockUpdated = true;
    grn.status = 'completed';
    await grn.save();

    res.json({
      message: 'Stock updated successfully',
      grn,
      stockUpdates,
      transactions
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating stock from GRN', error: error.message });
  }
};

// Match invoice with GRN
export const matchInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { invoiceNumber, invoiceDate, invoiceAmount } = req.body;

    const grn = await GRN.findById(id);
    if (!grn) {
      return res.status(404).json({ message: 'GRN not found' });
    }

    grn.invoiceDetails = {
      invoiceNumber,
      invoiceDate,
      invoiceAmount,
      matched: true
    };

    await grn.save();

    const updatedGRN = await GRN.findById(id)
      .populate('supplier', 'name email phone')
      .populate('customer', 'name email phone')
      .populate('items.product', 'name category');

    res.json(updatedGRN);
  } catch (error) {
    res.status(500).json({ message: 'Error matching invoice', error: error.message });
  }
};

// Delete GRN (only draft status)
export const deleteGRN = async (req, res) => {
  try {
    const { id } = req.params;

    const grn = await GRN.findById(id);
    if (!grn) {
      return res.status(404).json({ message: 'GRN not found' });
    }

    if (grn.status !== 'draft') {
      return res.status(400).json({ message: 'Can only delete draft GRNs' });
    }

    await GRN.findByIdAndDelete(id);
    res.json({ message: 'GRN deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting GRN', error: error.message });
  }
};

// Get GRN reports/statistics
export const getGRNReports = async (req, res) => {
  try {
    const { startDate, endDate, supplier, customer } = req.query;
    let query = {};

    if (startDate || endDate) {
      query.grnDate = {};
      if (startDate) query.grnDate.$gte = new Date(startDate);
      if (endDate) query.grnDate.$lte = new Date(endDate);
    }

    if (supplier) {
      query.supplier = supplier;
    }

    if (customer) {
      query.customer = customer;
    }

    const grns = await GRN.find(query)
      .populate('supplier', 'name')
      .populate('customer', 'name')
      .populate('items.product', 'name category');

    // Calculate statistics
    const stats = {
      totalGRNs: grns.length,
      byStatus: {
        draft: grns.filter(g => g.status === 'draft').length,
        inspected: grns.filter(g => g.status === 'inspected').length,
        approved: grns.filter(g => g.status === 'approved').length,
        completed: grns.filter(g => g.status === 'completed').length,
        rejected: grns.filter(g => g.status === 'rejected').length
      },
      byQuality: {
        passed: grns.filter(g => g.qualityStatus === 'passed').length,
        failed: grns.filter(g => g.qualityStatus === 'failed').length,
        partial: grns.filter(g => g.qualityStatus === 'partial').length,
        pending: grns.filter(g => g.qualityStatus === 'pending').length
      },
      totalValue: grns.reduce((sum, grn) => sum + (grn.totalValue || 0), 0),
      totalItems: grns.reduce((sum, grn) => {
        return sum + grn.items.reduce((itemSum, item) => itemSum + item.acceptedQuantity, 0);
      }, 0),
      rejectedItems: grns.reduce((sum, grn) => {
        return sum + grn.items.reduce((itemSum, item) => itemSum + (item.rejectedQuantity || 0), 0);
      }, 0),
      shortItems: grns.reduce((sum, grn) => {
        return sum + grn.items.reduce((itemSum, item) => itemSum + (item.shortQuantity || 0), 0);
      }, 0)
    };

    res.json({ stats, grns });
  } catch (error) {
    res.status(500).json({ message: 'Error generating reports', error: error.message });
  }
};

// Generate GRN PDF
export const generateGRNPDF = async (req, res) => {
  try {
    const { id } = req.params;

    const grn = await GRN.findById(id)
      .populate('supplier', 'name email phone address')
      .populate('customer', 'name email phone address')
      .populate('items.product', 'name category')
      .populate('createdBy', 'firstName lastName')
      .populate('inspectedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName');

    if (!grn) {
      return res.status(404).json({ message: 'GRN not found' });
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=GRN-${grn.grnNumber}.pdf`);

    // Pipe the PDF to response
    doc.pipe(res);

    // Add content
    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('GOODS RECEIPT NOTE', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(18).fillColor('#1890ff').text(grn.grnNumber, { align: 'center' });
    doc.moveDown();

    // Reset color
    doc.fillColor('black');

    // GRN Details
    doc.fontSize(12).font('Helvetica-Bold').text('GRN Details', { underline: true });
    doc.fontSize(10).font('Helvetica');
    doc.text(`Date: ${new Date(grn.grnDate).toLocaleDateString('en-GB')}`);
    doc.text(`Status: ${grn.status.toUpperCase()}`);
    doc.text(`Quality Status: ${grn.qualityStatus.toUpperCase()}`);
    doc.text(`Location: ${grn.location}`);
    doc.text(`Stock Updated: ${grn.stockUpdated ? 'Yes' : 'No'}`);
    doc.moveDown();

    // Supplier Details
    doc.fontSize(12).font('Helvetica-Bold').text('Supplier Details', { underline: true });
    doc.fontSize(10).font('Helvetica');
    doc.text(`Name: ${grn.supplier?.name || '-'}`);
    if (grn.supplier?.phone) doc.text(`Phone: ${grn.supplier.phone}`);
    if (grn.supplier?.email) doc.text(`Email: ${grn.supplier.email}`);
    if (grn.supplier?.address) doc.text(`Address: ${grn.supplier.address}`);
    doc.moveDown();

    // PO Details
    if (grn.purchaseOrder?.poNumber) {
      doc.fontSize(12).font('Helvetica-Bold').text('Purchase Order Details', { underline: true });
      doc.fontSize(10).font('Helvetica');
      doc.text(`PO Number: ${grn.purchaseOrder.poNumber}`);
      if (grn.purchaseOrder.poDate) {
        doc.text(`PO Date: ${new Date(grn.purchaseOrder.poDate).toLocaleDateString('en-GB')}`);
      }
      doc.moveDown();
    }

    // Delivery Note
    if (grn.deliveryNote?.number) {
      doc.fontSize(12).font('Helvetica-Bold').text('Delivery Note', { underline: true });
      doc.fontSize(10).font('Helvetica');
      doc.text(`DN Number: ${grn.deliveryNote.number}`);
      if (grn.deliveryNote.date) {
        doc.text(`DN Date: ${new Date(grn.deliveryNote.date).toLocaleDateString('en-GB')}`);
      }
      doc.moveDown();
    }

    // Items Table
    doc.fontSize(12).font('Helvetica-Bold').text('Items', { underline: true });
    doc.moveDown(0.5);

    // Table Header
    const tableTop = doc.y;
    const col1 = 50;   // Product
    const col2 = 200;  // Ordered
    const col3 = 260;  // Received
    const col4 = 320;  // Accepted
    const col5 = 380;  // Rejected
    const col6 = 440;  // Price
    const col7 = 500;  // Total

    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Product', col1, tableTop, { width: 140 });
    doc.text('Ordered', col2, tableTop, { width: 50 });
    doc.text('Received', col3, tableTop, { width: 50 });
    doc.text('Accepted', col4, tableTop, { width: 50 });
    doc.text('Rejected', col5, tableTop, { width: 50 });
    doc.text('Price', col6, tableTop, { width: 50 });
    doc.text('Total', col7, tableTop, { width: 50 });

    // Draw line
    doc.moveTo(col1, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // Table Rows
    let yPosition = tableTop + 25;
    let totalValue = 0;

    doc.font('Helvetica').fontSize(8);
    grn.items.forEach((item, index) => {
      const itemTotal = item.acceptedQuantity * (item.unitPrice || 0);
      totalValue += itemTotal;

      // Check if need new page
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }

      doc.text(item.product?.name || '-', col1, yPosition, { width: 140 });
      doc.text(item.orderedQuantity.toString(), col2, yPosition, { width: 50 });
      doc.text(item.receivedQuantity.toString(), col3, yPosition, { width: 50 });
      doc.text(item.acceptedQuantity.toString(), col4, yPosition, { width: 50 });
      doc.text((item.rejectedQuantity || 0).toString(), col5, yPosition, { width: 50 });
      doc.text(`Rs. ${(item.unitPrice || 0).toLocaleString()}`, col6, yPosition, { width: 50 });
      doc.text(`Rs. ${itemTotal.toLocaleString()}`, col7, yPosition, { width: 50 });

      // Add batch number if available
      if (item.batchNumber) {
        yPosition += 12;
        doc.fontSize(7).fillColor('#666');
        doc.text(`Batch: ${item.batchNumber}`, col1, yPosition, { width: 140 });
        doc.fillColor('black').fontSize(8);
      }

      yPosition += 20;
    });

    // Total Line
    doc.moveTo(col1, yPosition).lineTo(550, yPosition).stroke();
    yPosition += 10;
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('TOTAL:', col6 - 60, yPosition);
    doc.text(`Rs. ${totalValue.toLocaleString()}`, col7, yPosition, { width: 50 });

    // Invoice Details
    if (grn.invoiceDetails?.invoiceNumber) {
      doc.moveDown(2);
      doc.fontSize(11).font('Helvetica-Bold').text('Invoice Details', { underline: true });
      doc.fontSize(9).font('Helvetica');
      doc.text(`Invoice Number: ${grn.invoiceDetails.invoiceNumber}`);
      if (grn.invoiceDetails.invoiceDate) {
        doc.text(`Invoice Date: ${new Date(grn.invoiceDetails.invoiceDate).toLocaleDateString('en-GB')}`);
      }
      if (grn.invoiceDetails.invoiceAmount) {
        doc.text(`Invoice Amount: Rs. ${grn.invoiceDetails.invoiceAmount.toLocaleString()}`);
      }
      doc.text(`Matched: ${grn.invoiceDetails.matched ? 'Yes' : 'No'}`);
    }

    // Notes
    if (grn.notes) {
      doc.moveDown(2);
      doc.fontSize(11).font('Helvetica-Bold').text('Notes:', { underline: true });
      doc.fontSize(9).font('Helvetica');
      doc.text(grn.notes, { width: 500 });
    }

    // Footer - Signatures
    doc.moveDown(3);
    doc.fontSize(9).font('Helvetica');
    
    const signatureY = doc.y;
    const sig1X = 50;
    const sig2X = 220;
    const sig3X = 390;

    if (grn.createdBy) {
      doc.text('Created By:', sig1X, signatureY);
      doc.text(`${grn.createdBy.firstName} ${grn.createdBy.lastName}`, sig1X, signatureY + 12);
      doc.text(`${new Date(grn.createdAt).toLocaleDateString('en-GB')}`, sig1X, signatureY + 24, { fontSize: 8 });
    }

    if (grn.inspectedBy) {
      doc.text('Inspected By:', sig2X, signatureY);
      doc.text(`${grn.inspectedBy.firstName} ${grn.inspectedBy.lastName}`, sig2X, signatureY + 12);
    }

    if (grn.approvedBy) {
      doc.text('Approved By:', sig3X, signatureY);
      doc.text(`${grn.approvedBy.firstName} ${grn.approvedBy.lastName}`, sig3X, signatureY + 12);
    }

    // Page numbers
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).text(
        `Page ${i + 1} of ${pages.count}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
    }

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ message: 'Error generating PDF', error: error.message });
  }
};