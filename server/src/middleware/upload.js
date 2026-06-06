/**
 * @module middleware/upload
 * @description Multer configuration for file uploads.
 * Provides pre-configured upload handlers for resumes (batch) and JDs (single).
 */

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { config } = require('../config/env');
const { AppError } = require('./errorHandler');

// Resolve the uploads directory relative to the server root
const UPLOADS_DIR = path.resolve(__dirname, '..', '..', 'uploads');

/**
 * Allowed MIME types for resume and JD uploads.
 */
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'text/plain',
]);

/**
 * Map MIME types to file extensions for consistent naming.
 */
const MIME_TO_EXT = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt',
};

/**
 * Multer disk storage engine with UUID-based filenames.
 * Files are stored as: <uuid>-<timestamp><ext>
 */
const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename(_req, file, cb) {
    const ext = MIME_TO_EXT[file.mimetype] || path.extname(file.originalname);
    const uniqueName = `${uuidv4()}-${Date.now()}${ext}`;
    cb(null, uniqueName);
  },
});

/**
 * File filter that rejects unsupported file types.
 * @param {import('express').Request} _req
 * @param {Express.Multer.File} file
 * @param {multer.FileFilterCallback} cb
 */
function fileFilter(_req, file, cb) {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Unsupported file type: ${file.mimetype}. Allowed: PDF, DOCX, TXT`,
        400,
        'INVALID_FILE_TYPE'
      ),
      false
    );
  }
}

/**
 * Resume upload handler.
 * Accepts up to 500 files under the "resumes" field.
 * Max file size: MAX_UPLOAD_SIZE_MB (default 25 MB).
 */
const resumeUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
    files: 500,
  },
}).array('resumes', 500);

/**
 * Job Description upload handler.
 * Accepts a single file under the "jd" field.
 * Max file size: 10 MB.
 */
const jdUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 1,
  },
}).single('jd');

/**
 * Wrap multer middleware to convert multer errors into AppErrors
 * for consistent error handling through our global handler.
 *
 * @param {Function} uploadMiddleware - The multer middleware function
 * @returns {import('express').RequestHandler}
 */
function wrapUpload(uploadMiddleware) {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          // Multer-specific error — pass through to errorHandler which handles MulterError
          return next(err);
        }
        // Our custom AppError or unknown error
        return next(err);
      }
      next();
    });
  };
}

module.exports = {
  resumeUpload: wrapUpload(resumeUpload),
  jdUpload: wrapUpload(jdUpload),
  UPLOADS_DIR,
};
