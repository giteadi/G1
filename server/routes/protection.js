'use strict';

const express = require('express');
const router = express.Router();
const ProtectionController = require('../controllers/ProtectionController');

// Get protection status
router.get('/status', ProtectionController.getStatus);

// Enable individual protections
router.post('/firewall/enable', ProtectionController.enableFirewall);
router.post('/fail2ban/enable', ProtectionController.enableFail2ban);
router.post('/ssh/harden', ProtectionController.hardenSSH);

// IP blocking
router.post('/block', ProtectionController.blockIP);
router.post('/unblock', ProtectionController.unblockIP);

// Process isolation
router.post('/isolate', ProtectionController.isolateProcess);
router.post('/network/isolate', ProtectionController.networkIsolate);

// Full protection
router.post('/enable-all', ProtectionController.applyFullProtection);

// Vulnerability scanning
router.get('/vulnerabilities', ProtectionController.scanVulnerabilities);

// Auto-remediation settings
router.post('/auto-remediate/enable', ProtectionController.enableAutoRemediation);
router.post('/auto-remediate/disable', ProtectionController.disableAutoRemediation);

// SSH status
router.get('/ssh/status', ProtectionController.getSSHStatus);

// Honeypot
router.post('/honeypot/deploy', ProtectionController.deployHoneypot);

module.exports = router;
