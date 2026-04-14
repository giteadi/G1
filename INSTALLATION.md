# G1 Guardian - Installation Guide

Complete step-by-step installation guide for Linux, macOS, and Windows.

---

## 📋 System Requirements

### Minimum Requirements
- **OS**: Linux (Ubuntu 20.04+, CentOS 8+), macOS 11+, Windows 10/11 (WSL2)
- **RAM**: 2 GB minimum, 4 GB recommended
- **CPU**: 2 cores minimum
- **Disk**: 500 MB free space
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Supported Operating Systems
- ✅ Ubuntu 20.04, 22.04, 24.04
- ✅ Debian 11, 12
- ✅ CentOS 8, 9
- ✅ macOS 11 (Big Sur) and above
- ✅ Windows 10/11 (via WSL2)

---

## 🚀 Quick Install (Recommended)

### One-Line Install Script

```bash
curl -fsSL https://raw.githubusercontent.com/your-repo/g1-guardian/main/install.sh | bash
```

Or with wget:
```bash
wget -qO- https://raw.githubusercontent.com/your-repo/g1-guardian/main/install.sh | bash
```

---

## 📦 Manual Installation

### Step 1: Install Node.js

#### Ubuntu/Debian
```bash
# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show v10.x.x
```

#### CentOS/RHEL
```bash
# Install Node.js 20.x LTS
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Verify installation
node --version
npm --version
```

#### macOS
```bash
# Using Homebrew
brew install node@20

# Or download from nodejs.org
# https://nodejs.org/en/download/
```

#### Windows (WSL2)
```bash
# First install WSL2, then follow Ubuntu instructions
wsl --install
# Restart, then:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

### Step 2: Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-repo/g1-guardian.git
cd g1-guardian

# Or download ZIP
wget https://github.com/your-repo/g1-guardian/archive/main.zip
unzip main.zip
cd g1-guardian-main
```

---

### Step 3: Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install

# Return to root
cd ..
```

---

### Step 4: Configuration

#### Create Environment File

```bash
# Copy example config
cp server/.env.example server/.env

# Edit configuration
nano server/.env
```

#### Required Configuration

```bash
# OpenAI API Key (Required for AI analysis)
OPENAI_API_KEY=sk-proj-your-api-key-here
OPENAI_PROJECT_ID=your-project-id  # Optional

# Server Configuration
PORT=3000
NODE_ENV=production

# WhatsApp Notifications (Optional)
WHATSAPP_API_URL=https://api.whatsapp-service.com/send
WHATSAPP_API_KEY=your-whatsapp-api-key
WHATSAPP_PHONE=+919876543210

# Email Alerts (Optional)
ALERT_EMAIL=admin@yourdomain.com

# Slack Webhook (Optional)
SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

#### Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign up or log in
3. Click "Create new secret key"
4. Copy the key and paste in `.env` file

---

### Step 5: Build Frontend

```bash
cd client
npm run build
cd ..
```

---

### Step 6: Start G1 Guardian

#### Development Mode
```bash
# Terminal 1 - Start server
cd server
npm run dev

# Terminal 2 - Start client
cd client
npm run dev
```

#### Production Mode
```bash
cd server
npm start
```

Access dashboard at: **http://localhost:3000**

---

## 🔧 System Service Setup (Production)

### Linux (systemd)

Create service file:
```bash
sudo nano /etc/systemd/system/g1-guardian.service
```

Add content:
```ini
[Unit]
Description=G1 Guardian Security System
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/g1-guardian/server
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=g1-guardian
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
# Move installation to /opt
sudo mv g1-guardian /opt/

# Reload systemd
sudo systemctl daemon-reload

# Enable auto-start on boot
sudo systemctl enable g1-guardian

# Start service
sudo systemctl start g1-guardian

# Check status
sudo systemctl status g1-guardian

# View logs
sudo journalctl -u g1-guardian -f
```

### macOS (launchd)

Create plist file:
```bash
sudo nano /Library/LaunchDaemons/com.g1guardian.plist
```

Add content:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.g1guardian</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/opt/g1-guardian/server/server.js</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/var/log/g1-guardian.log</string>
    <key>StandardErrorPath</key>
    <string>/var/log/g1-guardian-error.log</string>
</dict>
</plist>
```

Load service:
```bash
sudo launchctl load /Library/LaunchDaemons/com.g1guardian.plist
sudo launchctl start com.g1guardian
```

---

## 🔐 Permissions Setup

### Linux

```bash
# G1 needs root access for system monitoring
# Option 1: Run as root (recommended for production)
sudo node server.js

# Option 2: Grant specific capabilities
sudo setcap cap_net_raw,cap_net_admin,cap_sys_admin+eip $(which node)
```

### macOS

```bash
# Grant Full Disk Access
# System Preferences → Security & Privacy → Privacy → Full Disk Access
# Add Terminal or your Node.js binary

# For firewall rules (pfctl)
sudo visudo
# Add: your_username ALL=(ALL) NOPASSWD: /sbin/pfctl
```

---

## 🌐 Reverse Proxy Setup (Optional)

### Nginx

```bash
sudo apt install nginx

sudo nano /etc/nginx/sites-available/g1-guardian
```

Add configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/g1-guardian /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 🧪 Verify Installation

```bash
# Check if service is running
curl http://localhost:3000/api/status

# Expected output:
# {"status":"active","uptime":123.45,"version":"1.0.0",...}

# Run test scan
curl -X POST http://localhost:3000/api/scan/run

# Check logs
tail -f ~/.g1/learning.log
```

---

## 📱 WhatsApp Setup (Optional)

### Using Twilio

1. Sign up at https://www.twilio.com/
2. Get WhatsApp-enabled number
3. Get API credentials
4. Update `.env`:

```bash
WHATSAPP_API_URL=https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json
WHATSAPP_API_KEY=YOUR_AUTH_TOKEN
WHATSAPP_PHONE=whatsapp:+14155238886  # Your Twilio number
```

### Using MessageBird

1. Sign up at https://messagebird.com/
2. Get API key
3. Update `.env`:

```bash
WHATSAPP_API_URL=https://conversations.messagebird.com/v1/send
WHATSAPP_API_KEY=YOUR_MESSAGEBIRD_API_KEY
WHATSAPP_PHONE=+919876543210
```

---

## 🔄 Update G1 Guardian

```bash
cd /opt/g1-guardian

# Pull latest changes
git pull origin main

# Update dependencies
cd server && npm install
cd ../client && npm install && npm run build

# Restart service
sudo systemctl restart g1-guardian
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process using port 3000
sudo lsof -i :3000
# Kill process
sudo kill -9 <PID>
```

### Permission Denied
```bash
# Run with sudo
sudo node server.js

# Or fix permissions
sudo chown -R $USER:$USER /opt/g1-guardian
```

### OpenAI API Errors
```bash
# Verify API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Service Won't Start
```bash
# Check logs
sudo journalctl -u g1-guardian -n 50

# Check Node.js version
node --version  # Must be v18+

# Reinstall dependencies
cd /opt/g1-guardian/server
rm -rf node_modules package-lock.json
npm install
```

---

## 📊 Default Credentials

- **Dashboard URL**: http://localhost:3000
- **No authentication required** (add auth in production!)

---

## 🔒 Security Recommendations

1. **Change default port** in production
2. **Enable firewall**:
   ```bash
   sudo ufw allow 3000/tcp
   sudo ufw enable
   ```
3. **Add authentication** (nginx basic auth or custom)
4. **Use HTTPS** in production
5. **Restrict dashboard access** to trusted IPs
6. **Regular updates**: `git pull && npm install`

---

## 📞 Support

- **Documentation**: https://github.com/your-repo/g1-guardian/wiki
- **Issues**: https://github.com/your-repo/g1-guardian/issues
- **Discord**: https://discord.gg/your-server

---

## 📝 License

MIT License - See LICENSE file for details
