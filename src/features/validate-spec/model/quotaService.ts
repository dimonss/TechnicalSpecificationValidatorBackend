export interface UsageInfo {
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
  unlimited?: boolean;
}

interface ClientUsage {
  used: number;
  resetAtMs: number;
}

export const UNLIMITED_LIMIT = 999_999;

export class QuotaService {
  private readonly defaultLimit: number;
  private clients = new Map<string, ClientUsage>();

  constructor(defaultLimit = 5) {
    this.defaultLimit = defaultLimit;
  }

  private getNextResetTime(): Date {
    const now = new Date();
    const nextReset = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,
        0,
        0,
        0,
      ),
    );
    return nextReset;
  }

  private getClientKey(key?: string): string {
    return key || 'default';
  }

  private getOrResetClientUsage(key: string): ClientUsage {
    const nowMs = Date.now();
    let usage = this.clients.get(key);
    if (!usage || nowMs >= usage.resetAtMs) {
      usage = {
        used: 0,
        resetAtMs: this.getNextResetTime().getTime(),
      };
      this.clients.set(key, usage);
    }
    return usage;
  }

  getUsage(key?: string, isUnlimited?: boolean): UsageInfo {
    const clientKey = this.getClientKey(key);
    const usage = this.getOrResetClientUsage(clientKey);

    if (isUnlimited) {
      return {
        limit: UNLIMITED_LIMIT,
        used: usage.used,
        remaining: UNLIMITED_LIMIT,
        resetsAt: new Date(usage.resetAtMs).toISOString(),
        unlimited: true,
      };
    }

    const remaining = Math.max(0, this.defaultLimit - usage.used);
    return {
      limit: this.defaultLimit,
      used: usage.used,
      remaining,
      resetsAt: new Date(usage.resetAtMs).toISOString(),
      unlimited: false,
    };
  }

  consume(key?: string, isUnlimited?: boolean): UsageInfo {
    const clientKey = this.getClientKey(key);
    const usage = this.getOrResetClientUsage(clientKey);

    if (isUnlimited) {
      usage.used += 1;
      return {
        limit: UNLIMITED_LIMIT,
        used: usage.used,
        remaining: UNLIMITED_LIMIT,
        resetsAt: new Date(usage.resetAtMs).toISOString(),
        unlimited: true,
      };
    }

    if (usage.used >= this.defaultLimit) {
      return {
        limit: this.defaultLimit,
        used: usage.used,
        remaining: 0,
        resetsAt: new Date(usage.resetAtMs).toISOString(),
        unlimited: false,
      };
    }
    usage.used += 1;
    const remaining = Math.max(0, this.defaultLimit - usage.used);
    return {
      limit: this.defaultLimit,
      used: usage.used,
      remaining,
      resetsAt: new Date(usage.resetAtMs).toISOString(),
      unlimited: false,
    };
  }
}
