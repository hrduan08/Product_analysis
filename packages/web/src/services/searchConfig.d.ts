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
export declare function fetchSearchConfig(userId: string): Promise<SearchConfigResponse>;
export declare function patchSearchConfig(payload: SearchConfigPatchPayload): Promise<SearchConfig>;
export declare function testFeishuWebhook(payload: {
    userId: string;
}): Promise<FeishuTestResponse>;
