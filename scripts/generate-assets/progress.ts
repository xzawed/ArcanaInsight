export class ProgressTracker {
  private completed = 0;
  private failed = 0;
  private readonly startTime: number;

  constructor(private readonly total: number) {
    this.startTime = Date.now();
  }

  log(message: string): void {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log(`[${elapsed}s] ${message}`);
  }

  tick(success: boolean, label: string): void {
    if (success) {
      this.completed++;
    } else {
      this.failed++;
    }
    const done = this.completed + this.failed;
    const pct = Math.round((done / this.total) * 100);
    const status = success ? 'OK' : 'FAIL';
    process.stdout.write(
      `\r[${status}] ${done}/${this.total} (${pct}%) | OK:${this.completed} FAIL:${this.failed} | ${label.slice(0, 50).padEnd(50)}`
    );
    if (done === this.total) {
      console.log('');
    }
  }

  summary(): void {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log('\n=== 생성 완료 ===');
    console.log(`총 ${this.total}장 | 성공: ${this.completed} | 실패: ${this.failed} | 소요 시간: ${elapsed}s`);
    if (this.failed > 0) {
      console.warn(`주의: ${this.failed}장 생성 실패. public/images/cards/ 에서 누락 파일을 확인하세요.`);
    }
  }
}

export async function runConcurrent<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<Array<{ status: 'fulfilled'; value: T } | { status: 'rejected'; reason: unknown }>> {
  const results: Array<{ status: 'fulfilled'; value: T } | { status: 'rejected'; reason: unknown }> = [];
  let index = 0;

  async function runNext(): Promise<void> {
    while (index < tasks.length) {
      const currentIndex = index++;
      try {
        const value = await tasks[currentIndex]();
        results[currentIndex] = { status: 'fulfilled', value };
      } catch (reason) {
        results[currentIndex] = { status: 'rejected', reason };
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, runNext);
  await Promise.all(workers);
  return results;
}
