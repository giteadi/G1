'use strict';

const { execSync } = require('child_process');

class BlockedIP {
  constructor() {
    this.ips = new Set();
    this.whitelist = new Set();
  }

  add(ip, whitelistConfig = []) {
    if (this.ips.has(ip) || whitelistConfig.includes(ip)) return false;
    try {
      execSync(`iptables -I INPUT -s ${ip} -j DROP 2>/dev/null || true`);
      this.ips.add(ip);
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
