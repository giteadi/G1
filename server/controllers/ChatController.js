'use strict';

const BrainService = require('../services/BrainService');
const { loadConfig } = require('../config');

class ChatController {
  static async chat(req, res) {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const config = loadConfig();
      const brain = new BrainService(config);
      const response = await brain.chat(message);

      res.json({
        success: true,
        message: response,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  static async analyze(req, res) {
    try {
      const { threatData } = req.body;
      if (!threatData) {
        return res.status(400).json({ error: 'Threat data is required' });
      }

      const config = loadConfig();
      const brain = new BrainService(config);
      const analysis = await brain.analyzeThreat(threatData);

      res.json({
        success: true,
        analysis,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
}

module.exports = ChatController;
