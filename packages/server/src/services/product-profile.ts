import { prisma } from '../db/prisma.js';

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ?? '';
const CLOUDFLARE_WORKERS_AI_API_TOKEN = process.env.CLOUDFLARE_WORKERS_AI_API_TOKEN?.trim() ?? '';
const CLOUDFLARE_PROFILE_MODEL =
  process.env.CLOUDFLARE_WORKERS_AI_PROFILE_MODEL?.trim() ?? '@cf/meta/llama-3.2-1b-instruct';
const CLOUDFLARE_RERANK_MODEL =
  process.env.CLOUDFLARE_WORKERS_AI_RERANK_MODEL?.trim() ?? '@cf/baai/bge-reranker-base';
const PAGE_FETCH_TIMEOUT_MS = Math.max(Number(process.env.PRODUCT_PROFILE_FETCH_TIMEOUT_MS ?? '8000'), 1000);
const PAGE_TEXT_LIMIT = Math.max(Number(process.env.PRODUCT_PROFILE_PAGE_TEXT_LIMIT ?? '3000'), 500);

export type ProductProfile = {
  brand: string;
  productName: string;
  category: string;
  coreFeatures: string[];
};

export type StoredProductProfile = ProductProfile & {
  status?: string | null;
  error?: string | null;
  generatedAt?: Date | null;
  updatedByUser?: boolean;
};

export type RerankCandidateInput = {
  id: string;
  text: string;
};

export type RerankCandidateResult = {
  id: string;
  score: number;
};

export async function generateAndPersistProductProfile(userId: string) {
  const config = await prisma.userSearchConfig.findUnique({
    where: { user_id: userId },
    select: {
      user_id: true,
      product_website_url: true,
      product_commerce_url: true,
      product_description: true,
      youtube_keywords: true,
      reddit_keywords: true,
      product_profile_brand: true,
      product_profile_product_name: true,
      product_profile_category: true,
      product_profile_core_features: true
    }
  });

  if (!config) {
    throw new Error(`搜索配置不存在: ${userId}`);
  }

  try {
    const generatedProfile = await generateProductProfile({
      websiteUrl: config.product_website_url ?? '',
      commerceUrl: config.product_commerce_url ?? '',
      description: config.product_description ?? '',
      targetKeywords: [...(config.youtube_keywords ?? []), ...(config.reddit_keywords ?? [])]
    });

    const profile = mergeGeneratedProfileWithExisting(generatedProfile, {
      brand: config.product_profile_brand ?? '',
      productName: config.product_profile_product_name ?? '',
      category: config.product_profile_category ?? '',
      coreFeatures: config.product_profile_core_features ?? []
    });

    return prisma.userSearchConfig.update({
      where: { user_id: userId },
      data: {
        product_profile_status: 'ready',
        product_profile_error: null,
        product_profile_generated_at: new Date(),
        product_profile_updated_by_user: false,
        product_profile_brand: profile.brand || null,
        product_profile_product_name: profile.productName || null,
        product_profile_category: profile.category || null,
        product_profile_core_features: profile.coreFeatures,
        product_profile_competitors: []
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return prisma.userSearchConfig.update({
      where: { user_id: userId },
      data: {
        product_profile_status: 'failed',
        product_profile_error: message,
        product_profile_generated_at: null
      }
    });
  }
}

function mergeGeneratedProfileWithExisting(
  generated: ProductProfile,
  existing: Partial<ProductProfile>
): ProductProfile {
  return {
    brand: generated.brand || existing.brand?.trim() || '',
    productName: generated.productName || existing.productName?.trim() || '',
    category: generated.category || existing.category?.trim() || '',
    coreFeatures:
      generated.coreFeatures.length > 0
        ? generated.coreFeatures
        : normalizeStringArray(existing.coreFeatures)
  };
}

export async function generateProductProfile(input: {
  websiteUrl?: string;
  commerceUrl?: string;
  description?: string;
  targetKeywords?: string[];
}): Promise<ProductProfile> {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_WORKERS_AI_API_TOKEN) {
    throw new Error('Cloudflare Workers AI 凭据未配置');
  }

  const websiteUrl = input.websiteUrl?.trim() ?? '';
  const commerceUrl = input.commerceUrl?.trim() ?? '';
  const description = input.description?.trim() ?? '';
  const targetKeywords = normalizeStringArray(input.targetKeywords);
  if (!websiteUrl && !commerceUrl && !description) {
    throw new Error('缺少可用于生成产品画像的产品信息');
  }

  const [websiteContext, commerceContext] = await Promise.all([
    websiteUrl ? fetchPageContext(websiteUrl) : Promise.resolve(null),
    commerceUrl ? fetchPageContext(commerceUrl) : Promise.resolve(null)
  ]);

  const sourceSections = [
    websiteUrl ? `Website URL:\n${websiteUrl}` : '',
    websiteContext ? `Website content:\n${websiteContext}` : '',
    commerceUrl ? `Commerce URL:\n${commerceUrl}` : '',
    commerceContext ? `Commerce content:\n${commerceContext}` : '',
    description ? `Product description:\n${description}` : ''
  ]
    .filter(Boolean)
    .join('\n\n');
  const keywordSection =
    targetKeywords.length > 0
      ? `Target keywords:\n${targetKeywords.join(', ')}`
      : 'Target keywords:\n(none provided)';

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${CLOUDFLARE_PROFILE_MODEL}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_WORKERS_AI_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content:
              'You extract structured product profiles. Return JSON only. Do not add explanations, markdown, or extra text. The JSON schema is: {"brand":"string","product_name":"string","category":"string","core_features":["string"]}. Focus on the target product scope that is relevant to the provided keywords, not the entire brand catalog. If the inputs include both a brand home page and more specific product details, prioritize the products implied by the keywords and specific product details. Keep values short and concrete. Do not invent competitors or include same-brand sibling products.'
          },
          {
            role: 'user',
            content: `Extract a product profile from the following information.\n\n${keywordSection}\n\n${sourceSections}`
          }
        ]
      }),
      signal: AbortSignal.timeout(15000)
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Cloudflare Workers AI 调用失败: ${response.status} ${body}`.trim());
  }

  const payload = (await response.json()) as {
    success?: boolean;
    result?: { response?: string | null };
    errors?: Array<{ message?: string }>;
  };

  if (!payload.success || !payload.result?.response) {
    const message = payload.errors?.[0]?.message ?? 'Cloudflare Workers AI 未返回有效内容';
    throw new Error(message);
  }

  return parseProductProfileResponse(payload.result.response);
}

export function hasUsableProductProfile(profile: Partial<ProductProfile> | null | undefined): boolean {
  if (!profile) return false;
  return Boolean(
      profile.brand?.trim() ||
      profile.productName?.trim() ||
      profile.category?.trim() ||
      profile.coreFeatures?.some((item) => item.trim())
  );
}

export function buildProductProfileSummary(
  profile: Partial<ProductProfile>,
  options: { targetKeywords?: string[] } = {}
): string {
  const sections = [
    profile.brand?.trim() ? `Brand: ${profile.brand.trim()}` : '',
    profile.productName?.trim() ? `Product: ${profile.productName.trim()}` : '',
    profile.category?.trim() ? `Category: ${profile.category.trim()}` : '',
    profile.coreFeatures && profile.coreFeatures.length > 0
      ? `Core features: ${normalizeStringArray(profile.coreFeatures).join(', ')}`
      : '',
    options.targetKeywords && options.targetKeywords.length > 0
      ? `Target keywords: ${normalizeStringArray(options.targetKeywords).join(', ')}`
      : ''
  ].filter(Boolean);

  return sections.join('\n');
}

export async function rerankCandidatesAgainstProfile(params: {
  profile: Partial<ProductProfile>;
  targetKeywords?: string[];
  candidates: RerankCandidateInput[];
}): Promise<RerankCandidateResult[]> {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_WORKERS_AI_API_TOKEN) {
    throw new Error('Cloudflare Workers AI 凭据未配置');
  }
  if (!hasUsableProductProfile(params.profile)) {
    throw new Error('缺少可用的产品画像');
  }
  if (params.candidates.length === 0) {
    return [];
  }

  const query = buildProductProfileSummary(params.profile, { targetKeywords: params.targetKeywords });
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${CLOUDFLARE_RERANK_MODEL}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_WORKERS_AI_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        contexts: params.candidates.map((candidate) => ({
          text: candidate.text
        })),
        top_k: params.candidates.length
      }),
      signal: AbortSignal.timeout(15000)
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Cloudflare reranker 调用失败: ${response.status} ${body}`.trim());
  }

  const payload = (await response.json()) as {
    success?: boolean;
    result?: {
      response?: unknown;
    } | unknown;
    errors?: Array<{ message?: string }>;
  };

  if (!payload.success) {
    const message = payload.errors?.[0]?.message ?? 'Cloudflare reranker 未返回有效内容';
    throw new Error(message);
  }

  return parseRerankResults(payload.result, params.candidates);
}

export function parseProductProfileResponse(raw: string): ProductProfile {
  const jsonText = extractFirstJsonObject(stripMarkdownFences(raw));
  const parsed = JSON.parse(jsonText) as Record<string, unknown>;

  return {
    brand: normalizeTextField(parsed.brand),
    productName: normalizeTextField(parsed.product_name),
    category: normalizeTextField(parsed.category),
    coreFeatures: normalizeStringArray(parsed.core_features)
  };
}

function stripMarkdownFences(value: string): string {
  return value
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function extractFirstJsonObject(value: string): string {
  const first = value.indexOf('{');
  const last = value.lastIndexOf('}');
  if (first < 0 || last <= first) {
    throw new Error('产品画像返回内容中未找到合法 JSON 对象');
  }
  return value.slice(first, last + 1);
}

function normalizeTextField(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      continue;
    }
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

function parseRerankResults(
  raw: unknown,
  candidates: RerankCandidateInput[]
): RerankCandidateResult[] {
  const response = extractRerankResponseArray(raw);
  if (!Array.isArray(response)) {
    throw new Error('Cloudflare reranker 返回格式无法识别');
  }

  const scores = response
    .map((item, index) => {
      if (typeof item === 'number') {
        return { index, score: item };
      }
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        const itemIndex =
          typeof record.index === 'number'
            ? record.index
            : typeof record.id === 'number'
              ? record.id
              : index;
        const score =
          typeof record.score === 'number'
            ? record.score
            : typeof record.relevance === 'number'
              ? record.relevance
              : typeof record.value === 'number'
                ? record.value
                : null;
        if (score !== null) {
          return { index: itemIndex, score };
        }
      }
      return null;
    })
    .filter((item): item is { index: number; score: number } => Boolean(item));

  return scores
    .map((item) => ({
      id: candidates[item.index]?.id,
      score: item.score
    }))
    .filter((item): item is RerankCandidateResult => Boolean(item.id))
    .sort((a, b) => b.score - a.score);
}

function extractRerankResponseArray(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    if (Array.isArray(record.response)) {
      return record.response;
    }
    if (Array.isArray(record.results)) {
      return record.results;
    }
  }
  return null;
}

async function fetchPageContext(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'VoiceInsight/0.1 (+https://voiceinsight.app)'
      },
      signal: AbortSignal.timeout(PAGE_FETCH_TIMEOUT_MS)
    });

    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok || (!contentType.includes('text/html') && !contentType.includes('text/plain'))) {
      return null;
    }

    const html = await response.text();
    const title = matchMeta(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const description =
      matchMeta(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ??
      matchMeta(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    const bodyText = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, PAGE_TEXT_LIMIT);

    return [title, description, bodyText].filter(Boolean).join('\n').slice(0, PAGE_TEXT_LIMIT);
  } catch {
    return null;
  }
}

function matchMeta(source: string, pattern: RegExp): string | null {
  const match = source.match(pattern);
  return match?.[1]?.replace(/\s+/g, ' ').trim() ?? null;
}
