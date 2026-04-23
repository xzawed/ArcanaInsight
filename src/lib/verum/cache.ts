export class DeploymentConfigCache<T> {
  private readonly store = new Map<string, { value: T; expiresAt: number }>();
  private readonly inflight = new Map<string, Promise<T>>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  /** 동시 다중 캐시 미스 시 fetcher를 1회만 호출하고 나머지는 같은 Promise를 await */
  getOrFetch(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) return Promise.resolve(cached);

    const existing = this.inflight.get(key);
    if (existing !== undefined) return existing;

    const p = fetcher()
      .then((value) => { this.set(key, value); return value; })
      .finally(() => { this.inflight.delete(key); });

    this.inflight.set(key, p);
    return p;
  }
}
