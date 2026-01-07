import Product from '../models/Product.js';

/**
 * GET ALL PRODUCTS
 */
export const getAll = async (req, res) => {
  try {
    console.log('📦 GET /products - Query params:', req.query);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const products = await Product.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Product.countDocuments();

    console.log(`✅ Found ${products.length} products`);

    res.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error in getAll products:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * GET ONE PRODUCT
 */
export const getOne = async (req, res) => {
  try {
    console.log('📦 GET /products/:id -', req.params.id);

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({ success: true, result: product });
  } catch (error) {
    console.error('❌ Error in getOne product:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * CREATE PRODUCT
 */
export const create = async (req, res) => {
  try {
    console.log('📦 POST /products - Creating:', req.body);

    const {
      name,
      category,
      baseUnit,
      packSize,
      unitCost,
      price,
      taxRate,
      description,
      isActive
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Product name is required' });
    }

    if (!baseUnit) {
      return res.status(400).json({ success: false, message: 'Base unit is required' });
    }

    if (!packSize || packSize <= 0) {
      return res.status(400).json({ success: false, message: 'Pack size must be greater than 0' });
    }

    if (unitCost === undefined || unitCost < 0) {
      return res.status(400).json({ success: false, message: 'Unit cost is required' });
    }

    if (price === undefined || price < 0) {
      return res.status(400).json({ success: false, message: 'Selling price is required' });
    }

    const product = await Product.create({
      name: name.trim(),
      category: category?.trim(),
      baseUnit,
      packSize,
      unitCost,
      price,
      taxRate: parseFloat(taxRate) || 0,
      description: description?.trim(),
      isActive: isActive !== undefined ? isActive : true
    });

    console.log('✅ Product created:', product._id);

    res.status(201).json({
      success: true,
      result: product,
      message: 'Product created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating product:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors).map(e => e.message)
      });
    }

    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * UPDATE PRODUCT
 */
export const update = async (req, res) => {
  try {
    console.log('📦 PUT /products/:id -', req.params.id);

    const {
      name,
      category,
      baseUnit,
      packSize,
      unitCost,
      price,
      taxRate,
      description,
      isActive
    } = req.body;

    if (price !== undefined && price < 0) {
      return res.status(400).json({ success: false, message: 'Invalid selling price' });
    }

    if (unitCost !== undefined && unitCost < 0) {
      return res.status(400).json({ success: false, message: 'Invalid unit cost' });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        category,
        baseUnit,
        packSize,
        unitCost,
        price,
        taxRate: parseFloat(taxRate) || 0,
        description,
        isActive
      },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    console.log('✅ Product updated:', product._id);

    res.json({
      success: true,
      result: product,
      message: 'Product updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating product:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE PRODUCT
 */
export const remove = async (req, res) => {
  try {
    console.log('📦 DELETE /products/:id -', req.params.id);

    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    console.log('✅ Product deleted:', product._id);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting product:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
