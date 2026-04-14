'use strict';

const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error(`API Error: ${err.message}`);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
}

module.exports = errorHandler;
