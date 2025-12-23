import User from '../models/User.js';
import bcrypt from 'bcryptjs';

// Get all users (Admin only)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single user
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error in getUserById:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create new user (Admin only)
export const createUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, phone } = req.body;
    
    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: email, password, firstName, lastName'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Validate role
    const validRoles = ['admin', 'manager', 'user'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }
    
    // Create user (password will be hashed by pre-save hook)
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      role: role || 'user',
      phone,
      isActive: true
    });
    
    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    
    return res.status(201).json({
      success: true,
      data: userResponse,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error in createUser:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update user (Admin only)
export const updateUser = async (req, res) => {
  try {
    const { email, firstName, lastName, role, phone, isActive, password } = req.body;
    
    const updateData = {};
    
    if (email) updateData.email = email.toLowerCase();
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Validate and update role
    if (role) {
      const validRoles = ['admin', 'manager', 'user'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
        });
      }
      updateData.role = role;
    }
    
    // Update password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: user,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error in updateUser:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete user (Admin only)
export const deleteUser = async (req, res) => {
  try {
    // Prevent deleting yourself
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }
    
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteUser:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Toggle user active status (Admin only)
export const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Prevent deactivating yourself
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }
    
    user.isActive = !user.isActive;
    await user.save();
    
    return res.status(200).json({
      success: true,
      data: { isActive: user.isActive },
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error in toggleUserStatus:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Change user password (Admin only)
export const changeUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a password with at least 6 characters'
      });
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    user.password = newPassword; // Will be hashed by pre-save hook
    await user.save();
    
    return res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error in changeUserPassword:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};