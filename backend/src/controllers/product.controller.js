import Product from '../models/Product.js';

export const getAll = async (req, res) => {
  try {
    console.log('📦 GET /products - Query params:', req.query);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    // Get products without pagination limit for now (for dropdowns)
    const products = await Product.find()
      .sort({ createdAt: -1 })
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
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const getOne = async (req, res) => {
  try {
    console.log('📦 GET /products/:id -', req.params.id);
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      console.log('⚠️ Product not found:', req.params.id);
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }
    
    console.log('✅ Product found:', product.name);
    res.json({ success: true, result: product });
  } catch (error) {
    console.error('❌ Error in getOne product:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

export const create = async (req, res) => {
  try {
    console.log('📦 POST /products - Creating product:', req.body);
    
    // ✅ FIXED: Enhanced validation
    if (!req.body.name || req.body.name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Product name is required and cannot be empty'
      });
    }
    
    if (req.body.price === undefined || req.body.price === null || req.body.price === '') {
      return res.status(400).json({
        success: false,
        message: 'Product price is required'
      });
    }

    const priceValue = parseFloat(req.body.price);
    if (isNaN(priceValue) || priceValue < 0) {
      return res.status(400).json({
        success: false,
        message: 'Product price must be a valid positive number'
      });
    }
    
    // ✅ FIXED: Create product with proper data
    const product = await Product.create({
      name: req.body.name.trim(),
      category: req.body.category ? req.body.category.trim() : '',
      price: priceValue,
      taxRate: parseFloat(req.body.taxRate) || 0,
      description: req.body.description ? req.body.description.trim() : '',
      isActive: req.body.isActive !== undefined ? req.body.isActive : true
    });
    
    console.log('✅ Product created:', product._id, product.name);
    res.status(201).json({ 
      success: true, 
      result: product,
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating product:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A product with this name already exists'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to create product'
    });
  }
};

export const update = async (req, res) => {
  try {
    console.log('📦 PUT /products/:id -', req.params.id, req.body);
    
    // ✅ FIXED: Validate price if provided
    if (req.body.price !== undefined) {
      const priceValue = parseFloat(req.body.price);
      if (isNaN(priceValue) || priceValue < 0) {
        return res.status(400).json({
          success: false,
          message: 'Product price must be a valid positive number'
        });
      }
      req.body.price = priceValue;
    }
    
    const product = await Product.findByIdAndUpdate(
      req.params.id, 
      {
        name: req.body.name,
        category: req.body.category,
        price: req.body.price,
        taxRate: parseFloat(req.body.taxRate) || 0,
        description: req.body.description,
        isActive: req.body.isActive
      },
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!product) {
      console.log('⚠️ Product not found for update:', req.params.id);
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }
    
    console.log('✅ Product updated:', product._id, product.name);
    res.json({ 
      success: true, 
      result: product,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating product:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

export const remove = async (req, res) => {
  try {
    console.log('📦 DELETE /products/:id -', req.params.id);
    
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      console.log('⚠️ Product not found for deletion:', req.params.id);
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }
    
    console.log('✅ Product deleted:', product._id, product.name);
    res.json({ 
      success: true, 
      message: 'Product deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Error deleting product:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};