'use strict';

const express = require('express');
const router = express.Router();
const { loadConfig } = require('../config');
const SelfLearner = require('../services/SelfLearner');
const logger = require('../utils/logger');

const config = loadConfig();
const learner = new SelfLearner(config);

// Get learning stats
router.get('/stats', (req, res) => {
  try {
    const stats = learner.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (e) {
    logger.error(`Learning stats error: ${e.message}`);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Get all learned rules
router.get('/rules', (req, res) => {
  try {
    const rules = learner.getRules();
    res.json({
      success: true,
      data: rules
    });
  } catch (e) {
    logger.error(`Get rules error: ${e.message}`);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Manually trigger threat intel fetch
router.post('/fetch-intel', async (req, res) => {
  try {
    const result = await learner.fetchAndLearnThreatIntel();
    res.json({
      success: true,
      message: 'Threat intel fetch complete',
      data: result
    });
  } catch (e) {
    logger.error(`Fetch intel error: ${e.message}`);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Process unsure queue
router.post('/process-queue', async (req, res) => {
  try {
    await learner.processUnsureQueue();
    res.json({
      success: true,
      message: 'Unsure queue processed'
    });
  } catch (e) {
    logger.error(`Process queue error: ${e.message}`);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Run self-audit
router.post('/self-audit', async (req, res) => {
  try {
    const result = await learner.selfAudit();
    res.json({
      success: true,
      message: 'Self-audit complete',
      data: result
    });
  } catch (e) {
    logger.error(`Self-audit error: ${e.message}`);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Test evaluate an event (for testing)
router.post('/evaluate', async (req, res) => {
  try {
    const event = req.body;
    const result = await learner.evaluate(event);
    res.json({
      success: true,
      data: result
    });
  } catch (e) {
    logger.error(`Evaluate error: ${e.message}`);
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
