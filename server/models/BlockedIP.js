'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DATA_DIR = path.join(process.env.HOME || '/root', '.g1');
const BLOCKED_FILE = path.join(DATA_DIR, 'blocked_ips.json');

class BlockedIP {
  constructor() {
    this.ips = new Set();
    this.whitelist = new Set();
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(BLOCKED_FILE)) {
        const data = JSON.parse(fs.readFileSync(BLOCKED_FILE, 'utf8') || '[]');
        data.forEach(ip => this.ips.add(ip));
      }
    } catch (e) {
      console.error('Error loading blocked IPs:', e.message);
    }
  }

  _persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(BLOCKED_FILE, JSON.stringify([...this.ips], null, 2));
    } catch (e) {
      console.error('Error saving blocked IPs:', e.message);
    }
  }

  add(ip, whitelistConfig = []) {
    if (this.ips.has(ip) || whitelistConfig.includes(ip)) return false;
    try {
      execSync(`iptables -I INPUT -s ${ip} -j DROP 2>/dev/null || true`);
      this.ips.add(ip);
      this._persist(); // Save to disk
      return true;
    } catch (e) {
      return false;
    }
  }

  remove(ip) {
    if (!this.ips.has(ip)) return false;
    try {
      execSync(`iptables -D INPUT -s ${ip} -j DROP 2>/dev/null || true`);
      this.ips.delete(ip);
      this._persist(); // Update disk
      return true;
    } catch (e) {
      return false;
    }
  }

  has(ip) {
    return this.ips.has(ip);
  }

  getAll() {
    return [...this.ips];
  }

  size() {
    return this.ips.size;
  }
}

module.exports = new BlockedIP();
