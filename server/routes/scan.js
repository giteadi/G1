'use strict';

const express = require('express');
const router = express.Router();
const ScannerService = require('../services/ScannerService');
const BrainService = require('../services/BrainService');
const Threat = require('../models/Threat');
const { loadConfig } = require('../config');
const logger = require('../utils/logger');

// Manual full scan trigger
router.post('/run', async (req, res) => {
  try {
    const config = loadConfig();
    const scanner = new ScannerService(config);
    const brain = new BrainService(config);

    const { deep = false } = req.body;

    logger.info(`Manual scan triggered — deep: ${deep}`);
    const results = await scanner.fullScan(deep);

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
          Threat.save({
            type: result.module,
            severity: aiResult.severity,
            message: result.message,
            findings: result.findings,
            ai_analysis: aiResult.analysis,
            source: 'manual_scan'
          });
        }

        return { ...result, ai_analysis: aiResult.analysis, is_threat: aiResult.is_threat };
      }

      return result;
    }));

    res.json({
      success: true,
      scan_type: deep ? 'deep' : 'standard',
      timestamp: new Date().toISOString(),
      results: analyzed,
      summary: {
        total: analyzed.length,
        threats: analyzed.filter(r => r.status === 'threat').length,
        warnings: analyzed.filter(r => r.status === 'warning').length,
        clean: analyzed.filter(r => r.status === 'clean').length
      }
    });

  } catch (e) {
    logger.error(`Manual scan error: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
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

module.exports = router;
