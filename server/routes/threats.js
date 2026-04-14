'use strict';

const express = require('express');
const router = express.Router();
const ThreatController = require('../controllers/ThreatController');

router.get('/', ThreatController.getAllThreats);
router.get('/stats', ThreatController.getStats);
router.get('/recent', ThreatController.getRecentThreats);
router.get('/scan', ThreatController.runScan);
router.post('/clean', ThreatController.cleanThreats);
router.get('/blocked', ThreatController.getBlockedIPs);
router.post('/unblock', ThreatController.unblockIP);
router.get('/:id', ThreatController.getThreatById);
router.post('/:id/clean', ThreatController.markCleaned);

module.exports = router;
