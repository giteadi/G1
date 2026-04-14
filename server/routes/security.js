'use strict';

const express = require('express');
const router = express.Router();
const SecurityController = require('../controllers/SecurityController');

// Master scan - all modules
router.get('/scan', SecurityController.masterScan);

// Individual module scans
router.get('/scan/crypto', SecurityController.cryptoScan);
router.get('/scan/brute-force', SecurityController.bruteForceScan);
router.get('/scan/ddos', SecurityController.ddosScan);
router.get('/scan/rootkit', SecurityController.rootkitScan);
router.get('/scan/cron', SecurityController.cronScan);
router.get('/scan/ports', SecurityController.portsScan);
router.get('/scan/ssh', SecurityController.sshScan);
router.get('/scan/privacy', SecurityController.privacyScan);
router.get('/scan/darkweb', SecurityController.darkwebScan);
router.get('/scan/system', SecurityController.systemMonitor);

// Resolve endpoints
router.post('/resolve/crypto', SecurityController.resolveCrypto);
router.post('/resolve/brute-force', SecurityController.resolveBruteForce);
router.post('/resolve/ddos', SecurityController.resolveDDoS);
router.post('/resolve/cron', SecurityController.resolveCron);
router.post('/resolve/port', SecurityController.resolvePort);
router.post('/resolve/ssh', SecurityController.resolveSSH);
router.post('/resolve/darkweb', SecurityController.resolveDarkweb);

// Auto-resolve all threats
router.post('/resolve/all', SecurityController.autoResolve);

module.exports = router;
