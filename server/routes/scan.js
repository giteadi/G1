'use strict';

const express = require('express');
const router = express.Router();
const ScannerService = require('../services/ScannerService');
const BrainService = require('../services/BrainService');
const WhatsAppService = require('../services/WhatsAppService');
const Threat = require('../models/Threat');
const { loadConfig } = require('../config');
const logger = require('../utils/logger');

// Manual full scan trigger
router.post('/run', async (req, res) => {
  try {
    const config = loadConfig();
    const scanner = new ScannerService(config);
    const brain = new BrainService(config);
    const whatsapp = new WhatsAppService(config);

    const { deep = false, module = null } = req.body;

    logger.info(`Manual scan triggered — deep: ${deep}, module: ${module || 'all'}`);
    
    let results;
    if (module) {
      // Per-module scan - construct method name
      const scanMethod = `check${module}`;
      if (typeof scanner[scanMethod] === 'function') {
        const result = await scanner[scanMethod]();
        results = [result];
      } else {
        logger.error(`Invalid module: ${module}, method: ${scanMethod}`);
        return res.status(400).json({ 
          error: `Invalid module: ${module}`,
          available: [
            'CryptoMiners', 'Rootkit', 'SuspiciousCrons', 'OpenPorts',
            'SSHConfig', 'PrivacyLeaks', 'DarkWebConnections', 'HiddenProcesses',
            'ServerProtection', 'CryptoDetector'
          ]
        });
      }
    } else {
      // Full scan
      results = await scanner.fullScan(deep);
    }

    // Har finding ko AI se analyze karo
    const analyzed = await Promise.all(results.map(async (result) => {
      if (!result || result.status === 'clean' || result.status === 'skipped') {
        return { ...result, ai_analysis: null };
      }

      if (result.findings?.length > 0) {
        const aiResult = await brain.analyzeThreat({
          type: `manual_scan_${result.module}`,
          module: result.module,
          findings: result.findings
        });

        // Threat save karo
        if (aiResult.is_threat) {
          const threat = Threat.save({
            type: result.module,
            severity: aiResult.severity,
            message: result.message,
            findings: result.findings,
            ai_analysis: aiResult.analysis,
            source: 'manual_scan'
          });
          
          // WhatsApp notification
          if (threat.severity === 'high' || threat.severity === 'critical') {
            whatsapp.sendThreatAlert(threat).catch(e => 
              logger.error(`WhatsApp alert failed: ${e.message}`)
            );
          }
        }

        return { ...result, ai_analysis: aiResult.analysis, is_threat: aiResult.is_threat };
      }

      return result;
    }));

    const summary = {
      total: analyzed.length,
      threats: analyzed.filter(r => r.status === 'threat').length,
      warnings: analyzed.filter(r => r.status === 'warning').length,
      clean: analyzed.filter(r => r.status === 'clean').length,
      scan_type: module ? `${module} scan` : (deep ? 'deep' : 'standard')
    };

    // Send scan summary via WhatsApp if threats found
    if (summary.threats > 0) {
      whatsapp.sendScanSummary(summary).catch(e => 
        logger.error(`WhatsApp summary failed: ${e.message}`)
      );
    }

    res.json({
      success: true,
      scan_type: summary.scan_type,
      timestamp: new Date().toISOString(),
      results: analyzed,
      summary
    });

  } catch (e) {
    logger.error(`Manual scan error: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// Per-module manual scans
router.post('/crypto', async (req, res) => {
  try {
    const config = loadConfig();
    const CryptoDetector = require('../services/CryptoDetector');
    const detector = new CryptoDetector(config);

    logger.info('Advanced crypto detection scan triggered');

    const result = await detector.detect();

    res.json({
      success: true,
      scan_type: 'crypto_detector',
      timestamp: new Date().toISOString(),
      ...result
    });
  } catch (e) {
    logger.error(`Crypto scan error: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

router.post('/rootkit', async (req, res) => {
  try {
    const config = loadConfig();
    const SecurityModules = require('../services/SecurityModules');
    const security = new SecurityModules(config);

    const result = await security.rootkitScan();

    res.json({
      success: true,
      scan_type: 'rootkit',
      timestamp: new Date().toISOString(),
      ...result
    });
  } catch (e) {
    logger.error(`Rootkit scan error: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

router.post('/ssh', async (req, res) => {
  try {
    const config = loadConfig();
    const SecurityModules = require('../services/SecurityModules');
    const security = new SecurityModules(config);

    const result = await security.sshScan();

    res.json({
      success: true,
      scan_type: 'ssh',
      timestamp: new Date().toISOString(),
      ...result
    });
  } catch (e) {
    logger.error(`SSH scan error: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

router.post('/ports', async (req, res) => {
  req.body.module = 'openPorts';
  return router.handle(req, res);
});

// Scan status/history
router.get('/history', (req, res) => {
  try {
    const threats = Threat.getAll();
    const autoScans = threats.filter(t => t.source === 'auto_scan');
    const manualScans = threats.filter(t => t.source === 'manual_scan');

    res.json({
      total: threats.length,
      auto_detected: autoScans.length,
      manual_detected: manualScans.length,
      recent: threats.slice(-20)
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Test WhatsApp notification
router.post('/test-whatsapp', async (req, res) => {
  try {
    const config = loadConfig();
    const whatsapp = new WhatsAppService(config);
    
    const testThreat = {
      type: 'test_alert',
      severity: 'high',
      message: 'This is a test notification from G1 Guardian',
      source: 'manual_test',
      timestamp: new Date().toISOString()
    };
    
    const sent = await whatsapp.sendThreatAlert(testThreat);
    
    res.json({
      success: sent,
      message: sent ? 'Test notification sent' : 'WhatsApp not configured or failed'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
