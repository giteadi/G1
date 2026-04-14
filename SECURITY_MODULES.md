# G1 Guardian - Production Security Modules

🔥 **Scan → Identify → Resolve** workflow with **Level 1/2/3** severity classification

## Security Levels
- **Level 1** (Normal): Low risk, logged only
- **Level 2** (Warning): Suspicious activity, requires attention
- **Level 3** (Attack): Critical threat, auto-resolve recommended

---

## API Endpoints

### Master Scan
```
GET /api/security/scan
```
Runs all security modules and returns consolidated report.

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00Z",
  "summary": {
    "threats": 2,
    "warnings": 3,
    "normal": 10,
    "total_risk_score": 35
  },
  "threats": [...],
  "warnings": [...],
  "details": [...]
}
```

### Individual Module Scans

| Module | Endpoint | Level Detection |
|--------|----------|-----------------|
| Crypto Miner | `GET /api/security/scan/crypto` | CPU > 80% + unknown process = L3 |
| Brute Force | `GET /api/security/scan/brute-force` | >10 attempts = L3, >5 = L2 |
| DDoS Guard | `GET /api/security/scan/ddos` | >100 conn/IP = L3, >50 = L2 |
| Rootkit | `GET /api/security/scan/rootkit` | Infected = L3 |
| Cron | `GET /api/security/scan/cron` | Backdoor pattern = L3 |
| Open Ports | `GET /api/security/scan/ports` | Dangerous port = L3 |
| SSH Config | `GET /api/security/scan/ssh` | Root login = L3 |
| Privacy | `GET /api/security/scan/privacy` | Unauthorized access = L2 |
| Dark Web/C2 | `GET /api/security/scan/darkweb` | C2 port = L3, TOR = L2 |
| System Monitor | `GET /api/security/scan/system` | CPU/RAM > 90% = L3 |

### Resolve Endpoints

#### Crypto Miner
```
POST /api/security/resolve/crypto
{
  "pid": 1234,
  "process": "xmrig"
}
```
**Actions:** `pkill xmrig`, `kill -9 1234`, `rm -f /usr/local/bin/xmrig`

#### Brute Force
```
POST /api/security/resolve/brute-force
{
  "ip": "192.168.1.100"
}
```
**Actions:** `ufw deny from 192.168.1.100`, `iptables -A INPUT -s 192.168.1.100 -j DROP`, `systemctl restart fail2ban`

#### DDoS
```
POST /api/security/resolve/ddos
{
  "ip": "10.0.0.50"  // optional
}
```
**Actions:** `ufw limit 80/tcp`, `iptables -A INPUT -s <ip> -j DROP`, connection limiting

#### Suspicious Cron
```
POST /api/security/resolve/cron
{
  "path": "/etc/cron.d/suspicious"  // optional
}
```
**Actions:** `crontab -r`, `rm -f <path>`

#### Open Port
```
POST /api/security/resolve/port
{
  "port": 4444,
  "pid": 5678  // optional
}
```
**Actions:** `ufw deny 4444`, `kill -9 5678`

#### SSH Hardening
```
POST /api/security/resolve/ssh
```
**Actions:** Disable root login, disable password auth, restart SSH

#### Dark Web/C2
```
POST /api/security/resolve/darkweb
{
  "ip": "185.220.101.5",
  "pid": 9999  // optional
}
```
**Actions:** `iptables -A OUTPUT -d 185.220.101.5 -j DROP`, `ufw deny out to 185.220.101.5`, `kill -9 9999`

### Auto-Resolve All Threats
```
POST /api/security/resolve/all?force=true
```
Automatically resolves:
- Level 3 (Attack) threats: Always
- Level 2 (Warning): Only if `force=true`

---

## Module Details

### 1. CRYPTO MINER 🔥

**Scan Commands:**
```bash
ps aux --sort=-%cpu | head -10
ps aux | grep -E "xmrig|minerd"
```

**Identify:**
- CPU 80-100%
- Unknown process (not in whitelist)
- Background running (PID > 1000)
- Known miner signatures: xmrig, minerd, cpuminer, cgminer, ethminer

**Resolve:**
```bash
pkill xmrig
kill -9 PID
rm -f /usr/local/bin/xmrig
```

**Level Assignment:**
- L3: Signature match OR (CPU > 80% + unknown process)
- L2: High CPU only
- L1: Known legitimate process

---

### 2. BRUTE FORCE 🛡️

**Scan Command:**
```bash
grep "Failed password" /var/log/auth.log
```

**Identify:**
- Same IP multiple attempts
- Rapid login tries (>5 in short window)

**Resolve:**
```bash
ufw deny from <IP>
iptables -A INPUT -s <IP> -j DROP
sudo systemctl restart fail2ban
```

**Level Assignment:**
- L3: ≥ 10 failed attempts
- L2: 5-9 failed attempts
- L1: < 5 attempts

---

### 3. DDOS GUARD ⚡

**Scan Command:**
```bash
netstat -an | grep :80 | wc -l
ss -tulnp
```

**Identify:**
- Too many connections (>50 from single IP)
- Same IP flood (>100 connections)
- Overall connection flood (>1000 total)

**Resolve:**
```bash
ufw limit 80/tcp
ufw limit 443/tcp
iptables -A INPUT -s <IP> -j DROP
iptables -A INPUT -p tcp --dport 80 -m connlimit --connlimit-above 20 -j DROP
```

**Level Assignment:**
- L3: ≥ 100 connections from single IP OR total > 1000
- L2: 50-99 connections from single IP
- L1: Normal traffic patterns

---

### 4. ROOTKIT SCAN 💀

**Scan Commands:**
```bash
sudo chkrootkit
sudo rkhunter --check
```

**Identify:**
- Hidden binaries
- System file tampering
- INFECTED or Warning in output

**Resolve:**
```bash
apt install chkrootkit rkhunter -y
rkhunter --update
rkhunter --check --sk
```

**⚠️ SEVERE CASE:** Backup data → Reinstall OS

**Level Assignment:**
- L3: Any infection detected (CRITICAL)

---

### 5. SUSPICIOUS CRONS ⏰

**Scan Commands:**
```bash
crontab -l
ls /etc/cron.*
cat /etc/crontab
```

**Identify:**
- Unknown scripts in cron
- Auto-running malware patterns:
  - `wget | bash`
  - `curl | bash`
  - `base64 -d`
  - `/dev/tcp/`

**Resolve:**
```bash
crontab -e    # Remove suspicious entries
crontab -r    # Clear user crontab if compromised
rm -f /path/to/suspicious.sh
```

**Level Assignment:**
- L3: Any backdoor pattern detected

---

### 6. OPEN PORTS 🔌

**Scan Command:**
```bash
ss -tulnp
```

**Identify:**
- Unknown port open
- Dangerous ports: 23, 21, 3389, 5900, 4444, 5555, 6666
- Unexpected service running

**Resolve:**
```bash
ufw deny PORT
kill -9 PID
systemctl stop SERVICE
```

**Level Assignment:**
- L3: Dangerous port open (telnet, RDP, known malware ports)
- L2: Unknown/unexpected port
- L1: Common service ports

---

### 7. SSH CONFIG HARDENING 🔑

**Scan Command:**
```bash
cat /etc/ssh/sshd_config
```

**Identify:**
- Root login enabled (`PermitRootLogin yes`)
- Password authentication enabled
- No max auth tries set
- No key auth requirement

**Resolve:**
```bash
echo "PermitRootLogin no" >> /etc/ssh/sshd_config
echo "PasswordAuthentication no" >> /etc/ssh/sshd_config
echo "MaxAuthTries 3" >> /etc/ssh/sshd_config
sudo systemctl restart sshd
```

**Level Assignment:**
- L3: Root login enabled (CRITICAL)
- L2: Multiple weak settings

---

### 8. PRIVACY LEAKS 🎥

**Scan Command:**
```bash
lsof | grep -i "camera\|mic\|audio\|video"
```

**Identify:**
- Camera/mic access by unknown process
- Local system device access
- Suspicious process with media access

**Resolve:**
```bash
kill -9 PID
tccutil reset Camera "PROCESS"
tccutil reset Microphone "PROCESS"
```

**Level Assignment:**
- L2: Unauthorized device access

---

### 9. DARK WEB / C2 TRAFFIC 🌑

**Scan Command:**
```bash
netstat -tunap
ss -tulnp
```

**Identify:**
- Unknown foreign IP connections
- TOR ports: 9050, 9051, 9150, 9001, 9030
- C2 ports: 4444, 4445, 1337, 31337, 6666, 6667

**Resolve:**
```bash
iptables -A OUTPUT -d IP -j DROP
ufw deny out to IP
kill -9 PID
```

**Level Assignment:**
- L3: C2 port connection OR known bad IP
- L2: TOR traffic detected

---

### 10. SYSTEM MONITOR ⚙️

**Scan Commands:**
```bash
top
htop
```

**Monitors:**
- CPU usage
- Memory usage
- System load

**Level Assignment:**
- L3: CPU > 90% OR Memory > 90%
- L2: CPU > 70% OR Memory > 70%
- L1: Normal usage

---

## MASTER LOGIC 🧠

```
Scan →
  Check whitelist →
    If whitelisted → Ignore (Level 1)
    Else →
      Analyze behavior →
        If suspicious →
          Assign Level (1/2/3) →
          If Level 2 → Alert
          If Level 3 → Isolate + Kill/Block
        Else →
          Ignore
```

---

## Integration with Existing System

The SecurityModules integrate seamlessly with G1 Guardian's existing infrastructure:

- **Threats** are saved to the database via `Threat.save()`
- **WhatsApp alerts** sent for Level 3 threats
- **Auto-remediation** available via `auto_remediate` config
- **Protection status** tracked in protection history

---

## Configuration

Add to `~/.g1/config.json`:

```json
{
  "auto_remediate": true,
  "whitelist_ips": ["192.168.1.0/24", "10.0.0.0/8"],
  "crypto_detector": true,
  "ddos_guard": true,
  "brute_force_protection": true
}
```

---

**🔥 G1 Guardian = Real Security Engine**
