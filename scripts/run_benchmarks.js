import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runValidationChecklist } from '../src/engine/Validator.js';
import { runSmartFix } from '../src/engine/Orchestrator.js';
import { PcfTopologyGraph2, applyApprovedMutations } from '../src/engine/PcfTopologyGraph2.js';
import { createLogger } from '../src/utils/Logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BM_FILE = path.join(__dirname, '../Docs/BM/PCF_Benchmark_Tests.json');
const results = { total: 0, passed: 0, failed: 0, details: [] };

function runBenchmarks() {
  console.log('═══ RUNNING PCF BENCHMARKS ═══\n');

  if (!fs.existsSync(BM_FILE)) {
    console.error(`Error: Benchmark file not found at ${BM_FILE}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(BM_FILE, 'utf8');
  const benchmarks = JSON.parse(rawData);

  // Focus on Group 2 / "smartfix" / "pte_case"
  const targetBenchmarks = benchmarks.filter(bm => bm.group === 'smartfix' || bm.group === 'pte_case');

  console.log(`Found ${targetBenchmarks.length} target benchmarks (Group: smartfix | pte_case).\n`);

  targetBenchmarks.forEach((bm) => {
    results.total++;
    const dataTable = bm.input.map((row, i) => ({ ...row, _rowIndex: i + 1 }));
    const logger = createLogger();

    const config = {
      smartFixer: {
        chainingStrategy: 'strict_sequential',
        connectionTolerance: 25.0,
        silentSnapThreshold: 2.0,
        warnSnapThreshold: 10.0,
      },
      pteMode: {
        lineKeyMode: false
      }
    };

    // Run Validation
    runValidationChecklist(dataTable, config, logger);

    // Run Engine
    if (bm.group === 'smartfix' && bm.rule && bm.rule.includes('GAP_')) {
      // PcfTopologyGraph2 mode testing for gap stretching vs snapping
       const { proposals } = PcfTopologyGraph2(dataTable, config, logger);
       const updated = applyApprovedMutations(dataTable, proposals, logger);
    } else {
       // Regular orchestrated smart fix
       runSmartFix(dataTable, config, logger);
    }

    const logs = logger.getLog();
    const passed = verifyBenchmark(bm, logs);

    if (passed) {
      results.passed++;
      console.log(`✅ [PASS] ${bm.id} - ${bm.description}`);
    } else {
      results.failed++;
      console.log(`❌ [FAIL] ${bm.id} - ${bm.description}`);
      console.log(`   Expected: ${JSON.stringify(bm.expected)}`);
      results.details.push({ id: bm.id, logs: logs });
    }
  });

  console.log('\n═══ SUMMARY ═══');
  console.log(`Total:  ${results.total}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);

  if (results.failed > 0) {
      process.exit(1);
  }
}

function verifyBenchmark(bm, logs) {
    if (!bm.expected) return true; // No expectations defined
    let passed = true;

    for (const key in bm.expected) {
        if (key === 'errorCount' || key === 'warningCount') {
             // simplified check for counts if they were parsed directly,
             // but here we check the logs array
             const errs = logs.filter(l => l.type === 'Error').length;
             const warns = logs.filter(l => l.type === 'Warning').length;
             if (key === 'errorCount' && errs !== bm.expected[key]) passed = false;
             if (key === 'warningCount' && warns !== bm.expected[key]) passed = false;
        } else if (key === 'logContains') {
             for (const text of bm.expected[key]) {
                  if (!logs.some(l => l.message && l.message.includes(text))) {
                       passed = false;
                  }
             }
        }
    }
    return passed;
}

runBenchmarks();
