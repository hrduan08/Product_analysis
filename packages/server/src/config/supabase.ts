import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FEEDBACK_BUCKET = process.env.SUPABASE_FEEDBACK_BUCKET ?? 'feedback-attachments';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 未配置，无法上传反馈附件');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

export const feedbackBucket = FEEDBACK_BUCKET;
