#!/usr/bin/env tsx
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getFullMatrix, getCiSubset } from './matrix/ci-subset';
import { generateReport, saveReport } from './reporter';
import type { TestCase, WorkerReport } from './types';

const MODE = process.argv.includes('--mode=ci') ? 'ci' : 'full';
const WORKER_COUNT = parseInt(process.argv.find(a => a.startsWith('--workers='))?.split('=')[1] ?? '6', 10);
const SERVICE_FILTER = process.argv.find(a => a.startsWith('--service='))?.split('=')[1];
const CHAR_FILTER = process.argv.find(a => a.startsWith('--character='))?.split('=')[1];
const CASES_DIR = path.resolve('scripts/e2e-full/cases');
const RESULTS_DIR = path.resolve('scripts/e2e-full/results');

function chunkArray<T>(arr: T[], n: number): T[][] {
  return Array.from({ length: n }, (_, i) =>
    arr.filter((_, idx) => idx % n === i)
  ).filter(c => c.length > 0);
}

async function runWorker(workerId: number, casesFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const worker = spawn('pnpm', ['exec', 'tsx', 'scripts/e2e-full/worker.ts'], {
      env: { ...process.env, WORKER_ID: String(workerId), CASES_FILE: casesFile },
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    worker.on('close', code => code === 0 ? resolve() : reject(new Error(`Worker ${workerId} 종료 코드: ${code}`)));
  });
}

async function main() {
  fs.mkdirSync(CASES_DIR, { recursive: true });
  fs.rmSync(RESULTS_DIR, { recursive: true, force: true });
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  let cases: TestCase[] = MODE === 'ci' ? getCiSubset() : getFullMatrix();
  if (SERVICE_FILTER) cases = cases.filter(tc => tc.service === SERVICE_FILTER);
  if (CHAR_FILTER) cases = cases.filter(tc => tc.characterId === CHAR_FILTER);

  console.log(`모드: ${MODE} | 총 케이스: ${cases.length} | 워커: ${Math.min(WORKER_COUNT, cases.length)}`);

  const chunks = chunkArray(cases, Math.min(WORKER_COUNT, cases.length));
  const caseFiles = chunks.map((chunk, i) => {
    const file = path.join(CASES_DIR, `chunk-${i}.json`);
    fs.writeFileSync(file, JSON.stringify(chunk, null, 2));
    return file;
  });

  await Promise.all(caseFiles.map((file, i) => runWorker(i, file)));

  const reports: WorkerReport[] = fs
    .readdirSync(RESULTS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, f), 'utf-8')) as WorkerReport);

  const reportContent = generateReport(reports);
  const reportPath = saveReport(reportContent);
  console.log(`\n리포트 저장: ${reportPath}`);
  console.log(reportContent.split('\n').slice(0, 8).join('\n'));
}

main().catch(e => { console.error(e); process.exit(1); });
