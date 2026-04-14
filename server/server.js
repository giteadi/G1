'use strict';

require('dotenv').config();

const http = require('http');
const socketio = require('socket.io');
const app = require('./app');
const { loadConfig } = require('./config');
const logger = require('./utils/logger');
const Threat = require('./models/Threat');
const BlockedIP = require('./models/BlockedIP');
const si = require('systeminformation');

const config = loadConfig();
const PORT = process.env.PORT || config.dashboard_port || 3000;

const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3001', 'http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST']
  }
});

// Network cache for socket.io metrics
let _socketNetCache = null;
let _socketNetTime = null;

async function getSocketNetworkSpeed() {
  const now = Date.now();
  const net = await si.networkStats();

  if (!_socketNetCache || !_socketNetTime || !net[0]) {
    _socketNetCache = net;
    _socketNetTime = now;
    return { rx_per_sec: 0, tx_per_sec: 0 };
  }

  const elapsed = Math.max(0.5, (now - _socketNetTime) / 1000);
  const rx_per_sec = Math.max(0, Math.round((net[0].rx_bytes - _socketNetCache[0].rx_bytes) / elapsed));
  const tx_per_sec = Math.max(0, Math.round((net[0].tx_bytes - _socketNetCache[0].tx_bytes) / elapsed));

  _socketNetCache = net;
  _socketNetTime = now;

  return { rx_per_sec, tx_per_sec };
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.emit('connected', { 
    message: 'G1 Guardian connected', 
    time: new Date().toISOString() 
  });

  // Send metrics every 2 seconds
  const metricsInterval = setInterval(async () => {
    try {
      const [cpu, mem, cpuInfo, netSpeed] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.cpu(),
        getSocketNetworkSpeed()
      ]);

      // Cross-platform memory calculation
      const actualUsed = mem.available !== undefined 
        ? mem.total - mem.available 
        : mem.used;
      const ramPercent = Math.round((actualUsed / mem.total) * 100);

      // Get actual threat count
      const threatStats = Threat.getStats();
      const activeThreats = threatStats.total || 0;

      socket.emit('metrics', {
        cpu: Math.round(cpu.currentLoad),
        cpu_cores: cpuInfo.cores || 8,
        ram: ramPercent,
        ram_used_gb: (actualUsed / 1073741824).toFixed(1),
        ram_total_gb: (mem.total / 1073741824).toFixed(1),
        net_rx: netSpeed.rx_per_sec,
        net_tx: netSpeed.tx_per_sec,
        threats: activeThreats,
        blocked_count: BlockedIP.size(),
        timestamp: Date.now()
      });
    } catch (e) {
      logger.error(`Socket metrics error: ${e.message}`);
    }
  }, 2000);

  // Handle scan request
  socket.on('run_scan', async () => {
    socket.emit('scan_started', { message: 'G1 scanning...' });
    
    const ScannerService = require('./services/ScannerService');
    const scanner = new ScannerService(config);
    
    try {
      const results = await scanner.fullScan(true);
      const threats = results.filter(r => r.status === 'threat');
      
      socket.emit('scan_complete', {
        message: 'Scan complete',
        issues: threats.length,
        results
      });
    } catch (e) {
      socket.emit('scan_error', { error: e.message });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    clearInterval(metricsInterval);
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  logger.info(`G1 Guardian Dashboard running on port ${PORT}`);
  
  // Start self-learning scheduler
  const LearningScheduler = require('./services/LearningScheduler');
  const scheduler = new LearningScheduler(config);
  scheduler.start();
  logger.info('G1 Self-Learning System started');
});

module.exports = { server, io };
