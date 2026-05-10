import { config } from 'dotenv';
config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';
import {
  STYLE_IDS,
  SUITS,
  OUTPUT_BASE_DIR,
  BACKGROUNDS_DIR,
  BACKUP_DIR,
  CONCURRENT_JOBS,
  type CardStyleId,
  type CardTarget,
  type BackgroundTarget,
  type DecoTarget,
} from './config';
import { generateImage } from './replicate';
import {
  buildCardPrompt,
  buildBackPrompt,
  buildBackgroundPrompt,
  buildDecoPrompt,
  getCardNameForPrompt,
} from './prompts';
import { ProgressTracker, runConcurrent } from './progress';

const SKIP_EXISTING = process.argv.includes('--skip-existing');

function backupExistingImages(): void {
  if (!fs.existsSync(OUTPUT_BASE_DIR)) return;

  console.log(`기존 이미지 백업 중: ${OUTPUT_BASE_DIR} → ${BACKUP_DIR}`);
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  function copyRecursive(src: string, dest: string): void {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      for (const item of fs.readdirSync(src)) {
        copyRecursive(path.join(src, item), path.join(dest, item));
      }
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  copyRecursive(OUTPUT_BASE_DIR, path.join(BACKUP_DIR, 'cards'));
  console.log('백업 완료.');
}

function buildAllCardTargets(): CardTarget[] {
  const targets: CardTarget[] = [];

  for (const styleId of STYLE_IDS) {
    for (let i = 0; i <= 21; i++) {
      const number = String(i).padStart(2, '0');
      const cardName = getCardNameForPrompt('major', number);
      targets.push({
        styleId,
        suit: 'major',
        number,
        cardName,
        outputPath: path.join(OUTPUT_BASE_DIR, styleId, 'major', `${number}.png`),
      });
    }

    for (const suit of SUITS) {
      for (let i = 1; i <= 14; i++) {
        const number = String(i).padStart(2, '0');
        const cardName = getCardNameForPrompt(suit, number);
        targets.push({
          styleId,
          suit,
          number,
          cardName,
          outputPath: path.join(OUTPUT_BASE_DIR, styleId, suit, `${number}.png`),
        });
      }
    }
  }

  return targets;
}

function buildAllBackTargets(): Array<{ styleId: CardStyleId; outputPath: string }> {
  return STYLE_IDS.map((styleId) => ({
    styleId,
    outputPath: path.join(OUTPUT_BASE_DIR, styleId, 'card-back.webp'),
  }));
}

function buildAllBackgroundTargets(): BackgroundTarget[] {
  const services = ['tarot', 'saju', 'shinjeom'] as const;
  const themes = ['midnight', 'dawn', 'sunset', 'spring', 'summer', 'autumn', 'winter'];
  const targets: BackgroundTarget[] = [];

  for (const service of services) {
    for (const theme of themes) {
      targets.push({
        service,
        theme,
        outputPath: path.join(BACKGROUNDS_DIR, service, `${theme}.png`),
      });
    }
  }

  return targets;
}

function buildAllDecoTargets(): DecoTarget[] {
  return STYLE_IDS.map((styleId) => ({
    styleId,
    outputPath: path.join(BACKGROUNDS_DIR, 'deco', `${styleId}.png`),
  }));
}

async function main(): Promise<void> {
  console.log('=== Visual Overhaul Phase 1: 이미지 생성 시작 ===');
  console.log(`병렬 작업 수: ${CONCURRENT_JOBS}`);
  console.log(`기존 파일 스킵: ${SKIP_EXISTING}`);

  backupExistingImages();

  const cardTargets = buildAllCardTargets();
  const backTargets = buildAllBackTargets();
  const bgTargets = buildAllBackgroundTargets();
  const decoTargets = buildAllDecoTargets();

  const allTasks: Array<() => Promise<{ label: string }>> = [];

  for (const target of cardTargets) {
    allTasks.push(async () => {
      const label = `${target.styleId}/${target.suit}/${target.number}`;
      if (SKIP_EXISTING && fs.existsSync(target.outputPath)) {
        return { label };
      }
      const prompt = buildCardPrompt(target.styleId, target.suit, target.number, target.cardName);
      await generateImage(prompt, target.outputPath);
      return { label };
    });
  }

  for (const target of backTargets) {
    allTasks.push(async () => {
      const label = `${target.styleId}/card-back`;
      if (SKIP_EXISTING && fs.existsSync(target.outputPath)) {
        return { label };
      }
      const prompt = buildBackPrompt(target.styleId);
      await generateImage(prompt, target.outputPath);
      return { label };
    });
  }

  for (const target of bgTargets) {
    allTasks.push(async () => {
      const label = `bg/${target.service}/${target.theme}`;
      if (SKIP_EXISTING && fs.existsSync(target.outputPath)) {
        return { label };
      }
      const prompt = buildBackgroundPrompt(target.service, target.theme);
      await generateImage(prompt, target.outputPath);
      return { label };
    });
  }

  for (const target of decoTargets) {
    allTasks.push(async () => {
      const label = `deco/${target.styleId}`;
      if (SKIP_EXISTING && fs.existsSync(target.outputPath)) {
        return { label };
      }
      const prompt = buildDecoPrompt(target.styleId);
      await generateImage(prompt, target.outputPath);
      return { label };
    });
  }

  const tracker = new ProgressTracker(allTasks.length);
  console.log(`\n총 생성 대상: ${allTasks.length}장`);
  console.log('생성 시작...\n');

  const wrappedTasks = allTasks.map((task) => async () => {
    try {
      const { label } = await task();
      tracker.tick(true, label);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`\nERROR: ${msg}\n`);
      tracker.tick(false, msg);
    }
  });

  await runConcurrent(wrappedTasks, CONCURRENT_JOBS);
  tracker.summary();
}

main().catch((err) => {
  console.error('이미지 생성 중 치명적 오류 발생:', err);
  process.exit(1);
});
