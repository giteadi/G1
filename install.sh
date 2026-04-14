#!/bin/bash

# G1 Guardian - One-Click Installation Script
# Supports: Ubuntu, Debian, CentOS, macOS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Banner
echo -e "${GREEN}"
cat << "EOF"
   _____ __    _____                     _ _             
  / ____|_ |  / ____|                   | (_)            
 | |  __ | | | |  __ _   _  __ _ _ __ __| |_  __ _ _ __  
 | | |_ || | | | |_ | | | |/ _` | '__/ _` | |/ _` | '_ \ 
 | |__| || | | |__| | |_| | (_| | | | (_| | | (_| | | | |
  \_____||_|  \_____|\__,_|\__,_|_|  \__,_|_|\__,_|_| |_|
                                                          
  AI-Powered Security Guardian - Installation Script
EOF
echo -e "${NC}"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   log_warning "Running as root. This is recommended for production."
else
   log_info "Running as non-root user. Some features may require sudo."
fi

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            OS=$ID
            VER=$VERSION_ID
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        VER=$(sw_vers -productVersion)
    else
        log_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
    
    log_info "Detected OS: $OS $VER"
}

# Check Node.js installation
check_nodejs() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -ge 18 ]; then
            log_success "Node.js $(node --version) is already installed"
            return 0
        else
            log_warning "Node.js version is too old. Upgrading..."
        fi
    fi
    return 1
}

# Install Node.js
install_nodejs() {
    log_info "Installing Node.js 20.x LTS..."
    
    case $OS in
        ubuntu|debian)
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        centos|rhel|fedora)
            curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
            sudo yum install -y nodejs
            ;;
        macos)
            if ! command -v brew &> /dev/null; then
                log_error "Homebrew not found. Please install from https://brew.sh"
                exit 1
            fi
            brew install node@20
            ;;
        *)
            log_error "Unsupported OS for automatic Node.js installation"
            exit 1
            ;;
    esac
    
    log_success "Node.js installed: $(node --version)"
}

# Install system dependencies
install_dependencies() {
    log_info "Installing system dependencies..."
    
    case $OS in
        ubuntu|debian)
            sudo apt-get update
            sudo apt-get install -y git curl wget build-essential
            ;;
        centos|rhel|fedora)
            sudo yum install -y git curl wget gcc-c++ make
            ;;
        macos)
            # Xcode command line tools
            xcode-select --install 2>/dev/null || true
            ;;
    esac
    
    log_success "System dependencies installed"
}

# Clone repository
clone_repo() {
    INSTALL_DIR="/opt/g1-guardian"
    
    log_info "Cloning G1 Guardian repository..."
    
    if [ -d "$INSTALL_DIR" ]; then
        log_warning "Installation directory already exists. Updating..."
        cd "$INSTALL_DIR"
        git pull origin main
    else
        sudo mkdir -p /opt
        sudo git clone https://github.com/your-repo/g1-guardian.git "$INSTALL_DIR"
        sudo chown -R $USER:$USER "$INSTALL_DIR"
    fi
    
    cd "$INSTALL_DIR"
    log_success "Repository cloned to $INSTALL_DIR"
}

# Install npm dependencies
install_npm_deps() {
    log_info "Installing npm dependencies..."
    
    cd "$INSTALL_DIR/server"
    npm install --production
    
    cd "$INSTALL_DIR/client"
    npm install
    npm run build
    
    log_success "Dependencies installed"
}

# Configure environment
configure_env() {
    log_info "Configuring environment..."
    
    cd "$INSTALL_DIR/server"
    
    if [ ! -f .env ]; then
        cat > .env << EOF
# OpenAI Configuration (Required)
OPENAI_API_KEY=
OPENAI_PROJECT_ID=

# Server Configuration
PORT=3000
NODE_ENV=production

# WhatsApp Notifications (Optional)
WHATSAPP_API_URL=
WHATSAPP_API_KEY=
WHATSAPP_PHONE=

# Email Alerts (Optional)
ALERT_EMAIL=

# Slack Webhook (Optional)
SLACK_WEBHOOK=
EOF
        log_warning "Created .env file. Please edit $INSTALL_DIR/server/.env with your API keys"
    else
        log_info ".env file already exists"
    fi
}

# Setup systemd service (Linux)
setup_systemd() {
    if [[ "$OS" != "macos" ]]; then
        log_info "Setting up systemd service..."
        
        sudo tee /etc/systemd/system/g1-guardian.service > /dev/null << EOF
[Unit]
Description=G1 Guardian Security System
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/server
ExecStart=$(which node) server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=g1-guardian
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
        
        sudo systemctl daemon-reload
        sudo systemctl enable g1-guardian
        
        log_success "Systemd service created"
    fi
}

# Setup launchd service (macOS)
setup_launchd() {
    if [[ "$OS" == "macos" ]]; then
        log_info "Setting up launchd service..."
        
        sudo tee /Library/LaunchDaemons/com.g1guardian.plist > /dev/null << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.g1guardian</string>
    <key>ProgramArguments</key>
    <array>
        <string>$(which node)</string>
        <string>$INSTALL_DIR/server/server.js</string>
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
EOF
        
        sudo launchctl load /Library/LaunchDaemons/com.g1guardian.plist
        
        log_success "Launchd service created"
    fi
}

# Start service
start_service() {
    log_info "Starting G1 Guardian..."
    
    if [[ "$OS" == "macos" ]]; then
        sudo launchctl start com.g1guardian
    else
        sudo systemctl start g1-guardian
    fi
    
    sleep 3
    
    # Check if service is running
    if curl -s http://localhost:3000/api/status > /dev/null; then
        log_success "G1 Guardian is running!"
    else
        log_warning "Service started but not responding yet. Check logs."
    fi
}

# Print completion message
print_completion() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                            ║${NC}"
    echo -e "${GREEN}║  ✅  G1 Guardian Installation Complete!                    ║${NC}"
    echo -e "${GREEN}║                                                            ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}📊 Dashboard:${NC} http://localhost:3000"
    echo -e "${BLUE}📁 Installation:${NC} $INSTALL_DIR"
    echo -e "${BLUE}⚙️  Configuration:${NC} $INSTALL_DIR/server/.env"
    echo ""
    echo -e "${YELLOW}⚠️  Next Steps:${NC}"
    echo "   1. Edit configuration: nano $INSTALL_DIR/server/.env"
    echo "   2. Add your OpenAI API key"
    echo "   3. Restart service: sudo systemctl restart g1-guardian"
    echo ""
    echo -e "${BLUE}📖 Documentation:${NC} $INSTALL_DIR/INSTALLATION.md"
    echo -e "${BLUE}🔍 View logs:${NC} sudo journalctl -u g1-guardian -f"
    echo -e "${BLUE}🛑 Stop service:${NC} sudo systemctl stop g1-guardian"
    echo ""
}

# Main installation flow
main() {
    log_info "Starting G1 Guardian installation..."
    
    detect_os
    
    if ! check_nodejs; then
        install_nodejs
    fi
    
    install_dependencies
    clone_repo
    install_npm_deps
    configure_env
    
    if [[ "$OS" == "macos" ]]; then
        setup_launchd
    else
        setup_systemd
    fi
    
    start_service
    print_completion
}

# Run installation
main
