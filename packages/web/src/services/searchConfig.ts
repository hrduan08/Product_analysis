import { API_BASE } from './api';

export type SearchConfig = {
  userId: string;
  platforms: string[];
  redditCommunities: string[];
  redditKeywords: string[];
  youtubeKeywords: string[];
  notifyEmail: string;
  timezone: string;
  productWebsiteUrl: string;
  productCommerceUrl: string;
  productDescription: string;
  productProfile: {
    status: string;
    error: string | null;
    generatedAt: string | null;
    updatedByUser: boolean;
    brand: string;
    productName: string;
    category: string;
    coreFeatures: string[];
    targetProducts: Array<{
      name: string;
      coreFeatures: string[];
    }>;
  };
  notifyChannels: string[];
  feishuWebhook: string;
  feishuStatus: string | null;
  feishuLastTestedAt: string | null;
  nextRunAt: string | null;
  redditLastRunAt: string | null;
  youtubeLastRunAt: string | null;
  lastNotifiedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SearchConfigMeta = {
  supportedPlatforms: string[];
  maxRedditCommunities: number;
  maxRedditKeywords: number;
  maxYoutubeKeywords: number;
  defaultTimezone: string;
  redditBetaAllowed: boolean;
};

export type SearchConfigResponse = {
  config: SearchConfig;
  meta: SearchConfigMeta;
};

export type SearchConfigPatchPayload = {
  userId: string;
  platforms?: string[];
  redditCommunities?: string[];
  redditKeywords?: string[];
  youtubeKeywords?: string[];
  productWebsiteUrl?: string;
  productCommerceUrl?: string;
  productDescription?: string;
  productProfile?: {
    brand?: string;
    productName?: string;
    category?: string;
    coreFeatures?: string[];
    targetProducts?: Array<{
      name: string;
      coreFeatures?: string[];
    }>;
  };
  notifyEmail?: string;
  timezone?: string;
  notifyChannels?: string[];
  feishuWebhook?: string;
};

export type FeishuTestResponse = {
  status: string;
  testedAt: string;
};

export async function fetchSearchConfig(userId: string): Promise<SearchConfigResponse> {
  const response = await fetch(`${API_BASE}/api/app/search-config?userId=${encodeURIComponent(userId)}`);
  if (!response.ok) {
    throw new Error('获取搜索配置失败');
  }
  const data = (await response.json()) as SearchConfigResponse;
  return data;
}

export async function patchSearchConfig(payload: SearchConfigPatchPayload): Promise<SearchConfig> {
  const response = await fetch(`${API_BASE}/api/app/search-config`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    let message = '更新搜索配置失败';
    try {
      const raw = await response.json();
      if (raw && typeof raw === 'object') {
        if ('message' in raw && typeof raw.message === 'string') {
          message = raw.message;
        } else if ('error' in raw && typeof raw.error === 'string') {
          message = raw.error;
        }
      }
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }
  const data = (await response.json()) as { config: SearchConfig };
  return data.config;
}

export async function testFeishuWebhook(payload: { userId: string }): Promise<FeishuTestResponse> {
  const response = await fetch(`${API_BASE}/api/app/search-config/test-feishu`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    let message = '飞书测试通知发送失败';
    try {
      const raw = await response.json();
      if (raw && typeof raw === 'object' && typeof raw.message === 'string') {
        message = raw.message;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return (await response.json()) as FeishuTestResponse;
}
