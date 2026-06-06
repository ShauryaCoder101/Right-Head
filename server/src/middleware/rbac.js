/**
 * @module middleware/rbac
 * @description Role-based access control middleware factory.
 * Creates middleware that checks if the authenticated user's role
 * is in the list of allowed roles.
 */

const { AppError } = require('./errorHandler');

/**
 * Create a middleware that restricts access to users with specific roles.
 * Must be used AFTER authenticateToken middleware so that req.user is set.
 *
 * @param {...string} allowedRoles - One or more UserRole values (RECRUITER, HIRING_MANAGER, ADMIN)
 * @returns {import('express').RequestHandler} Express middleware
 *
 * @example
 * router.post('/jd', authenticateToken, authorize('RECRUITER', 'ADMIN'), createJd);
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    // Ensure authentication middleware has run
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
    }

    // Check if user's role is in the allowed list
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Required role: ${allowedRoles.join(' or ')}`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
}

module.exports = { authorize };
