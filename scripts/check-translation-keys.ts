/**
 * ko/en/ja 번역 사전 키 drift 검출.
 *
 * 사용법:
 *   pnpm exec tsx scripts/check-translation-keys.ts   # 검사 (오류 시 exit 1)
 *   pnpm i18n:check                                   # 동일
 *
 * 검사 규칙:
 *   - ko 사전이 SSOT. en/ja는 Partial<SharedKeys> 허용.
 *   - en/ja에 존재하지만 ko에 없는 키 → 오류 (orphan translation).
 *   - ko에 존재하지만 en/ja에 없는 키 → 경고 (미번역, 허용).
 */

import * as path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(__dirname, "..");

/** 중첩 객체를 "namespace.key" 형태의 flat set으로 변환 */
function flattenKeys(obj: Record<string, unknown>, prefix = ""): Set<string> {
  const result = new Set<string>();
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      for (const nested of flattenKeys(v as Record<string, unknown>, fullKey)) {
        result.add(nested);
      }
    } else {
      result.add(fullKey);
    }
  }
  return result;
}

async function loadDict(filePath: string): Promise<Record<string, unknown>> {
  // tsx 환경에서 동적 import로 TypeScript 모듈 로드
  const fileUrl = pathToFileURL(filePath).href;
  const mod = await import(fileUrl) as { ko?: unknown; en?: unknown; ja?: unknown; default?: unknown };
  const dict = mod.ko ?? mod.en ?? mod.ja ?? mod.default;
  if (!dict || typeof dict !== "object") {
    throw new Error(`[i18n:check] 사전 로드 실패: ${filePath}`);
  }
  return dict as Record<string, unknown>;
}

async function main() {
  const transDir = path.join(ROOT, "src/i18n/translations");

  const [koDictRaw, enDictRaw, jaDictRaw] = await Promise.all([
    loadDict(path.join(transDir, "ko/index.ts")),
    loadDict(path.join(transDir, "en/index.ts")),
    loadDict(path.join(transDir, "ja/index.ts")),
  ]);

  const koKeys = flattenKeys(koDictRaw);
  const enKeys = flattenKeys(enDictRaw);
  const jaKeys = flattenKeys(jaDictRaw);

  const errors: string[] = [];
  const warnings: string[] = [];

  // orphan 검사: en/ja에 있지만 ko에 없는 키
  for (const key of enKeys) {
    if (!koKeys.has(key)) errors.push(`[EN orphan] ${key}`);
  }
  for (const key of jaKeys) {
    if (!koKeys.has(key)) errors.push(`[JA orphan] ${key}`);
  }

  // 미번역 경고: ko에 있지만 en에 없는 키
  const enMissing = [...koKeys].filter((k) => !enKeys.has(k));
  const jaMissing = [...koKeys].filter((k) => !jaKeys.has(k));
  if (enMissing.length > 0) warnings.push(`EN 미번역 ${enMissing.length}개 키`);
  if (jaMissing.length > 0) warnings.push(`JA 미번역 ${jaMissing.length}개 키`);

  console.log(`\n[i18n:check] KO ${koKeys.size}개 | EN ${enKeys.size}개 | JA ${jaKeys.size}개`);

  if (warnings.length > 0) {
    console.log("\n⚠️  미번역 (허용):");
    for (const w of warnings) console.log(`   ${w}`);
  }

  if (errors.length > 0) {
    console.error("\n❌ orphan 번역 키 발견 (ko 사전에 없는 키):");
    for (const e of errors) console.error(`   ${e}`);
    console.error("\n→ ko/index.ts에 해당 키를 추가하거나 en/ja 사전에서 제거하세요.");
    process.exit(1);
  }

  console.log("\n✅ 번역 키 drift 없음\n");
}

main().catch((e) => {
  console.error("[i18n:check] 실행 오류:", e);
  process.exit(1);
});
