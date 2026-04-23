const { validationResult } = require('express-validator');

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Invalid request payload',
        details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      },
    });
  }
  next();
}

function globalErrorHandler(err, req, res, next) {
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Something went wrong',
    },
  });
}

module.exports = { handleValidationErrors, globalErrorHandler };
