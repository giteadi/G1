#!/usr/bin/env node
'use strict';

/**
 * g1 learn — G1 ke self-learning ko control karne ke commands
 *
 * Usage:
 *   g1 learn status          — kitna seekha hai, kitni rules hain
 *   g1 learn rules           — saari learned rules dekho
 *   g1 learn update          — abhi intel update karo
 *   g1 learn audit           — weekly audit abhi karo
 *   g1 learn teach <event>   — manually G1 ko koi event sikhao
 *   g1 learn forget <id>     — ek rule hatao
 *   g1 learn queue           — unsure events queue dekho
 */

const chalk       = require('chalk');
const fs          = require('fs');
const path        = require('path');
const SelfLearner = require('../services/SelfLearner');

const CONFIG_PATH = path.join(process.env.HOME || '/root', '.g1', 'config.json');
const STATS_FILE  = path.join(process.env.HOME || '/root', '.g1', 'learning_stats.json');
const RULES_FILE  = path.join(process.env.HOME || '/root', '.g1', 'learned_rules.json');
const QUEUE_FILE  = path.join(process.env.HOME || '/root', '.g1', 'unsure_queue.json');
const LEARN_LOG   = path.join(process.env.HOME || '/root', '.g1', 'learning.log');

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch { console.log(chalk.red('G1 config nahi mila. Pehle `g1 config --key YOUR_KEY` karo.')); process.exit(1); }
}

const cmd = process.argv[2];

async function main() {
  switch (cmd) {

    case 'status': {
      const config = loadConfig();
      const learner = new SelfLearner(config);
      const s = learner.getStats();
      let stats = {};
      try { stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')); } catch {}

      console.log(chalk.cyan('\nG1 Learning Status\n'));
      console.log(chalk.bold('Rules database:'));
      console.log(`  Total rules     : ${chalk.green(s.total_rules)}`);
      console.log(`  Builtin (seed)  : ${chalk.blue(s.builtin)}`);
      console.log(`  GPT-learned     : ${chalk.yellow(s.gpt_learned)}`);
      console.log(`  Threat intel    : ${chalk.magenta(s.intel_learned)}`);
      console.log(chalk.bold('\nActivity:'));
      console.log(`  GPT calls today : ${chalk.yellow(s.gpt_calls_today)} / ${config.gpt_daily_limit || 100}`);
      console.log(`  Memory events   : ${chalk.blue(s.memory_events)}`);
      console.log(`  Intel updates   : ${chalk.green(stats.intel_updates || 0)}`);
      console.log(`  Last updated    : ${chalk.gray(stats.saved_at || 'never')}`);
      break;
    }

    case 'rules': {
      const filter = process.argv[3]; // optional: 'gpt' | 'intel' | 'builtin'
      let rules = [];
      try { rules = JSON.parse(fs.readFileSync(RULES_FILE, 'utf8')); } catch {}
      if (filter) rules = rules.filter(r => r.source === filter);

      console.log(chalk.cyan(`\nG1 Learned Rules${filter ? ' ('+filter+')' : ''} — ${rules.length} total\n`));
      rules.forEach(r => {
        const src = r.source === 'builtin' ? chalk.blue(r.source)
                  : r.source === 'gpt'     ? chalk.yellow(r.source)
                  : chalk.magenta(r.source);
        const sev = r.severity === 'critical' ? chalk.red(r.severity)
                  : r.severity === 'high'     ? chalk.yellow(r.severity)
                  : chalk.gray(r.severity || 'unknown');
        console.log(`  ${chalk.bold(r.id)}`);
        console.log(`    Name     : ${r.name}`);
        console.log(`    Source   : ${src}   Severity: ${sev}   Hits: ${r.hit_count || 0}`);
        console.log(`    Actions  : ${(r.action || []).join(', ')}`);
        console.log(`    Learned  : ${r.learned_at || 'builtin'}`);
        if (r.description) console.log(`    Desc     : ${chalk.gray(r.description.substring(0, 80))}`);
        console.log('');
      });
      break;
    }

    case 'update': {
      console.log(chalk.cyan('Fetching latest threat intelligence...'));
      const config  = loadConfig();
      const learner = new SelfLearner(config);
      const result  = await learner.fetchAndLearnThreatIntel();
      console.log(chalk.green(`Done! +${result.added} new rules. Total: ${result.total}`));
      break;
    }

    case 'audit': {
      console.log(chalk.cyan('Running self-audit (GPT reviewing all learned rules)...'));
      const config  = loadConfig();
      const learner = new SelfLearner(config);
      const audit   = await learner.selfAudit();
      if (audit) {
        console.log(chalk.green(`Audit complete:`));
        console.log(`  Kept   : ${audit.keep?.length || 0}`);
        console.log(`  Removed: ${chalk.red(audit.remove?.length || 0)}`);
        console.log(`  Updated: ${chalk.yellow(audit.modify?.length || 0)}`);
        if (audit.notes) console.log(`  Notes  : ${chalk.gray(audit.notes)}`);
      }
      break;
    }

    case 'teach': {
      // Manually ek event G1 ko sikhao
      // e.g.: node learn.js teach '{"type":"process","process_name":"evil_miner","cpu":95}'
      const eventRaw = process.argv[3];
      if (!eventRaw) {
        console.log(chalk.red('Usage: g1 learn teach \'{"type":"process","process_name":"xmrig","cpu":90}\''));
        break;
      }
      let event;
      try { event = JSON.parse(eventRaw); } catch { console.log(chalk.red('Invalid JSON')); break; }
      const config  = loadConfig();
      const learner = new SelfLearner(config);
      console.log(chalk.cyan('Teaching G1 this event...'));
      const result = await learner.evaluate(event);
      console.log(chalk.bold('\nG1 verdict:'));
      console.log(`  Matched : ${result.matched ? chalk.green('yes') : chalk.red('no')}`);
      console.log(`  Verdict : ${chalk.yellow(result.verdict)}`);
      console.log(`  Rule    : ${result.rule?.name || 'none'}`);
      console.log(`  Actions : ${(result.actions || []).join(', ')}`);
      break;
    }

    case 'forget': {
      const ruleId = process.argv[3];
      if (!ruleId) { console.log(chalk.red('Usage: g1 learn forget rule_id')); break; }
      let rules = [];
      try { rules = JSON.parse(fs.readFileSync(RULES_FILE, 'utf8')); } catch {}
      const before = rules.length;
      rules = rules.filter(r => r.id !== ruleId);
      fs.writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2));
      console.log(before > rules.length ? chalk.green(`Rule ${ruleId} removed.`) : chalk.yellow('Rule not found.'));
      break;
    }

    case 'queue': {
      let queue = [];
      try { queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8')); } catch {}
      console.log(chalk.cyan(`\nUnsure Queue — ${queue.length} events waiting for GPT review\n`));
      queue.slice(0, 10).forEach((q, i) => {
        console.log(`  ${i+1}. Type: ${chalk.yellow(q.event?.type)}   Queued: ${chalk.gray(q.queued_at)}`);
      });
      if (queue.length > 10) console.log(chalk.gray(`  ... and ${queue.length - 10} more`));
      console.log(chalk.gray('\nRun "g1 learn audit" to process queue now.'));
      break;
    }

    case 'log': {
      const lines = parseInt(process.argv[3]) || 30;
      try {
        const log = fs.readFileSync(LEARN_LOG, 'utf8').split('\n').slice(-lines);
        console.log(chalk.cyan(`\nLast ${lines} learning log entries:\n`));
        log.forEach(l => {
          if (l.includes('LEARNED')) console.log(chalk.green(l));
          else if (l.includes('error') || l.includes('ERROR')) console.log(chalk.red(l));
          else if (l.includes('UNKNOWN')) console.log(chalk.yellow(l));
          else console.log(chalk.gray(l));
        });
      } catch { console.log(chalk.yellow('No learning logs yet.')); }
      break;
    }

    default: {
      console.log(chalk.cyan('\nG1 Learning Commands:\n'));
      const cmds = [
        ['g1 learn status',        'Kitna seekha, kitni rules'],
        ['g1 learn rules',         'Saari rules dekho'],
        ['g1 learn rules gpt',     'Sirf GPT-learned rules'],
        ['g1 learn rules intel',   'Sirf threat-intel rules'],
        ['g1 learn update',        'Abhi internet se update karo'],
        ['g1 learn audit',         'GPT se rules review karwao'],
        ['g1 learn teach <json>',  'Manually koi event sikhao'],
        ['g1 learn forget <id>',   'Ek rule hatao'],
        ['g1 learn queue',         'Unsure events queue dekho'],
        ['g1 learn log',           'Learning activity log dekho'],
      ];
      cmds.forEach(([c, d]) => console.log(`  ${chalk.green(c.padEnd(30))} ${chalk.gray(d)}`));
    }
  }
}

main().catch(err => { console.log(chalk.red('Error:', err.message)); });
