import * as fs from 'fs';
import * as path from 'path';
import type { WorkerReport, TestResult } from './types';

function formatMs(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}초`;
  return `${Math.floor(ms / 60000)}분 ${Math.round((ms % 60000) / 1000)}초`;
}

export function generateReport(reports: WorkerReport[]): string {
  const all: TestResult[] = reports.flatMap(r => r.results);
  const passed = all.filter(r => r.passed).length;
  const warning = all.filter(r => r.warning).length;
  const failed = all.filter(r => !r.passed && !r.warning).length;
  const totalMs = all.reduce((sum, r) => sum + r.durationMs, 0);
  const date = new Date().toISOString().split('T')[0];

  const failRows = all
    .filter(r => !r.passed)
    .map(r => `| ${r.testCase.service} | ${r.testCase.characterId} | ${r.testCase.topic} | ${r.warning ? '⚠️' : '❌'} | ${r.contentValidation.reason} |`)
    .join('\n');

  const charStats = [...new Set(all.map(r => r.testCase.characterId))].map(charId => {
    const charResults = all.filter(r => r.testCase.characterId === charId);
    const services = ['tarot', 'saju', 'shinjeom'] as const;
    const cols = services.map(svc => {
      const svcResults = charResults.filter(r => r.testCase.service === svc);
      const svcPass = svcResults.filter(r => r.passed).length;
      return svcResults.length > 0 ? `${svcPass}/${svcResults.length}` : '-';
    });
    const total = charResults.filter(r => r.passed).length;
    return `| ${charId} | ${cols.join(' | ')} | ${total}/${charResults.length} |`;
  }).join('\n');

  return `# Full Run Report — ${date}

## 요약
- **전체**: ${all.length} / **통과**: ${passed} / **경고**: ${warning} / **실패**: ${failed}
- **통과율**: ${Math.round((passed / all.length) * 100)}%
- **총 소요 시간**: ${formatMs(totalMs)} (병렬 실행)

## 실패·경고 목록
| 서비스 | 캐릭터 | 주제 | 판정 | 이유 |
|--------|--------|------|------|------|
${failRows || '| — | — | — | — | 없음 |'}

## 캐릭터별 통과율
| 캐릭터 | 타로 | 사주 | 신점 | 합계 |
|--------|------|------|------|------|
${charStats}
`;
}

export function saveReport(content: string): string {
  const date = new Date().toISOString().split('T')[0];
  const dir = path.resolve('docs/e2e-reports');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${date}-full-run.md`);
  fs.writeFileSync(filePath, content);
  return filePath;
}
