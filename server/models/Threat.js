'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.env.HOME || '/root', '.g1');
const THREATS_FILE = path.join(DATA_DIR, 'threats.json');

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
      const threats = JSON.parse(fs.readFileSync(THREATS_FILE, 'utf8') || '[]');
      return threats.slice(-limit).reverse();
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
    let threats = this.getAll(1000);
    threats.push(threat);
    if (threats.length > 500) threats = threats.slice(-500);
    
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(THREATS_FILE, JSON.stringify(threats, null, 2));
      return threat;
    } catch (e) {
      throw new Error(`Failed to save threat: ${e.message}`);
    }
  }

  static markCleaned(id) {
    let threats = this.getAll(1000);
    const threat = threats.find(t => t.id === id);
    if (threat) {
      threat.cleaned = true;
      threat.cleaned_at = new Date().toISOString();
      fs.writeFileSync(THREATS_FILE, JSON.stringify(threats, null, 2));
    }
    return threat;
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
}

module.exports = Threat;
