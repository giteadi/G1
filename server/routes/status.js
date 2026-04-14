'use strict';

const express = require('express');
const router = express.Router();
const StatusController = require('../controllers/StatusController');

router.get('/', StatusController.getStatus);
router.get('/metrics', StatusController.getMetrics);
router.get('/system', StatusController.getSystemInfo);
router.put('/config', StatusController.updateConfig);

module.exports = router;
