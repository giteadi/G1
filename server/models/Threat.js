'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.env.HOME || '/root', '.g1');
const THREATS_FILE = path.join(DATA_DIR, 'threats.json');
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit

class Threat {
  constructor(data) {
    this.id = data.id || Date.now().toString();
    this.type = data.type;
    this.severity = data.severity || 'medium';
    this.message = data.message;
    this.process_name = data.process_name;
    this.pid = data.pid;
    this.cpu_usage = data.cpu_usage;
    this.command = data.command;
    this.attacker_ip = data.attacker_ip;
    this.details = data.details || {};
    this.timestamp = data.timestamp || new Date().toISOString();
    this.cleaned = data.cleaned || false;
    this.cleaned_at = data.cleaned_at || null;
    this.ai_analysis = data.ai_analysis || null;
  }

  static getAll(limit = 500) {
    try {
      if (!fs.existsSync(THREATS_FILE)) return [];

      // Check file size to prevent reading huge files
      const stats = fs.statSync(THREATS_FILE);
      if (stats.size > MAX_FILE_SIZE) {
        console.warn(`Threats file too large (${stats.size} bytes), truncating...`);
        // Keep only last 1000 threats by rewriting file
        return this._truncateAndRead(limit);
      }

      const threats = JSON.parse(fs.readFileSync(THREATS_FILE, 'utf8') || '[]');
      return threats.slice(-limit).reverse();
    } catch (e) {
      console.error('Error reading threats:', e.message);
      return [];
    }
  }

  static _truncateAndRead(limit) {
    try {
      const content = fs.readFileSync(THREATS_FILE, 'utf8');
      const threats = JSON.parse(content || '[]');
      // Keep only last 1000 entries
      const trimmed = threats.slice(-1000);
      fs.writeFileSync(THREATS_FILE, JSON.stringify(trimmed, null, 2));
      return trimmed.slice(-limit).reverse();
    } catch (e) {
      return [];
    }
  }

  static getRecent(hours = 24) {
    const threats = this.getAll();
    const cutoff = Date.now() - (hours * 3600000);
    return threats.filter(t => new Date(t.timestamp).getTime() > cutoff);
  }

  static getById(id) {
    const threats = this.getAll();
    return threats.find(t => t.id === id);
  }

  static save(threatData) {
    const threat = new Threat(threatData);

    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

      // Read file directly instead of calling getAll() to avoid recursion
      let threats = [];
      if (fs.existsSync(THREATS_FILE)) {
        try {
          const stats = fs.statSync(THREATS_FILE);
          if (stats.size < MAX_FILE_SIZE) {
            threats = JSON.parse(fs.readFileSync(THREATS_FILE, 'utf8') || '[]');
          } else {
            // File too large, start fresh
            threats = [];
          }
        } catch {}
      }

      threats.push(threat);
      if (threats.length > 500) threats = threats.slice(-500);

      fs.writeFileSync(THREATS_FILE, JSON.stringify(threats, null, 2));
      return threat;
    } catch (e) {
      throw new Error(`Failed to save threat: ${e.message}`);
    }
  }

  static markCleaned(id) {
    try {
      let threats = [];
      if (fs.existsSync(THREATS_FILE)) {
        const stats = fs.statSync(THREATS_FILE);
        if (stats.size < MAX_FILE_SIZE) {
          threats = JSON.parse(fs.readFileSync(THREATS_FILE, 'utf8') || '[]');
        }
      }

      const threat = threats.find(t => t.id === id);
      if (threat) {
        threat.cleaned = true;
        threat.cleaned_at = new Date().toISOString();
        fs.writeFileSync(THREATS_FILE, JSON.stringify(threats, null, 2));
      }
      return threat;
    } catch (e) {
      console.error('Error marking threat cleaned:', e.message);
      return null;
    }
  }

  static getStats() {
    const threats = this.getAll();
    const today = new Date(Date.now() - 86400000);
    return {
      total: threats.length,
      today: threats.filter(t => new Date(t.timestamp) > today).length,
      bySeverity: {
        critical: threats.filter(t => t.severity === 'critical').length,
        high: threats.filter(t => t.severity === 'high').length,
        medium: threats.filter(t => t.severity === 'medium').length,
        low: threats.filter(t => t.severity === 'low').length
      }
    };
  }

  static clearAll() {
    try {
      if (fs.existsSync(THREATS_FILE)) {
        fs.writeFileSync(THREATS_FILE, JSON.stringify([], null, 2));
      }
      return { success: true, message: 'All threats cleared' };
    } catch (e) {
      throw new Error(`Failed to clear threats: ${e.message}`);
    }
  }

  static clearByType(type) {
    try {
      let threats = [];
      if (fs.existsSync(THREATS_FILE)) {
        const stats = fs.statSync(THREATS_FILE);
        if (stats.size < MAX_FILE_SIZE) {
          threats = JSON.parse(fs.readFileSync(THREATS_FILE, 'utf8') || '[]');
        }
      }

      const originalCount = threats.length;
      threats = threats.filter(t => t.type !== type);
      fs.writeFileSync(THREATS_FILE, JSON.stringify(threats, null, 2));

      const cleared = originalCount - threats.length;
      return { success: true, message: `Cleared ${cleared} ${type} threat(s)` };
    } catch (e) {
      throw new Error(`Failed to clear threats: ${e.message}`);
    }
  }
}

module.exports = Threat;
