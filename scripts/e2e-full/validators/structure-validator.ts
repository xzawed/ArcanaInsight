import type { Page } from '@playwright/test';
import type { ValidationResult } from '../types';

const JSON_ARTIFACT_RE = /(?:\{"[^"]+"|"[a-zA-Z_]+"\s*:(?!\s*"[가-힣])|"\}\s*,)/;
const ERROR_KEYWORDS = ['오류가 발생', '에러가 발생', 'undefined', 'Cannot read', 'Error:'];

export async function runStructureValidation(
  page: Page
): Promise<ValidationResult> {
  const checks: Record<string, boolean> = {};
  const url = page.url();
  const bodyText = await page.locator('body').innerText().catch(() => '');

  checks.result_page_reached = /\/(tarot|saju|shinjeom)\/result\//.test(url);
  checks.no_json_artifacts = !JSON_ARTIFACT_RE.test(bodyText);
  checks.minimum_length = bodyText.length >= 200;
  checks.no_error_text = !ERROR_KEYWORDS.some(k => bodyText.includes(k));

  const passCount = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;

  return {
    passed: passCount >= total - 1,
    score: Math.round((passCount / total) * 100),
    checks,
    reason: passCount === total
      ? '모든 구조 체크 통과'
      : Object.entries(checks).filter(([, v]) => !v).map(([k]) => k).join(', ') + ' 실패',
  };
}
