'use strict';

const express = require('express');
const router = express.Router();
const ThreatController = require('../controllers/ThreatController');

router.get('/', ThreatController.getAllThreats);
router.get('/stats', ThreatController.getStats);
router.get('/recent', ThreatController.getRecentThreats);
router.post('/scan', ThreatController.runScan);
router.post('/clean', ThreatController.cleanThreats);
router.get('/blocked', ThreatController.getBlockedIPs);
router.post('/block', ThreatController.blockIP);
router.post('/unblock', ThreatController.unblockIP);
router.get('/:id', ThreatController.getThreatById);
router.post('/:id/clean', ThreatController.markCleaned);

module.exports = router;
