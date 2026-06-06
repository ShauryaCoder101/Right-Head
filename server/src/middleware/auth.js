/**
 * @module middleware/auth
 * @description JWT authentication middleware. Extracts tokens from
 * Authorization header (Bearer scheme) or cookies, verifies them,
 * and attaches the decoded user to req.user.
 */

const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const { AppError } = require('./errorHandler');

/**
 * Authenticate the request using a JWT token.
 * Checks Authorization header first, then falls back to cookies.
 *
 * On success, attaches to req:
 *   - req.user = { id, email, role, tenantId }
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function authenticateToken(req, res, next) {
  let token = null;

  // 1. Try Authorization header (Bearer scheme)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  // 2. Fall back to cookie
  if (!token && req.cookies) {
    token = req.cookies.accessToken;
  }

  // No token found
  if (!token) {
    return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);

    // Validate that the token contains required fields
    if (!decoded.id || !decoded.email || !decoded.role || !decoded.tenantId) {
      return next(new AppError('Invalid token payload', 401, 'INVALID_TOKEN'));
    }

    // Attach user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      tenantId: decoded.tenantId,
    };

    next();
  } catch (error) {
    // Let the global error handler deal with JWT-specific errors
    // (TokenExpiredError, JsonWebTokenError, NotBeforeError)
    next(error);
  }
}

/**
 * Generate an access token for a user.
 *
 * @param {{ id: string, email: string, role: string, tenantId: string }} user
 * @returns {string} Signed JWT access token
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_ACCESS_EXPIRY }
  );
}

/**
 * Generate a refresh token for a user.
 *
 * @param {{ id: string }} user
 * @returns {string} Signed JWT refresh token
 */
function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id, type: 'refresh' },
    config.JWT_SECRET,
    { expiresIn: config.JWT_REFRESH_EXPIRY }
  );
}

/**
 * Verify a refresh token and return the decoded payload.
 *
 * @param {string} token - The refresh token to verify
 * @returns {{ id: string, type: string }} Decoded payload
 * @throws {Error} If token is invalid or not a refresh token
 */
function verifyRefreshToken(token) {
  const decoded = jwt.verify(token, config.JWT_SECRET);
  if (decoded.type !== 'refresh') {
    throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');
  }
  return decoded;
}

module.exports = {
  authenticateToken,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
};
