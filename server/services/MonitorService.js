'use strict';

const si = require('systeminformation');
const cron = require('node-cron');
const Threat = require('../models/Threat');
const BlockedIP = require('../models/BlockedIP');
const Memory = require('../models/Memory');
const BrainService = require('./BrainService');
const logger = require('../utils/logger');

class MonitorService {
  constructor(config) {
    this.config = config;
    this.brain = new BrainService(config);
    this.knownSuspiciousProcs = new Set();
    this.recentEvents = [];
    this.isRunning = false;
    
    // Network delta cache
    this._lastNet = null;
    this._lastNetTime = null;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    logger.info('G1 Monitor started — 24/7 Active');

    // Lightweight check har 30 sec
    cron.schedule('*/30 * * * * *', async () => {
      await this.monitorCycle();
    });

    // Full deep scan har 5 min
    cron.schedule('*/5 * * * *', async () => {
      logger.info('Auto deep scan starting...');
      const results = await this.deepScan();
      await this.processAutoScanResults(results);
    });

    // Hourly baseline
    cron.schedule('0 * * * *', () => this.updateBaseline());

    // Startup pe ek baar full scan
    setTimeout(async () => {
      const results = await this.deepScan();
      await this.processAutoScanResults(results);
    }, 5000);
  }

  stop() {
    this.isRunning = false;
    logger.info('G1 Monitor stopped');
  }

  async monitorCycle() {
    try {
      await this.checkCryptoMining();
      await this.checkBruteForce();
      await this.checkDDoS();
    } catch (e) {
      logger.error(`Monitor cycle error: ${e.message}`);
    }
  }

  // Network speed - cached delta (no delay needed)
  async getNetworkSpeed() {
    const now = Date.now();
    const net = await si.networkStats();

    if (!this._lastNet || !this._lastNetTime) {
      this._lastNet = net;
      this._lastNetTime = now;
      return { rx_per_sec: 0, tx_per_sec: 0 };
    }

    const elapsed = Math.max(1, (now - this._lastNetTime) / 1000); // seconds
    const rx_per_sec = Math.max(0, (net[0]?.rx_bytes - this._lastNet[0]?.rx_bytes) / elapsed);
    const tx_per_sec = Math.max(0, (net[0]?.tx_bytes - this._lastNet[0]?.tx_bytes) / elapsed);

    this._lastNet = net;
    this._lastNetTime = now;

    return { rx_per_sec, tx_per_sec };
  }

  async checkCryptoMining() {
    const [cpu, processes] = await Promise.all([
      si.currentLoad(),
      si.processes()
    ]);

    // Strict keywords - 'networkservice' and 'monero' removed to avoid false positives
    const suspiciousKeywords = [
      'xmrig', 'minergate', 'cryptonight', 'coinhive',
      'cpuminer', 'cgminer', 'ethminer', 'nicehash', 'claymore',
      'minerd', 'cryptominer', 'coin-hive', 'kworkerds', 'sysupdate',
      'watchbog'
    ];

    // macOS system processes whitelist
    const macosSystemProcs = [
      'networkserviceproxy', 'trustd', 'syspolicyd', 'mobileassetd',
      'coreauthd', 'secinitd', 'logd', 'configd', 'notifyd',
      'diskarbitrationd', 'locationd', 'mediaanalysisd', 'tgondevice',
      'useractivityd', 'apsd', 'symptomsd', 'wifid', 'bluetoothd'
    ];

    // Expanded whitelist - legitimate high CPU processes
    const legitimateProcs = [
      'node', 'python', 'python3', 'java', 'nginx', 'apache',
      'apache2', 'mysql', 'mysqld', 'postgres', 'ruby', 'php',
      'redis', 'mongodb', 'elasticsearch', 'webpack', 'tsc',
      'cargo', 'rustc', 'gcc', 'clang', 'make', 'cmake'
    ];

    const suspiciousProcs = processes.list.filter(p => {
      const name = (p.name + ' ' + (p.command || '')).toLowerCase();
      
      // macOS system process? Skip
      if (macosSystemProcs.some(s => name.includes(s))) return false;
      
      // Strict word boundary match to avoid false positives
      return suspiciousKeywords.some(k => {
        const regex = new RegExp(`(^|[\\s/])${k}([\\s$]|$)`, 'i');
        return regex.test(name);
      });
    });

    const highCpuProcs = processes.list.filter(p =>
      p.cpu > 80 &&
      p.pid > 1000 &&
      !legitimateProcs.some(s => p.name?.toLowerCase().includes(s)) &&
      !macosSystemProcs.some(s => p.name?.toLowerCase().includes(s))
    );

    for (const proc of suspiciousProcs) {
      if (!this.knownSuspiciousProcs.has(proc.pid)) {
        this.knownSuspiciousProcs.add(proc.pid);
        
        const aiResult = await this.brain.analyzeThreat({
          type: 'crypto_mining_suspected',
          process_name: proc.name,
          pid: proc.pid,
          cpu_usage: proc.cpu,
          command: proc.command
        });

        if (aiResult.is_threat) {
          this.saveThreat({
            type: 'crypto_mining',
            severity: aiResult.severity,
            message: `Crypto miner detected: ${proc.name}`,
            process_name: proc.name,
            pid: proc.pid,
            cpu_usage: proc.cpu,
            command: proc.command,
            ai_analysis: aiResult.analysis
          });

          if (aiResult.recommended_action === 'kill_process') {
            this.killProcess(proc.pid, proc.name);
          }
        }
      }
    }

    for (const proc of highCpuProcs) {
      if (!this.knownSuspiciousProcs.has(proc.pid)) {
        this.saveThreat({
          type: 'high_cpu_process',
          severity: 'medium',
          message: `High CPU usage: ${proc.name} (${proc.cpu}%)`,
          process_name: proc.name,
          pid: proc.pid,
          cpu_usage: proc.cpu
        });
      }
    }
  }

  async checkBruteForce() {
    try {
      const authLog = require('child_process')
        .execSync('tail -100 /var/log/auth.log 2>/dev/null || echo ""')
        .toString();
      
      const failedAttempts = authLog.match(/Failed password/g) || [];
      
      if (failedAttempts.length > 10) {
        const ips = {};
        authLog.match(/from (\d+\.\d+\.\d+\.\d+)/g)?.forEach(match => {
          const ip = match.replace('from ', '');
          ips[ip] = (ips[ip] || 0) + 1;
        });

        for (const [ip, count] of Object.entries(ips)) {
          if (count > 5) {
            const aiResult = await this.brain.analyzeThreat({
              type: 'brute_force_suspected',
              attacker_ip: ip,
              failed_attempts: count
            });

            if (aiResult.is_threat && !BlockedIP.has(ip)) {
              this.saveThreat({
                type: 'brute_force',
                severity: aiResult.severity,
                message: `Brute force attack from ${ip} (${count} attempts)`,
                attacker_ip: ip,
                failed_attempts: count,
                ai_analysis: aiResult.analysis
              });

              if (aiResult.recommended_action === 'block_ip') {
                BlockedIP.add(ip, this.config.whitelist_ips);
                logger.warn(`Blocked IP: ${ip} due to brute force`);
              }
            }
          }
        }
      }
    } catch (e) {
      logger.error(`checkBruteForce error: ${e.message}`);
    }
  }

  async checkDDoS() {
    try {
      const [connections, { rx_per_sec }] = await Promise.all([
        si.networkConnections(),
        this.getNetworkSpeed()  // actual per-second speed
      ]);
      
      // 100 MB/s threshold for DDoS
      if (connections.length > 1000 || rx_per_sec > 100_000_000) {
        const aiResult = await this.brain.analyzeThreat({
          type: 'ddos_suspected',
          connection_count: connections.length,
          rx_bytes_sec: rx_per_sec  // actual speed, not cumulative
        });

        if (aiResult.is_threat) {
          this.saveThreat({
            type: 'ddos',
            severity: 'critical',
            message: `Potential DDoS: ${connections.length} connections, ${(rx_per_sec / 1_000_000).toFixed(1)} MB/s`,
            connection_count: connections.length,
            rx_bytes_sec: rx_per_sec,
            ai_analysis: aiResult.analysis
          });
        }
      }
    } catch (e) {
      logger.error(`checkDDoS error: ${e.message}`);
    }
  }

  async deepScan() {
    const ScannerService = require('./ScannerService');
    const scanner = new ScannerService(this.config);
    return scanner.fullScan(true);
  }

  async updateBaseline() {
    try {
      const [cpu, mem] = await Promise.all([
        si.currentLoad(),
        si.mem()
      ]);

      // Cross-platform memory calculation
      const actualUsed = mem.available !== undefined 
        ? mem.total - mem.available 
        : mem.used;

      Memory.updateBaseline({
        cpu_avg: Math.round(cpu.currentLoad),
        ram_avg: Math.round((actualUsed / mem.total) * 100),
        last_updated: new Date().toISOString()
      });
    } catch (e) {
      logger.error(`updateBaseline error: ${e.message}`);
    }
  }

  async processAutoScanResults(results) {
    for (const result of results) {
      if (!result || result.status === 'clean' || result.status === 'skipped') continue;

      const isThreat = result.status === 'threat';
      const isWarning = result.status === 'warning';

      if ((isThreat || isWarning) && result.findings?.length > 0) {
        // AI se analyze karwao
        const aiResult = await this.brain.analyzeThreat({
          type: `scan_${result.module}`,
          module: result.module,
          findings: result.findings,
          status: result.status
        });

        if (aiResult.is_threat) {
          this.saveThreat({
            type: result.module,
            severity: isThreat ? aiResult.severity : 'low',
            message: result.message,
            findings: result.findings,
            ai_analysis: aiResult.analysis,
            source: 'auto_scan'
          });
        }
      }
    }
  }

  saveThreat(threatData) {
    const threat = Threat.save(threatData);
    Memory.addThreat(threat);
    this.recentEvents.push(threat);
    if (this.recentEvents.length > 100) this.recentEvents = this.recentEvents.slice(-100);
    logger.warn(`Threat detected: ${threat.type} - ${threat.message}`);
    return threat;
  }

  killProcess(pid, name) {
    try {
      require('child_process').execSync(`kill -9 ${pid} 2>/dev/null || true`);
      logger.warn(`Killed process ${name} (PID: ${pid})`);
    } catch (e) {
      logger.error(`Failed to kill process ${pid}: ${e.message}`);
    }
  }

  getRecentEvents(limit = 20) {
    return this.recentEvents.slice(-limit).reverse();
  }
}

module.exports = MonitorService;
