import Stock from '../models/Stock.js';
import StockTransaction from '../models/StockTransaction.js';
import Product from '../models/Product.js';

// Get all stock items
export const getAllStock = async (req, res) => {
  try {
    const { location, lowStock, needsReorder, search, category } = req.query;
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

    // Filter by category
    if (category) {
      filteredStocks = filteredStocks.filter(stock =>
        stock.product?.category?.toLowerCase() === category.toLowerCase()
      );
    }

    // Search by product name or category
    if (search) {
      filteredStocks = filteredStocks.filter(stock => {
        const name = stock.product?.name?.toLowerCase() || '';
        const cat = stock.product?.category?.toLowerCase() || '';
        const searchLower = search.toLowerCase();
        return name.includes(searchLower) || cat.includes(searchLower);
      });
    }

    res.json(filteredStocks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stock', error: error.message });
  }
};

// Get stock by product ID (all locations)
export const getStockByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { location } = req.query;

    let query = { product: productId };
    if (location) {
      query.location = location;
    }

    const stocks = await Stock.find(query)
      .populate('product', 'name category price description');

    if (!stocks || stocks.length === 0) {
      return res.status(404).json({ message: 'Stock not found for this product' });
    }

    // If location specified, return single stock, otherwise return array
    res.json(location ? stocks[0] : stocks);
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

    const stockLocation = location || 'Main Warehouse';

    // Check if stock already exists for this product at this location
    const existingStock = await Stock.findOne({ product, location: stockLocation });
    if (existingStock) {
      return res.status(400).json({ message: 'Stock already exists for this product at this location' });
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
      location: stockLocation,
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

    // Get current stock to compare quantity changes
    const currentStock = await Stock.findById(id);
    if (!currentStock) {
      return res.status(404).json({ message: 'Stock not found' });
    }

    const quantityChanged = updates.quantity !== undefined && updates.quantity !== currentStock.quantity;
    const oldQuantity = currentStock.quantity;
    const newQuantity = updates.quantity;

    // Don't allow direct updates to batches and serialNumbers
    delete updates.batches;
    delete updates.serialNumbers;

    // Update the stock
    const stock = await Stock.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('product');

    // If quantity was changed, create a transaction record for audit trail
    if (quantityChanged) {
      const quantityDiff = newQuantity - oldQuantity;
      const transaction = new StockTransaction({
        transactionType: 'adjustment',
        product: stock.product._id,
        quantity: Math.abs(quantityDiff),
        toLocation: quantityDiff > 0 ? stock.location : null,
        fromLocation: quantityDiff < 0 ? stock.location : null,
        balanceBefore: oldQuantity,
        balanceAfter: newQuantity,
        referenceType: 'Manual Edit',
        referenceNumber: `EDIT-${Date.now()}`,
        reason: 'Stock quantity updated via edit form',
        notes: `Quantity changed from ${oldQuantity} to ${newQuantity}`,
        performedBy: req.user.id,
        transactionDate: new Date()
      });
      await transaction.save();
    }

    res.json(stock);
  } catch (error) {
    res.status(500).json({ message: 'Error updating stock', error: error.message });
  }
};

// Stock adjustment (damage, loss, expiry, manual correction)
export const adjustStock = async (req, res) => {
  try {
    const { stockId, quantity, type, reason, notes, batchNumber, serialNumbers } = req.body;

    const stock = await Stock.findById(stockId);
    if (!stock) {
      return res.status(404).json({ message: 'Stock not found' });
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
      product: stock.product,
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

    console.log('Transfer request received:', { productId, quantity, fromLocation, toLocation });

    // Validate required fields
    if (!productId || !quantity || !fromLocation || !toLocation) {
      return res.status(400).json({
        message: 'Missing required fields',
        details: { productId, quantity, fromLocation, toLocation }
      });
    }

    // Find stock at source location
    const sourceStock = await Stock.findOne({ product: productId, location: fromLocation }).populate('product');
    if (!sourceStock) {
      console.log('Source stock not found:', { product: productId, location: fromLocation });
      return res.status(404).json({ message: 'Stock not found at source location' });
    }

    console.log('Source stock found:', { quantity: sourceStock.quantity, location: sourceStock.location });

    if (sourceStock.quantity < quantity) {
      return res.status(400).json({
        message: `Insufficient stock for transfer. Available: ${sourceStock.quantity}, Requested: ${quantity}`
      });
    }

    // Reduce quantity from source location
    const sourceBalanceBefore = sourceStock.quantity;
    sourceStock.quantity = sourceBalanceBefore - quantity;
    await sourceStock.save();
    console.log('Source stock updated:', { oldQty: sourceBalanceBefore, newQty: sourceStock.quantity });

    // Find or create stock at destination location
    let destinationStock = await Stock.findOne({ product: productId, location: toLocation });

    if (!destinationStock) {
      console.log('Creating new stock at destination:', toLocation);
      try {
        // Create new stock record at destination location
        destinationStock = new Stock({
          product: productId,
          quantity: quantity,
          location: toLocation,
          minLevel: sourceStock.minLevel,
          reorderLevel: sourceStock.reorderLevel,
          batchTracking: sourceStock.batchTracking,
          serialTracking: sourceStock.serialTracking,
          notes: `Transferred from ${fromLocation}`
        });
        await destinationStock.save();
        console.log('New destination stock created');
      } catch (createError) {
        console.error('Error creating destination stock:', createError);
        // Rollback source stock
        sourceStock.quantity = sourceBalanceBefore;
        await sourceStock.save();
        throw new Error(`Failed to create stock at destination: ${createError.message}`);
      }
    } else {
      console.log('Updating existing destination stock');
      // Update existing stock at destination location
      destinationStock.quantity += quantity;
      await destinationStock.save();
      console.log('Destination stock updated:', { newQty: destinationStock.quantity });
    }

    // Create transaction for the transfer
    const referenceNumber = `TRF-${Date.now()}`;
    try {
      const transaction = new StockTransaction({
        transactionType: 'transfer',
        product: productId,
        quantity,
        fromLocation,
        toLocation,
        balanceBefore: sourceBalanceBefore,
        balanceAfter: sourceStock.quantity,
        referenceType: 'Transfer',
        referenceNumber,
        notes,
        performedBy: req.user._id || req.user.id,
        transactionDate: new Date()
      });
      await transaction.save();
      console.log('Transaction created:', referenceNumber);
    } catch (transError) {
      console.error('Error creating transaction:', transError);
      console.error('Transaction error details:', transError.message);
      // Continue even if transaction fails (transfer already completed)
    }

    const updatedSourceStock = await Stock.findById(sourceStock._id).populate('product');
    const updatedDestinationStock = await Stock.findById(destinationStock._id).populate('product');

    console.log('Transfer completed successfully');
    res.json({
      success: true,
      sourceStock: updatedSourceStock,
      destinationStock: updatedDestinationStock,
      message: 'Transfer completed successfully'
    });
  } catch (error) {
    console.error('Error in transferStock:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      message: 'Error transferring stock',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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

// Get stock balance for a specific product (across all locations or specific location)
export const getStockBalance = async (req, res) => {
  try {
    const { productId } = req.params;
    const { location } = req.query;

    let query = { product: productId };
    if (location) {
      query.location = location;
    }

    const stocks = await Stock.find(query)
      .populate('product', 'name category price');

    if (!stocks || stocks.length === 0) {
      return res.json({
        product: productId,
        totalQuantity: 0,
        locations: [],
        isLowStock: false,
        needsReorder: false
      });
    }

    // Calculate total quantity across all locations
    const totalQuantity = stocks.reduce((sum, stock) => sum + stock.quantity, 0);

    // Get location-wise breakdown
    const locationBreakdown = stocks.map(stock => ({
      location: stock.location,
      quantity: stock.quantity,
      minLevel: stock.minLevel,
      reorderLevel: stock.reorderLevel,
      isLowStock: stock.quantity <= stock.minLevel,
      needsReorder: stock.quantity <= stock.reorderLevel
    }));

    res.json({
      product: stocks[0].product,
      totalQuantity,
      locations: locationBreakdown,
      isLowStock: stocks.some(s => s.quantity <= s.minLevel),
      needsReorder: stocks.some(s => s.quantity <= s.reorderLevel)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching balance', error: error.message });
  }
};

// Delete stock item (admin only)
export const deleteStock = async (req, res) => {
  try {
    const { id } = req.params;

    const stock = await Stock.findById(id);
    if (!stock) {
      return res.status(404).json({ message: 'Stock item not found' });
    }

    // Check if stock has quantity - create transaction for audit trail
    if (stock.quantity > 0) {
      try {
        const transaction = new StockTransaction({
          transactionType: 'adjustment',
          product: stock.product,
          quantity: stock.quantity,
          fromLocation: stock.location,
          balanceBefore: stock.quantity,
          balanceAfter: 0,
          referenceType: 'Stock Deletion',
          referenceNumber: `DEL-${Date.now()}`,
          reason: 'Stock item deleted',
          notes: `Stock item with ${stock.quantity} units was deleted`,
          performedBy: req.user.id,
          transactionDate: new Date()
        });
        await transaction.save();
      } catch (transError) {
        console.error('Error creating deletion transaction:', transError);
        // Continue with deletion even if transaction fails
      }
    }

    await Stock.findByIdAndDelete(id);
    res.json({ success: true, message: 'Stock item deleted successfully' });
  } catch (error) {
    console.error('Error deleting stock:', error);
    res.status(500).json({
      message: 'Error deleting stock',
      error: error.message
    });
  }
};