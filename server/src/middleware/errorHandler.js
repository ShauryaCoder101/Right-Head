/**
 * @module middleware/errorHandler
 * @description Global error handling middleware. Catches all errors, maps them
 * to consistent JSON responses, and logs details in development.
 */

const { ZodError } = require('zod');
const { Prisma } = require('@prisma/client');
const { config } = require('../config/env');

/**
 * Custom application error class with HTTP status codes.
 */
class AppError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} [code] - Machine-readable error code
   * @param {object} [details] - Additional error details
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Map Prisma errors to user-friendly responses.
 * @param {import('@prisma/client/runtime/library').PrismaClientKnownRequestError} error
 * @returns {{ statusCode: number, message: string, code: string }}
 */
function handlePrismaError(error) {
  switch (error.code) {
    case 'P2002': {
      const fields = error.meta?.target;
      const fieldName = Array.isArray(fields) ? fields.join(', ') : 'field';
      return {
        statusCode: 409,
        message: `A record with this ${fieldName} already exists`,
        code: 'DUPLICATE_ENTRY',
      };
    }
    case 'P2025':
      return {
        statusCode: 404,
        message: 'Record not found',
        code: 'NOT_FOUND',
      };
    case 'P2003':
      return {
        statusCode: 400,
        message: 'Referenced record does not exist',
        code: 'FOREIGN_KEY_VIOLATION',
      };
    case 'P2014':
      return {
        statusCode: 400,
        message: 'This operation would violate a required relation',
        code: 'RELATION_VIOLATION',
      };
    default:
      return {
        statusCode: 500,
        message: 'Database error',
        code: 'DATABASE_ERROR',
      };
  }
}

/**
 * Map Zod validation errors to a structured response.
 * @param {ZodError} error
 * @returns {{ statusCode: number, message: string, code: string, details: object[] }}
 */
function handleZodError(error) {
  const details = error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));

  return {
    statusCode: 400,
    message: 'Validation failed',
    code: 'VALIDATION_ERROR',
    details,
  };
}

/**
 * Map JWT errors to user-friendly responses.
 * @param {Error} error
 * @returns {{ statusCode: number, message: string, code: string }}
 */
function handleJwtError(error) {
  if (error.name === 'TokenExpiredError') {
    return {
      statusCode: 401,
      message: 'Token has expired',
      code: 'TOKEN_EXPIRED',
    };
  }
  if (error.name === 'JsonWebTokenError') {
    return {
      statusCode: 401,
      message: 'Invalid token',
      code: 'INVALID_TOKEN',
    };
  }
  if (error.name === 'NotBeforeError') {
    return {
      statusCode: 401,
      message: 'Token not yet active',
      code: 'TOKEN_NOT_ACTIVE',
    };
  }
  return {
    statusCode: 401,
    message: 'Authentication error',
    code: 'AUTH_ERROR',
  };
}

/**
 * Map Multer errors to user-friendly responses.
 * @param {Error} error
 * @returns {{ statusCode: number, message: string, code: string }}
 */
function handleMulterError(error) {
  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return {
        statusCode: 413,
        message: 'File is too large',
        code: 'FILE_TOO_LARGE',
      };
    case 'LIMIT_FILE_COUNT':
      return {
        statusCode: 400,
        message: 'Too many files uploaded',
        code: 'TOO_MANY_FILES',
      };
    case 'LIMIT_UNEXPECTED_FILE':
      return {
        statusCode: 400,
        message: 'Unexpected file field',
        code: 'UNEXPECTED_FILE',
      };
    default:
      return {
        statusCode: 400,
        message: error.message || 'File upload error',
        code: 'UPLOAD_ERROR',
      };
  }
}

/**
 * Global error handler middleware.
 * Must have 4 parameters for Express to recognize it as an error handler.
 *
 * @param {Error} err - The error object
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} _next - Express next (unused but required)
 */
function errorHandler(err, req, res, _next) {
  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';
  let details = null;

  // ─── AppError (our custom errors) ────────────────────────────────
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
    details = err.details;
  }
  // ─── Zod validation errors ──────────────────────────────────────
  else if (err instanceof ZodError) {
    const mapped = handleZodError(err);
    statusCode = mapped.statusCode;
    message = mapped.message;
    code = mapped.code;
    details = mapped.details;
  }
  // ─── Prisma known request errors ────────────────────────────────
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = handlePrismaError(err);
    statusCode = mapped.statusCode;
    message = mapped.message;
    code = mapped.code;
  }
  // ─── Prisma validation errors ──────────────────────────────────
  else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Invalid data provided';
    code = 'VALIDATION_ERROR';
  }
  // ─── JWT errors ─────────────────────────────────────────────────
  else if (
    err.name === 'TokenExpiredError' ||
    err.name === 'JsonWebTokenError' ||
    err.name === 'NotBeforeError'
  ) {
    const mapped = handleJwtError(err);
    statusCode = mapped.statusCode;
    message = mapped.message;
    code = mapped.code;
  }
  // ─── Multer errors ─────────────────────────────────────────────
  else if (err.name === 'MulterError') {
    const mapped = handleMulterError(err);
    statusCode = mapped.statusCode;
    message = mapped.message;
    code = mapped.code;
  }
  // ─── Syntax errors (bad JSON body) ─────────────────────────────
  else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON in request body';
    code = 'INVALID_JSON';
  }

  // Log the error
  if (statusCode >= 500) {
    console.error(`❌ [${code}] ${message}`, {
      path: req.path,
      method: req.method,
      stack: config.NODE_ENV === 'development' ? err.stack : undefined,
    });
  } else if (config.NODE_ENV === 'development') {
    console.warn(`⚠️  [${code}] ${message}`, { path: req.path, method: req.method });
  }

  // Send the response
  const response = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (details) {
    response.error.details = details;
  }

  // Include stack trace only in development
  if (config.NODE_ENV === 'development' && statusCode >= 500) {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * 404 handler for unmatched routes.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}

module.exports = { AppError, errorHandler, notFoundHandler };
