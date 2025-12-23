// backend/src/middleware/authorize.js
// REPLACE ENTIRE FILE

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    // Flatten roles array in case an array is passed as first argument
    const allowedRoles = roles.flat();

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.user.role} is not authorized to access this route`
      });
    }

    next();
  };
};

// Middleware to filter queries by user role
export const filterByUser = (req, res, next) => {
  // Admin sees everything
  if (req.user.role === 'admin') {
    return next();
  }

  // Non-admin users only see their own records
  req.userFilter = { createdBy: req.user._id };
  next();
};