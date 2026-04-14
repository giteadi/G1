#!/usr/bin/env node
'use strict';

const { loadConfig } = require('./config');
const BrainService = require('./services/BrainService');

async function testBrain() {
  console.log('Testing G1 Brain with OpenAI API...\n');
  
  const config = loadConfig();
  
  if (!config.openai_key) {
    console.error('❌ ERROR: OpenAI API key not found!');
    process.exit(1);
  }
  
  console.log('✅ API Key found');
  console.log(`🔑 Key: ${config.openai_key.substring(0, 20)}...${config.openai_key.substring(config.openai_key.length - 4)}`);
  console.log(`🤖 Model: ${config.model}\n`);
  
  const brain = new BrainService(config);
  
  // Test threat analysis
  console.log('Testing threat analysis...');
  const testThreat = {
    type: 'test_threat',
    process_name: 'xmrig',
    pid: 12345,
    cpu_usage: 95,
    command: './xmrig --url pool.minexmr.com'
  };
  
  try {
    const result = await brain.analyzeThreat(testThreat);
    console.log('\n✅ AI Response received!');
    console.log(`   Is Threat: ${result.is_threat}`);
    console.log(`   Severity: ${result.severity}`);
    console.log(`   Confidence: ${result.confidence}`);
    console.log(`   Action: ${result.recommended_action}`);
    console.log(`\n   Analysis:\n${result.analysis.substring(0, 200)}...\n`);
    
    // Test chat
    console.log('Testing chat...');
    const chatReply = await brain.chat('Is my server secure?');
    console.log('\n✅ Chat response received!');
    console.log(`   Reply: ${chatReply.substring(0, 150)}...\n`);
    
    console.log('🎉 All tests passed! Brain is working correctly.');
  } catch (e) {
    console.error(`\n❌ Test failed: ${e.message}`);
    process.exit(1);
  }
}

testBrain();
