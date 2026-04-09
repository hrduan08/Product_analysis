import { startOfDay } from 'date-fns';

import { prisma } from '../../db/prisma.js';
import { youtubeConfig } from '../../config/youtube.js';

export type YoutubeRequestKind = 'search' | 'videos';

type MinuteWindow = {
  startedAt: number;
  searchCalls: number;
  videoCalls: number;
};

type DailyUsageState = {
  dateKey: string;
  usageDate: Date;
  unitsUsed: number;
  searchCalls: number;
  videoCalls: number;
  saturated: boolean;
  frozenUntil?: number;
};

const minuteWindowMs = 60 * 1000;

export class YoutubeRateLimitError extends Error {
  retryAfterSeconds?: number;

  constructor(message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = 'YoutubeRateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

class YoutubeQuotaManager {
  private readonly apiKeys = youtubeConfig.apiKeys;
  private readonly minuteMap = new Map<string, MinuteWindow>();
  private readonly dailyMap = new Map<string, DailyUsageState>();

  private getStartIndex(hashKey?: string): number {
    if (!hashKey) {
      return 0;
    }
    let hash = 0;
    for (let i = 0; i < hashKey.length; i += 1) {
      hash = (hash * 31 + hashKey.charCodeAt(i)) >>> 0;
    }
    return hash % this.apiKeys.length;
  }

  private getMinuteWindow(key: string, now: number): MinuteWindow {
    const existing = this.minuteMap.get(key);
    if (existing && now - existing.startedAt < minuteWindowMs) {
      return existing;
    }
    const window: MinuteWindow = {
      startedAt: now,
      searchCalls: 0,
      videoCalls: 0
    };
    this.minuteMap.set(key, window);
    return window;
  }

  private async getDailyUsage(key: string, now: Date): Promise<DailyUsageState> {
    const date = startOfDay(now);
    const dateKey = date.toISOString();
    const cached = this.dailyMap.get(key);
    if (cached && cached.dateKey === dateKey) {
      return cached;
    }

    const record = await prisma.youtubeQuotaUsage.findUnique({
      where: {
        api_key_usage_date: {
          api_key: key,
          usage_date: date
        }
      }
    });

    const state: DailyUsageState = {
      dateKey,
      usageDate: date,
      unitsUsed: record?.units_used ?? 0,
      searchCalls: record?.search_calls ?? 0,
      videoCalls: record?.video_calls ?? 0,
      saturated: record ? record.units_used >= this.dailyLimit() : false,
      frozenUntil: undefined
    };

    this.dailyMap.set(key, state);
    return state;
  }

  private dailyLimit(): number {
    return youtubeConfig.dailyQuotaPerKey * youtubeConfig.saturationRatio;
  }

  async acquireKey(kind: YoutubeRequestKind, options?: { units?: number; calls?: number; hashKey?: string }): Promise<{ apiKey: string }> {
    const units = options?.units ?? this.getUnitsFor(kind);
    const calls = options?.calls ?? 1;
    const now = Date.now();
    const startIdx = this.getStartIndex(options?.hashKey);
    const nowDate = new Date(now);

    for (let step = 0; step < this.apiKeys.length; step += 1) {
      const key = this.apiKeys[(startIdx + step) % this.apiKeys.length];
      const minuteWindow = this.getMinuteWindow(key, now);
      const dailyUsage = await this.getDailyUsage(key, nowDate);

      if (dailyUsage.frozenUntil && now < dailyUsage.frozenUntil) {
        continue;
      }
      if (dailyUsage.saturated) {
        continue;
      }
      if (kind === 'search' && minuteWindow.searchCalls + calls > youtubeConfig.searchMaxPerMinute) {
        continue;
      }
      if (kind === 'videos' && minuteWindow.videoCalls + calls > youtubeConfig.videoMaxPerMinute) {
        continue;
      }
      if (dailyUsage.unitsUsed + units > this.dailyLimit()) {
        dailyUsage.saturated = true;
        continue;
      }

      if (kind === 'search') {
        minuteWindow.searchCalls += calls;
        dailyUsage.searchCalls += calls;
      } else {
        minuteWindow.videoCalls += calls;
        dailyUsage.videoCalls += calls;
      }
      dailyUsage.unitsUsed += units;

      await this.persistUsage(key, dailyUsage.usageDate, {
        kind,
        calls,
        units
      });

      return { apiKey: key };
    }

    throw new YoutubeRateLimitError('YouTube API 当前速率已满，请稍后重试', 60);
  }

  async markKeyAsFrozen(apiKey: string, durationMs: number): Promise<void> {
    const cached = this.dailyMap.get(apiKey);
    if (!cached) {
      const now = new Date();
      const state = await this.getDailyUsage(apiKey, now);
      state.frozenUntil = Date.now() + durationMs;
      this.dailyMap.set(apiKey, state);
      return;
    }
    cached.frozenUntil = Date.now() + durationMs;
  }

  async markKeyAsExhausted(apiKey: string): Promise<void> {
    const now = new Date();
    const state = await this.getDailyUsage(apiKey, now);
    state.saturated = true;
    state.unitsUsed = youtubeConfig.dailyQuotaPerKey;
  }

  async persistUsage(
    apiKey: string,
    usageDate: Date,
    payload: { kind: YoutubeRequestKind; calls: number; units: number }
  ): Promise<void> {
    await prisma.youtubeQuotaUsage.upsert({
      where: {
        api_key_usage_date: {
          api_key: apiKey,
          usage_date: usageDate
        }
      },
      create: {
        api_key: apiKey,
        usage_date: usageDate,
        search_calls: payload.kind === 'search' ? payload.calls : 0,
        video_calls: payload.kind === 'videos' ? payload.calls : 0,
        units_used: payload.units
      },
      update: {
        search_calls: payload.kind === 'search' ? { increment: payload.calls } : undefined,
        video_calls: payload.kind === 'videos' ? { increment: payload.calls } : undefined,
        units_used: { increment: payload.units }
      }
    });
  }

  private getUnitsFor(kind: YoutubeRequestKind): number {
    return kind === 'search' ? youtubeConfig.searchUnitsPerCall : youtubeConfig.videoUnitsPerCall;
  }
}

export const youtubeQuotaManager = new YoutubeQuotaManager();
