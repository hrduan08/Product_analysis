import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { supabase, feedbackBucket } from '../config/supabase.js';

export async function uploadFeedbackFile(options: {
  buffer: Buffer;
  contentType: string;
  filename?: string;
  prefix?: string;
}): Promise<string> {
  const extension = options.filename ? path.extname(options.filename) : '';
  const objectPath = `${options.prefix ?? 'feedback'}/${randomUUID()}${extension}`;
  const { error } = await supabase.storage.from(feedbackBucket).upload(objectPath, options.buffer, {
    contentType: options.contentType,
    upsert: false
  });
  if (error) {
    throw new Error(`上传附件失败：${error.message}`);
  }
  const { data } = supabase.storage.from(feedbackBucket).getPublicUrl(objectPath);
  if (!data?.publicUrl) {
    throw new Error('获取附件访问地址失败');
  }
  return data.publicUrl;
}
