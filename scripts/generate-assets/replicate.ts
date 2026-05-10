import Replicate from 'replicate';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { REPLICATE_MODEL, OUTPUT_FORMAT } from './config';

function getClient(): Replicate {
  const apiKey = process.env.REPLICATE_API_KEY;
  if (!apiKey) {
    throw new Error('REPLICATE_API_KEY 환경변수가 설정되지 않았습니다. .env.local 파일을 확인하세요.');
  }
  return new Replicate({ auth: apiKey });
}

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

function parseRetryAfter(err: Error): number | null {
  const match = err.message.match(/"retry_after"\s*:\s*(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

export async function generateImage(prompt: string, outputPath: string): Promise<void> {
  const maxRetries = 5;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const output = await getClient().run(REPLICATE_MODEL, {
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
        const retryAfter = parseRetryAfter(lastError);
        const delayMs = retryAfter != null
          ? (retryAfter + 1) * 1000
          : Math.pow(2, attempt) * 1000;
        console.warn(`  [재시도 ${attempt}/${maxRetries}] ${delayMs / 1000}s 후 재시도 중...`);
        await sleep(delayMs);
      }
    }
  }

  throw new Error(`이미지 생성 실패 (${maxRetries}회 재시도): ${lastError?.message}`);
}
