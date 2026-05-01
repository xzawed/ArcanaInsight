#!/usr/bin/env tsx
import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import type { TestCase, TestResult, WorkerReport } from './types';
import { executeTarotFlow } from './flows/tarot-flow';
import { executeSajuFlow } from './flows/saju-flow';
import { executeShinjeomFlow } from './flows/shinjeom-flow';
import { runStructureValidation } from './validators/structure-validator';
import { runContentValidation } from './validators/content-validator';

const WORKER_ID = parseInt(process.env.WORKER_ID ?? '0', 10);
const CASES_FILE = process.env.CASES_FILE ?? '';
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const RESULTS_DIR = path.resolve('scripts/e2e-full/results');

async function runTestCase(page: import('@playwright/test').Page, tc: TestCase): Promise<TestResult> {
  const start = Date.now();
  try {
    let responseText = '';
    let selectedCards: string[] = [];

    if (tc.service === 'tarot') {
      const r = await executeTarotFlow(page, tc, BASE_URL);
      responseText = r.responseText;
      selectedCards = r.selectedCards;
    } else if (tc.service === 'saju') {
      const r = await executeSajuFlow(page, tc, BASE_URL);
      responseText = r.responseText;
    } else {
      const r = await executeShinjeomFlow(page, tc, BASE_URL);
      responseText = r.responseText;
    }

    const structureValidation = await runStructureValidation(page);
    const contentValidation = await runContentValidation(responseText, tc, selectedCards);

    const structPass = structureValidation.passed;
    const contentPass = contentValidation.passed;
    const passed = structPass && contentPass;
    const warning = !passed && (structureValidation.score >= 75 && contentValidation.score >= 75);

    return {
      testCase: tc,
      flowPassed: true,
      responseText: responseText.slice(0, 500),
      structureValidation,
      contentValidation,
      passed,
      warning,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      testCase: tc,
      flowPassed: false,
      responseText: '',
      structureValidation: { passed: false, score: 0, checks: {}, reason: '플로우 실패' },
      contentValidation: { passed: false, score: 0, checks: {}, reason: '플로우 실패' },
      passed: false,
      warning: false,
      durationMs: Date.now() - start,
      error: String(err),
    };
  }
}

async function main() {
  if (!CASES_FILE) throw new Error('CASES_FILE 환경변수 필요');
  const cases: TestCase[] = JSON.parse(fs.readFileSync(CASES_FILE, 'utf-8'));

  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results: TestResult[] = [];
  const startedAt = new Date().toISOString();

  for (const tc of cases) {
    const context = await browser.newContext();
    const page = await context.newPage();
    console.log(`[Worker ${WORKER_ID}] 실행: ${tc.id}`);
    const result = await runTestCase(page, tc);
    results.push(result);
    console.log(`[Worker ${WORKER_ID}] ${result.passed ? '✅' : result.warning ? '⚠️' : '❌'} ${tc.id}`);
    await context.close();
  }

  await browser.close();

  const report: WorkerReport = {
    workerId: WORKER_ID,
    results,
    startedAt,
    completedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(RESULTS_DIR, `worker-${WORKER_ID}.json`),
    JSON.stringify(report, null, 2)
  );
  console.log(`[Worker ${WORKER_ID}] 완료: ${results.length}개 처리`);
}

main().catch(e => { console.error(e); process.exit(1); });
