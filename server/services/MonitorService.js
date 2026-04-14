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
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    logger.info('G1 Monitor started');

    // Monitor every 30 seconds
    cron.schedule('*/30 * * * * *', () => this.monitorCycle());

    // Deep scan every 5 minutes
    cron.schedule('*/5 * * * *', () => this.deepScan());

    // Hourly baseline update
    cron.schedule('0 * * * *', () => this.updateBaseline());
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

  async checkCryptoMining() {
    const [cpu, processes] = await Promise.all([
      si.currentLoad(),
      si.processes()
    ]);

    const suspiciousKeywords = [
      'xmrig', 'minergate', 'cryptonight', 'monero', 'coinhive',
      'cpuminer', 'cgminer', 'ethminer', 'nicehash', 'claymore',
      'minerd', 'cryptominer', 'coin-hive', 'kworkerds', 'sysupdate',
      'networkservice', 'watchbog'
    ];

    const suspiciousProcs = processes.list.filter(p => {
      const name = (p.name + ' ' + (p.command || '')).toLowerCase();
      return suspiciousKeywords.some(k => name.includes(k));
    });

    const highCpuProcs = processes.list.filter(p =>
      p.cpu > 80 && p.pid > 1000 &&
      !['node', 'python', 'java', 'nginx', 'apache', 'mysql', 'postgres'].some(s => p.name?.includes(s))
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
      const authLog = require('child_process').execSync('tail -100 /var/log/auth.log 2>/dev/null || echo ""').toString();
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
    } catch (e) {}
  }

  async checkDDoS() {
    try {
      const net = await si.networkStats();
      const connections = await si.networkConnections();
      
      if (connections.length > 1000 || net[0]?.rx_sec > 100000000) {
        const aiResult = await this.brain.analyzeThreat({
          type: 'ddos_suspected',
          connection_count: connections.length,
          rx_bytes_sec: net[0]?.rx_sec
        });

        if (aiResult.is_threat) {
          this.saveThreat({
            type: 'ddos',
            severity: 'critical',
            message: `Potential DDoS: ${connections.length} connections`,
            connection_count: connections.length,
            rx_bytes_sec: net[0]?.rx_sec,
            ai_analysis: aiResult.analysis
          });
        }
      }
    } catch (e) {}
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

      Memory.updateBaseline({
        cpu_avg: cpu.currentLoad,
        ram_avg: (mem.used / mem.total) * 100,
        last_updated: new Date().toISOString()
      });
    } catch (e) {}
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
