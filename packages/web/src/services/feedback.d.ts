export type AttachmentPayload = {
    name: string;
    type: string;
    size: number;
    url: string;
};
export type SubmitFeedbackPayload = {
    category: 'bug' | 'idea' | 'other';
    title: string;
    description: string;
    contactEmail?: string;
    attachments?: AttachmentPayload[];
    diagnostics?: unknown;
    userId?: string;
    anonymousId?: string;
};
export declare function submitFeedback(payload: SubmitFeedbackPayload): Promise<void>;
export declare function uploadFeedbackAttachment(file: File): Promise<AttachmentPayload>;
