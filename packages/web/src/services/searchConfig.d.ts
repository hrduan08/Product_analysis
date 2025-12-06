export type SearchConfig = {
    userId: string;
    platforms: string[];
    keywords: string[];
    slots: string[];
    notifyEmail: string;
    timezone: string;
    notifyChannels: string[];
    feishuWebhook: string;
    feishuStatus: string | null;
    feishuLastTestedAt: string | null;
    nextRunAt: string | null;
    lastRunAt: string | null;
    lastNotifiedAt: string | null;
    createdAt: string | null;
    updatedAt: string | null;
};
export type SearchConfigMeta = {
    supportedPlatforms: string[];
    maxKeywords: number;
    maxSlots: number;
    defaultTimezone: string;
};
export type SearchConfigResponse = {
    config: SearchConfig;
    meta: SearchConfigMeta;
};
export type SearchConfigPatchPayload = {
    userId: string;
    platforms?: string[];
    keywords?: string[];
    slots?: string[];
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
