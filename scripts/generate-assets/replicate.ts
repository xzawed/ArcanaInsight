import Replicate from 'replicate';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { REPLICATE_MODEL, OUTPUT_FORMAT } from './config';

const apiKey = process.env.REPLICATE_API_KEY;
if (!apiKey) {
  throw new Error('REPLICATE_API_KEY 환경변수가 설정되지 않았습니다.');
}

const replicate = new Replicate({ auth: apiKey });

async function downloadImage(url: string, outputPath: string): Promise<void> {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(outputPath);
    protocol.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateImage(prompt: string, outputPath: string): Promise<void> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const output = await replicate.run(REPLICATE_MODEL, {
        input: {
          prompt,
          output_format: OUTPUT_FORMAT,
          aspect_ratio: '2:3',
          safety_tolerance: 2,
        },
      });

      const imageUrl = typeof output === 'string'
        ? output
        : Array.isArray(output)
          ? String(output[0])
          : String(output);

      await downloadImage(imageUrl, outputPath);
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        console.warn(`  [재시도 ${attempt}/${maxRetries}] ${delayMs}ms 후 재시도 중...`);
        await sleep(delayMs);
      }
    }
  }

  throw new Error(`이미지 생성 실패 (${maxRetries}회 재시도): ${lastError?.message}`);
}
