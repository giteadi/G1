'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.env.HOME || '/root', '.g1');
const MEMORY_FILE = path.join(DATA_DIR, 'g1_memory.json');

class Memory {
  constructor() {
    this.threatMemory = [];
    this.serverBaseline = {};
    this.conversationHistory = [];
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(MEMORY_FILE)) {
        const data = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
        this.threatMemory = data.threats || [];
        this.serverBaseline = data.baseline || {};
        this.conversationHistory = data.conversation?.slice(-20) || [];
      }
    } catch (e) {}
  }

  save() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(MEMORY_FILE, JSON.stringify({
        threats: this.threatMemory.slice(-100),
        baseline: this.serverBaseline,
        conversation: this.conversationHistory.slice(-20),
        last_updated: new Date().toISOString()
      }, null, 2));
    } catch (e) {}
  }

  addThreat(threat) {
    this.threatMemory.push({
      ...threat,
      timestamp: new Date().toISOString()
    });
    if (this.threatMemory.length > 100) {
      this.threatMemory = this.threatMemory.slice(-100);
    }
    this.save();
  }

  addConversation(role, content) {
    this.conversationHistory.push({ role, content, timestamp: new Date().toISOString() });
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }
    this.save();
  }

  updateBaseline(metrics) {
    this.serverBaseline = { ...this.serverBaseline, ...metrics };
    this.save();
  }

  getRecentThreats(count = 10) {
    return this.threatMemory.slice(-count);
  }

  getContextSummary() {
    const recentThreats = this.getRecentThreats(10);
    const threatSummary = recentThreats.length > 0
      ? `Recent threats detected: ${recentThreats.map(t => `${t.type} (${t.severity}) at ${t.timestamp}`).join('; ')}`
      : 'No recent threats in memory.';

    const baseline = Object.keys(this.serverBaseline).length > 0
      ? `Server baseline — CPU avg: ${this.serverBaseline.cpu_avg || 'unknown'}%, RAM avg: ${this.serverBaseline.ram_avg || 'unknown'}%, normal connections: ${this.serverBaseline.conn_avg || 'unknown'}`
      : 'Server baseline not yet established.';

    return `${threatSummary}\n\n${baseline}`;
  }
}

module.exports = new Memory();
