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

    // Case-insensitive role comparison
    const userRole = req.user.role?.toLowerCase();
    const normalizedRoles = allowedRoles.map(role => role.toLowerCase());

    if (!normalizedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user.role}' is not authorized to access this route. Required roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

// Middleware to filter queries by user role
export const filterByUser = (req, res, next) => {
  // Admin sees everything (case-insensitive)
  if (req.user.role?.toLowerCase() === 'admin') {
    return next();
  }

  // Non-admin users only see their own records
  req.userFilter = { createdBy: req.user._id };
  next();
};