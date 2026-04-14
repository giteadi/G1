# 🛡️ G1 Guardian - AI-Powered Security System

**G1 Guardian** is a living, self-learning security system that protects your server 24/7 using GPT-4o AI analysis. It automatically detects, analyzes, and responds to threats in real-time.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

---

## ✨ Features

### 🤖 AI-Powered Detection
- **GPT-4o Analysis**: Every threat analyzed by OpenAI's latest model
- **Self-Learning**: Learns from your server's attack patterns
- **Pattern Recognition**: Remembers and adapts to new threats
- **Threat Intel Integration**: Auto-updates from NVD, CISA, AlienVault OTX

### 🔍 Comprehensive Monitoring
- ✅ **Crypto Mining Detection**: CPU spikes, known miner processes
- ✅ **Brute Force Protection**: SSH/login attempt monitoring
- ✅ **DDoS Guard**: Traffic analysis and rate limiting
- ✅ **Malware Scanning**: Rootkit detection, file integrity
- ✅ **Privacy Leaks**: Mic/camera unauthorized access
- ✅ **Dark Web Traffic**: Tor/C2 connection detection
- ✅ **Phishing/Bot Detection**: Domain blocking, bot fingerprinting

### ⚡ Auto-Response System
- **Instant Action**: No human needed for critical threats
- **Smart Resolution**: Blocks IPs, kills processes, quarantines files
- **Firewall Integration**: iptables (Linux) + pfctl (macOS)
- **WhatsApp Alerts**: Real-time notifications on your phone
- **24/7 Active**: Runs continuously in background

### 📊 Beautiful Dashboard
- Real-time system metrics (CPU, RAM, Network)
- Threat timeline and analysis
- Learning rules visualization
- Manual scan controls
- One-click threat resolution

---

## 🚀 Quick Start

### One-Line Install

```bash
curl -fsSL https://raw.githubusercontent.com/your-repo/g1-guardian/main/install.sh | bash
```

### Manual Install

```bash
# Clone repository
git clone https://github.com/your-repo/g1-guardian.git
cd g1-guardian

# Install dependencies
cd server && npm install
cd ../client && npm install && npm run build

# Configure
cp server/.env.example server/.env
nano server/.env  # Add your OpenAI API key

# Start
cd server && npm start
```

**Dashboard**: http://localhost:3000

---

## 📖 Documentation

- [Installation Guide](INSTALLATION.md) - Complete setup instructions
- [Configuration](docs/CONFIGURATION.md) - All config options
- [API Reference](docs/API.md) - REST API documentation
- [Architecture](docs/ARCHITECTURE.md) - System design

---

## 🎯 Use Cases

### For Developers
- Protect development servers from crypto miners
- Monitor SSH brute force attempts
- Detect unauthorized access to resources

### For System Administrators
- 24/7 server monitoring without manual intervention
- Automated threat response
- Compliance with security standards

### For Security Teams
- Real-time threat intelligence
- Attack pattern analysis
- Incident response automation

---

## 🔧 Requirements

- **Node.js**: v18.0.0 or higher
- **RAM**: 2 GB minimum (4 GB recommended)
- **OS**: Linux, macOS, or Windows (WSL2)
- **OpenAI API Key**: Required for AI analysis

---

## 📸 Screenshots

### Dashboard
![Dashboard](docs/images/dashboard.png)

### Threat Analysis
![Threats](docs/images/threats.png)

### Protection Modules
![Protection](docs/images/protection.png)

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: React, Vite, TailwindCSS
- **AI**: OpenAI GPT-4o
- **Database**: JSON-based (no external DB required)
- **Monitoring**: systeminformation, node-cron

---

## 🔐 Security Features

| Feature | Description | Status |
|---------|-------------|--------|
| Crypto Mining Detection | Detects XMRig, Monero miners | ✅ Active |
| SSH Brute Force | Blocks after 5 failed attempts | ✅ Active |
| DDoS Protection | Rate limiting, connection monitoring | ✅ Active |
| Rootkit Detection | File integrity, hidden processes | ✅ Active |
| Privacy Leak Detection | Mic/camera unauthorized access | ✅ Active |
| Dark Web Traffic | Tor, C2 connection blocking | ✅ Active |
| Auto IP Blocking | iptables + pfctl integration | ✅ Active |
| WhatsApp Alerts | Real-time notifications | ✅ Active |

---

## 📊 Performance

- **CPU Usage**: < 5% idle, < 15% during scans
- **RAM Usage**: ~200 MB average
- **Scan Speed**: Full scan in < 30 seconds
- **Response Time**: < 1 second for critical threats

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Fork the repo
git clone https://github.com/your-username/g1-guardian.git

# Create feature branch
git checkout -b feature/amazing-feature

# Commit changes
git commit -m 'Add amazing feature'

# Push and create PR
git push origin feature/amazing-feature
```

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- OpenAI for GPT-4o API
- systeminformation library
- React and Vite teams
- Security research community

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/g1-guardian/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/g1-guardian/discussions)
- **Email**: support@g1guardian.com
- **Discord**: [Join our server](https://discord.gg/your-server)

---

## 🗺️ Roadmap

- [ ] Docker support
- [ ] Kubernetes integration
- [ ] Multi-server dashboard
- [ ] Mobile app (iOS/Android)
- [ ] Advanced ML models
- [ ] Cloud deployment (AWS, GCP, Azure)

---

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=your-repo/g1-guardian&type=Date)](https://star-history.com/#your-repo/g1-guardian&Date)

---

**Made with ❤️ by the G1 Guardian Team**

[Website](https://g1guardian.com) • [Documentation](https://docs.g1guardian.com) • [Blog](https://blog.g1guardian.com)
