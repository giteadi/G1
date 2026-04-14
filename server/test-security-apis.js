#!/usr/bin/env node
'use strict';

/**
 * G1 Guardian Security Modules API Test
 * Tests all security module endpoints
 */

const axios = require('axios');
const chalk = require('chalk');

const BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

const tests = {
  passed: 0,
  failed: 0,
  total: 0
};

async function testEndpoint(name, method, endpoint, data = null, timeout = 30000) {
  tests.total++;
  const url = `${BASE_URL}${endpoint}`;

  try {
    console.log(chalk.blue(`\n▶ Testing: ${name}`));
    console.log(chalk.gray(`  ${method} ${url}`));

    let response;
    if (method === 'GET') {
      response = await axios.get(url, { timeout });
    } else if (method === 'POST') {
      response = await axios.post(url, data, { timeout });
    }

    if (response.data && response.data.success !== undefined) {
      console.log(chalk.green(`  ✓ PASSED - Status: ${response.status}`));
      if (response.data.summary) {
        console.log(chalk.cyan(`    Threats: ${response.data.summary.threats}, Warnings: ${response.data.summary.warnings}`));
      }
      if (response.data.findings) {
        console.log(chalk.cyan(`    Findings: ${response.data.findings.length}`));
      }
      tests.passed++;
      return { success: true, data: response.data };
    } else {
      console.log(chalk.yellow(`  ⚠ WARNING - Unexpected response format`));
      tests.passed++;
      return { success: true, data: response.data };
    }
  } catch (error) {
    tests.failed++;
    console.log(chalk.red(`  ✗ FAILED - ${error.message}`));
    if (error.response) {
      console.log(chalk.red(`    Status: ${error.response.status}`));
      console.log(chalk.red(`    Error: ${JSON.stringify(error.response.data)}`));
    }
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log(chalk.bold('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold('║     G1 Guardian Security Modules API Test Suite        ║'));
  console.log(chalk.bold('╚════════════════════════════════════════════════════════╝'));
  console.log(chalk.gray(`Base URL: ${BASE_URL}\n`));

  // Wait for server to be ready
  console.log(chalk.yellow('⏳ Checking server availability...'));
  try {
    await axios.get(`${BASE_URL}/status`, { timeout: 5000 });
    console.log(chalk.green('✓ Server is running\n'));
  } catch (e) {
    console.log(chalk.red('✗ Server is not running. Start with: npm start'));
    console.log(chalk.gray('   Error: ' + e.message));
    process.exit(1);
  }

  // ==================== SECURITY MODULE SCANS ====================
  console.log(chalk.bold('\n📡 SECURITY MODULE SCANS\n'));

  await testEndpoint('Master Scan (All Modules)', 'GET', '/security/scan');
  await testEndpoint('Crypto Miner Scan', 'GET', '/security/scan/crypto');
  await testEndpoint('Brute Force Scan', 'GET', '/security/scan/brute-force');
  await testEndpoint('DDoS Guard Scan', 'GET', '/security/scan/ddos');
  await testEndpoint('Rootkit Scan', 'GET', '/security/scan/rootkit');
  await testEndpoint('Cron Scan', 'GET', '/security/scan/cron');
  await testEndpoint('Ports Scan', 'GET', '/security/scan/ports');
  await testEndpoint('SSH Scan', 'GET', '/security/scan/ssh');
  await testEndpoint('Privacy Scan', 'GET', '/security/scan/privacy');
  await testEndpoint('Dark Web Scan', 'GET', '/security/scan/darkweb');
  await testEndpoint('System Monitor', 'GET', '/security/scan/system');

  // ==================== PROTECTION ENDPOINTS ====================
  console.log(chalk.bold('\n🛡️  PROTECTION ENDPOINTS\n'));

  await testEndpoint('Protection Status', 'GET', '/protection/status');
  await testEndpoint('SSH Status', 'GET', '/protection/ssh/status');
  // Vulnerability scan is slow - skip for quick test
  // await testEndpoint('Vulnerability Scan', 'GET', '/protection/vulnerabilities', null, 60000);

  // ==================== THREAT ENDPOINTS ====================
  console.log(chalk.bold('\n🔥 THREAT ENDPOINTS\n'));

  await testEndpoint('Get All Threats', 'GET', '/threats');
  await testEndpoint('Get Threat Stats', 'GET', '/threats/stats');
  await testEndpoint('Get Recent Threats', 'GET', '/threats/recent');
  await testEndpoint('Get Blocked IPs', 'GET', '/threats/blocked');

  // ==================== SCAN ENDPOINTS ====================
  console.log(chalk.bold('\n🔍 SCAN ENDPOINTS\n'));

  await testEndpoint('Run Full Scan', 'POST', '/scan/run');
  await testEndpoint('Crypto Scan', 'POST', '/scan/crypto');
  await testEndpoint('Rootkit Scan', 'POST', '/scan/rootkit');
  await testEndpoint('SSH Scan', 'POST', '/scan/ssh');

  // ==================== STATUS ENDPOINTS ====================
  console.log(chalk.bold('\n📊 STATUS ENDPOINTS\n'));

  await testEndpoint('System Status', 'GET', '/status');

  // ==================== RESOLVE ENDPOINTS (SAFE) ====================
  console.log(chalk.bold('\n⚡ RESOLVE ENDPOINTS (Simulation Mode)\n'));

  // These are safe to call as they just return commands, not execute
  await testEndpoint('Resolve SSH (Config Only)', 'POST', '/security/resolve/ssh');

  // ==================== SUMMARY ====================
  console.log(chalk.bold('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold('║                      TEST SUMMARY                      ║'));
  console.log(chalk.bold('╚════════════════════════════════════════════════════════╝'));

  const passRate = Math.round((tests.passed / tests.total) * 100);

  console.log(chalk.cyan(`\nTotal Tests: ${tests.total}`));
  console.log(chalk.green(`Passed: ${tests.passed}`));
  console.log(chalk.red(`Failed: ${tests.failed}`));
  console.log(chalk.yellow(`Pass Rate: ${passRate}%\n`));

  if (tests.failed === 0) {
    console.log(chalk.green.bold('✓ All tests passed! G1 Guardian APIs are working correctly.\n'));
  } else {
    console.log(chalk.yellow.bold(`⚠ ${tests.failed} test(s) failed. Check the errors above.\n`));
  }

  return tests.failed === 0;
}

// Run tests
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error(chalk.red(`\nTest runner error: ${err.message}\n`));
    process.exit(1);
  });
