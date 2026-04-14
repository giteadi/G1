-- G1 Guardian Database Schema
-- Self-learning AI Security System

CREATE DATABASE IF NOT EXISTS g1_guardian;
USE g1_guardian;

-- Threats table - stores all detected threats
CREATE TABLE IF NOT EXISTS threats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- crypto_miner, brute_force, ddos, malware, phishing, etc.
    severity ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium',
    message TEXT,
    process_name VARCHAR(255),
    pid INT,
    cpu_usage FLOAT,
    command TEXT,
    attacker_ip VARCHAR(45),
    target_port INT,
    details JSON,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    cleaned BOOLEAN DEFAULT FALSE,
    cleaned_at DATETIME,
    ai_analysis TEXT,
    ai_confidence FLOAT,
    recommended_action VARCHAR(50),
    INDEX idx_timestamp (timestamp),
    INDEX idx_type (type),
    INDEX idx_severity (severity),
    INDEX idx_attacker_ip (attacker_ip)
);

-- Blocked IPs table
CREATE TABLE IF NOT EXISTS blocked_ips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip VARCHAR(45) NOT NULL UNIQUE,
    reason TEXT,
    blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    threat_count INT DEFAULT 1,
    country VARCHAR(100),
    isp VARCHAR(255),
    INDEX idx_ip (ip),
    INDEX idx_blocked_at (blocked_at)
);

-- Memory/Context table - for AI learning
CREATE TABLE IF NOT EXISTS memory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('conversation', 'pattern', 'baseline', 'learning') DEFAULT 'conversation',
    role VARCHAR(20), -- user, assistant, system
    content TEXT,
    context JSON, -- additional context data
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    importance_score FLOAT DEFAULT 0.5,
    INDEX idx_type (type),
    INDEX idx_timestamp (timestamp)
);

-- System metrics history
CREATE TABLE IF NOT EXISTS metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cpu_usage FLOAT,
    ram_usage FLOAT,
    ram_used_gb FLOAT,
    ram_total_gb FLOAT,
    net_rx BIGINT,
    net_tx BIGINT,
    active_connections INT,
    blocked_attempts INT DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp)
);

-- Attack patterns for AI learning
CREATE TABLE IF NOT EXISTS attack_patterns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pattern_type VARCHAR(50),
    signature VARCHAR(255), -- unique signature of attack
    indicators JSON, -- JSON array of indicators
    frequency INT DEFAULT 1,
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    severity ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium',
    ai_learned BOOLEAN DEFAULT FALSE,
    prevention_action VARCHAR(100),
    UNIQUE KEY unique_signature (signature)
);

-- Whitelist table
CREATE TABLE IF NOT EXISTS whitelist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip VARCHAR(45) NOT NULL UNIQUE,
    description TEXT,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    added_by VARCHAR(100)
);

-- AI Learning log
CREATE TABLE IF NOT EXISTS ai_learning (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(50),
    input_data JSON,
    ai_response TEXT,
    action_taken VARCHAR(100),
    success BOOLEAN,
    feedback_score FLOAT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_event_type (event_type),
    INDEX idx_timestamp (timestamp)
);

-- Insert default data
INSERT INTO whitelist (ip, description, added_by) VALUES 
    ('127.0.0.1', 'Localhost', 'system'),
    ('::1', 'IPv6 Localhost', 'system')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Create views for analytics
CREATE OR REPLACE VIEW threat_summary AS
SELECT 
    DATE(timestamp) as date,
    type,
    severity,
    COUNT(*) as count,
    SUM(CASE WHEN cleaned THEN 1 ELSE 0 END) as cleaned_count
FROM threats
GROUP BY DATE(timestamp), type, severity;

CREATE OR REPLACE VIEW daily_stats AS
SELECT 
    DATE(timestamp) as date,
    AVG(cpu_usage) as avg_cpu,
    AVG(ram_usage) as avg_ram,
    SUM(blocked_attempts) as total_blocked
FROM metrics
GROUP BY DATE(timestamp);
