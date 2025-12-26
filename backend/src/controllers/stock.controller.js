import Stock from '../models/Stock.js';
import StockTransaction from '../models/StockTransaction.js';
import Product from '../models/Product.js';

// Get all stock items
export const getAllStock = async (req, res) => {
  try {
    const { location, lowStock, needsReorder, search } = req.query;
    let query = { isActive: true };

    if (location) {
      query.location = location;
    }

    const stocks = await Stock.find(query)
      .populate('product', 'name category price')
      .sort({ 'product.name': 1 });

    let filteredStocks = stocks;

    // Filter for low stock
    if (lowStock === 'true') {
      filteredStocks = filteredStocks.filter(stock => stock.quantity <= stock.minLevel);
    }

    // Filter for reorder needed
    if (needsReorder === 'true') {
      filteredStocks = filteredStocks.filter(stock => stock.quantity <= stock.reorderLevel);
    }

    // Search by product name
    if (search) {
      filteredStocks = filteredStocks.filter(stock => 
        stock.product.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    res.json(filteredStocks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stock', error: error.message });
  }
};

// Get stock by product ID
export const getStockByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const stock = await Stock.findOne({ product: productId })
      .populate('product', 'name category price description');

    if (!stock) {
      return res.status(404).json({ message: 'Stock not found for this product' });
    }

    res.json(stock);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stock', error: error.message });
  }
};

// Get stock by stock ID
export const getStockById = async (req, res) => {
  try {
    const { id } = req.params;
    const stock = await Stock.findById(id)
      .populate('product', 'name category price description');

    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }

    res.json(stock);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stock', error: error.message });
  }
};

// Create or initialize stock for a product
export const createStock = async (req, res) => {
  try {
    const { product, quantity, minLevel, reorderLevel, location, batchTracking, serialTracking } = req.body;

    // Check if stock already exists for this product
    const existingStock = await Stock.findOne({ product });
    if (existingStock) {
      return res.status(400).json({ message: 'Stock already exists for this product' });
    }

    // Verify product exists
    const productExists = await Product.findById(product);
    if (!productExists) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const stock = new Stock({
      product,
      quantity: quantity || 0,
      minLevel: minLevel || 10,
      reorderLevel: reorderLevel || 20,
      location: location || 'Main Warehouse',
      batchTracking: batchTracking || false,
      serialTracking: serialTracking || false
    });

    await stock.save();

    // Create initial stock transaction
    if (quantity > 0) {
      const transaction = new StockTransaction({
        transactionType: 'stock_in',
        product,
        quantity,
        toLocation: location || 'Main Warehouse',
        balanceBefore: 0,
        balanceAfter: quantity,
        referenceType: 'Manual',
        referenceNumber: 'INITIAL_STOCK',
        reason: 'Initial stock creation',
        performedBy: req.user.id,
        transactionDate: new Date()
      });
      await transaction.save();
    }

    const populatedStock = await Stock.findById(stock._id).populate('product');
    res.status(201).json(populatedStock);
  } catch (error) {
    res.status(500).json({ message: 'Error creating stock', error: error.message });
  }
};

// Update stock settings (min/reorder levels, location, etc.)
export const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow direct quantity updates through this endpoint
    delete updates.quantity;
    delete updates.batches;
    delete updates.serialNumbers;

    const stock = await Stock.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('product');

    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
    }

    res.json(stock);
  } catch (error) {
    res.status(500).json({ message: 'Error updating stock', error: error.message });
  }
};

// Stock adjustment (damage, loss, expiry, manual correction)
export const adjustStock = async (req, res) => {
  try {
    const { productId, quantity, type, reason, notes, batchNumber, serialNumbers } = req.body;

    const stock = await Stock.findOne({ product: productId });
    if (!stock) {
      return res.status(404).json({ message: 'Stock not found for this product' });
    }

    const balanceBefore = stock.quantity;
    const balanceAfter = balanceBefore + quantity; // quantity can be negative

    if (balanceAfter < 0) {
      return res.status(400).json({ message: 'Insufficient stock for this adjustment' });
    }

    // Update stock quantity
    stock.quantity = balanceAfter;
    await stock.save();

    // Create transaction
    const transaction = new StockTransaction({
      transactionType: type || 'adjustment',
      product: productId,
      quantity: Math.abs(quantity),
      toLocation: quantity > 0 ? stock.location : null,
      fromLocation: quantity < 0 ? stock.location : null,
      batchNumber,
      serialNumbers,
      balanceBefore,
      balanceAfter,
      referenceType: 'Adjustment',
      referenceNumber: `ADJ-${Date.now()}`,
      reason,
      notes,
      performedBy: req.user.id,
      transactionDate: new Date()
    });
    await transaction.save();

    const updatedStock = await Stock.findById(stock._id).populate('product');
    res.json({ stock: updatedStock, transaction });
  } catch (error) {
    res.status(500).json({ message: 'Error adjusting stock', error: error.message });
  }
};

// Stock transfer between locations
export const transferStock = async (req, res) => {
  try {
    const { productId, quantity, fromLocation, toLocation, notes } = req.body;

    // This is a simplified version - in a real system, you'd have separate stock records per location
    const stock = await Stock.findOne({ product: productId, location: fromLocation });
    if (!stock) {
      return res.status(404).json({ message: 'Stock not found at source location' });
    }

    if (stock.quantity < quantity) {
      return res.status(400).json({ message: 'Insufficient stock for transfer' });
    }

    const balanceBefore = stock.quantity;
    const balanceAfter = balanceBefore - quantity;

    stock.quantity = balanceAfter;
    await stock.save();

    // Create transaction
    const transaction = new StockTransaction({
      transactionType: 'transfer',
      product: productId,
      quantity,
      fromLocation,
      toLocation,
      balanceBefore,
      balanceAfter,
      referenceType: 'Transfer',
      referenceNumber: `TRF-${Date.now()}`,
      notes,
      performedBy: req.user.id,
      transactionDate: new Date()
    });
    await transaction.save();

    const updatedStock = await Stock.findById(stock._id).populate('product');
    res.json({ stock: updatedStock, transaction });
  } catch (error) {
    res.status(500).json({ message: 'Error transferring stock', error: error.message });
  }
};

// Get stock transactions/history
export const getStockTransactions = async (req, res) => {
  try {
    const { productId, transactionType, startDate, endDate } = req.query;
    let query = {};

    if (productId) {
      query.product = productId;
    }

    if (transactionType) {
      query.transactionType = transactionType;
    }

    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) query.transactionDate.$gte = new Date(startDate);
      if (endDate) query.transactionDate.$lte = new Date(endDate);
    }

    const transactions = await StockTransaction.find(query)
      .populate('product', 'name category')
      .populate('performedBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ transactionDate: -1 })
      .limit(100);

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions', error: error.message });
  }
};

// Get low stock alerts
export const getLowStockAlerts = async (req, res) => {
  try {
    const stocks = await Stock.find({ isActive: true })
      .populate('product', 'name category price');

    const lowStockItems = stocks.filter(stock => stock.quantity <= stock.minLevel);
    const reorderItems = stocks.filter(stock => 
      stock.quantity <= stock.reorderLevel && stock.quantity > stock.minLevel
    );

    res.json({
      lowStock: lowStockItems,
      reorderNeeded: reorderItems,
      summary: {
        lowStockCount: lowStockItems.length,
        reorderCount: reorderItems.length
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching alerts', error: error.message });
  }
};

// Get stock balance for a specific product
export const getStockBalance = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const stock = await Stock.findOne({ product: productId })
      .populate('product', 'name category price');

    if (!stock) {
      return res.json({ 
        product: productId,
        quantity: 0,
        isLowStock: false,
        needsReorder: false 
      });
    }

    res.json({
      product: stock.product,
      quantity: stock.quantity,
      minLevel: stock.minLevel,
      reorderLevel: stock.reorderLevel,
      location: stock.location,
      isLowStock: stock.quantity <= stock.minLevel,
      needsReorder: stock.quantity <= stock.reorderLevel,
      batches: stock.batches,
      serialNumbers: stock.serialNumbers
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching balance', error: error.message });
  }
};