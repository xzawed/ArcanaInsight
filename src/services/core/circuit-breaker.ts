interface State { down: boolean; downUntil: number }

export class CircuitBreaker {
  private readonly prefix: string;
  private readonly globalKey: string | null;
  private _down = false;
  private _downUntil = 0;

  constructor(opts: { prefix: string; globalKey?: string }) {
    this.prefix = opts.prefix;
    this.globalKey = opts.globalKey ?? null;
    if (this.globalKey) {
      const g = globalThis as Record<string, unknown>;
      if (!g[this.globalKey]) g[this.globalKey] = { down: false, downUntil: 0 };
    }
  }

  private getState(): State {
    if (this.globalKey) return (globalThis as Record<string, unknown>)[this.globalKey] as State;
    return { down: this._down, downUntil: this._downUntil };
  }

  private setState(down: boolean, downUntil: number): void {
    if (this.globalKey) {
      const s = (globalThis as Record<string, unknown>)[this.globalKey] as State;
      s.down = down;
      s.downUntil = downUntil;
    } else {
      this._down = down;
      this._downUntil = downUntil;
    }
  }

  isAvailable(): boolean {
    const { down, downUntil } = this.getState();
    if (!down) return true;
    if (Date.now() > downUntil) { this.setState(false, 0); return true; }
    return false;
  }

  markDown(ms: number, reason: string): void {
    this.setState(true, Date.now() + ms);
    console.warn(`[${this.prefix}] circuit open for ${Math.round(ms / 1000)}s — ${reason}`);
  }

  resetForTests(): void {
    this.setState(false, 0);
  }
}
