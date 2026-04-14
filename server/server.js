'use strict';

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
      const [cpu, mem, net, cpuInfo] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.networkStats(),
        si.cpu()
      ]);

      socket.emit('metrics', {
        cpu: Math.round(cpu.currentLoad),
        cpu_cores: cpuInfo.cores || 8,
        ram: Math.round((mem.used / mem.total) * 100),
        ram_used_gb: (mem.used / 1073741824).toFixed(1),
        ram_total_gb: (mem.total / 1073741824).toFixed(1),
        net_rx: net[0]?.rx_bytes || 0,
        net_tx: net[0]?.tx_bytes || 0,
        blocked_count: BlockedIP.size(),
        timestamp: Date.now()
      });
    } catch (e) {}
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
