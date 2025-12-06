import type { FormEvent, ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { submitFeedback, uploadFeedbackAttachment } from '../services/feedback';

type FormState = {
  category: 'bug' | 'idea' | 'other';
  title: string;
  description: string;
  contactEmail: string;
  attachments: AttachmentPayload[];
};

type AttachmentPayload = {
  name: string;
  type: string;
  size: number;
  previewUrl: string;
  url: string;
};

type DiagnosticsPayload = Record<string, unknown>;

const CATEGORY_OPTIONS: Array<{ value: FormState['category']; label: string }> = [
  { value: 'bug', label: '遇到的问题' },
  { value: 'idea', label: '功能建议' },
  { value: 'other', label: '其他' }
];

const ANON_KEY = 'pi_anon_id';
const SUPPORT_EMAIL = 'support@product-insight.dev';
const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MIN_DESCRIPTION_LENGTH = 10;

export function FeedbackWidget(): JSX.Element {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<FormState>({
    category: 'bug',
    title: '',
    description: '',
    contactEmail: '',
    attachments: []
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const anonymousId = useMemo(() => getAnonymousId(), []);
  const diagnostics = useMemo(() => collectDiagnostics(), [isOpen]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      contactEmail: user?.email ?? ''
    }));
  }, [user?.email]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'submitting') return;
    setStatus('submitting');
    setError(null);
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        contactEmail: form.contactEmail.trim() || undefined,
        attachments:
          form.attachments.length > 0
            ? form.attachments.map(({ previewUrl, ...rest }) => rest)
            : undefined,
        diagnostics,
        userId: user?.id,
        anonymousId
      };
      await submitFeedback(payload);
      setStatus('success');
      setForm({
        category: 'bug',
        title: '',
        description: '',
        contactEmail: user?.email ?? '',
        attachments: []
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '提交失败，请稍后重试';
      setError(message);
      setStatus('error');
    }
  };

  const isSubmitDisabled =
    form.description.trim().length < MIN_DESCRIPTION_LENGTH || status === 'submitting' || isUploading;

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const files = Array.from(event.target.files);
    const availableSlots = MAX_ATTACHMENTS - form.attachments.length;
    const picked = files.slice(0, availableSlots);
    setIsUploading(true);
    try {
      for (const file of picked) {
        if (!file.type.startsWith('image/')) {
          setError('仅支持上传图片文件');
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          setError('单个附件不能超过 5MB');
          continue;
        }
        const uploaded = await uploadFeedbackAttachment(file);
        setForm((prev) => ({
          ...prev,
          attachments: [
            ...prev.attachments,
            {
              name: uploaded.name,
              type: uploaded.type,
              size: uploaded.size,
              url: uploaded.url,
              previewUrl: uploaded.url
            }
          ]
        }));
      }
      setError(null);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : '上传截图失败，请稍后重试';
      setError(message);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setForm((prev) => {
      const next = [...prev.attachments];
      next.splice(index, 1);
      return { ...prev, attachments: next };
    });
  };

  const closePanel = () => {
    setIsOpen(false);
    setStatus('idle');
    setError(null);
    setShowDiagnostics(false);
    setForm((prev) => ({ ...prev, attachments: [] }));
  };

  return (
    <>
      <button
        type="button"
        className="feedback-widget__button"
        onClick={() => setIsOpen(true)}
        aria-label="提交反馈"
      >
        提交反馈
      </button>
      {isOpen ? (
        <div className="feedback-widget__overlay" role="dialog" aria-modal="true">
          <div className="feedback-widget__panel">
            <div className="feedback-widget__panel-header">
              <div>
                <h3>提交反馈</h3>
                <p>请描述您的问题或建议，系统会自动携带诊断信息，帮助我们快速定位。</p>
              </div>
              <button type="button" className="feedback-widget__close" onClick={closePanel} aria-label="关闭反馈面板">
                ×
              </button>
            </div>

            {status === 'success' ? (
              <div className="feedback-widget__status feedback-widget__status--success">
                <p>感谢反馈！我们已收到您的信息。</p>
                <p>如需补充可发送邮件至 {SUPPORT_EMAIL}</p>
                <button type="button" onClick={closePanel}>
                  关闭
                </button>
              </div>
            ) : (
              <form className="feedback-widget__form" onSubmit={handleSubmit}>
                <div className="feedback-widget__field">
                  <label htmlFor="feedback-category">反馈类型</label>
                  <select
                    id="feedback-category"
                    value={form.category}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, category: event.target.value as FormState['category'] }))
                    }
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="feedback-widget__field">
                  <label htmlFor="feedback-title">标题（可选）</label>
                  <input
                    id="feedback-title"
                    type="text"
                    value={form.title}
                    maxLength={120}
                    placeholder="例如：登录搜索配置页时提示 500 错误"
                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  />
                </div>

                <div className="feedback-widget__field">
                  <label htmlFor="feedback-description">详细描述</label>
                  <textarea
                    id="feedback-description"
                    value={form.description}
                    minLength={MIN_DESCRIPTION_LENGTH}
                    maxLength={3000}
                    placeholder="请说明出现问题的操作步骤、期望结果、实际结果等信息"
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                    required
                  />
                </div>

                <div className="feedback-widget__field">
                  <label htmlFor="feedback-contact">联系邮箱（可选）</label>
                  <input
                    id="feedback-contact"
                    type="email"
                    value={form.contactEmail}
                    placeholder="用于我们向您确认细节"
                    onChange={(event) => setForm((prev) => ({ ...prev, contactEmail: event.target.value }))}
                  />
                </div>

                <div className="feedback-widget__attachments">
                  <div className="feedback-widget__attachments-header">
                    <label>截图（最多 {MAX_ATTACHMENTS} 张，可选）</label>
                    <span>{isUploading ? '上传中…' : '支持 png / jpg，单张 ≤ 5MB'}</span>
                  </div>
                  <div className="feedback-widget__attachments-grid">
                    {form.attachments.map((file, index) => (
                      <div className="feedback-widget__attachment" key={file.previewUrl}>
                        <img src={file.previewUrl} alt={file.name} />
                        <button type="button" onClick={() => removeAttachment(index)} aria-label="移除附件">
                          ×
                        </button>
                      </div>
                    ))}
                    {form.attachments.length < MAX_ATTACHMENTS ? (
                      <label className="feedback-widget__attachment-upload">
                        <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleFileChange} />
                        <span>上传</span>
                      </label>
                    ) : null}
                  </div>
                </div>

                <details
                  className="feedback-widget__diag-preview"
                  open={showDiagnostics}
                  onToggle={(event) => setShowDiagnostics((event.target as HTMLDetailsElement).open)}
                >
                  <summary>诊断信息将自动上传（点击查看）</summary>
                  <pre>{JSON.stringify(diagnostics, null, 2)}</pre>
                </details>

                {error ? <div className="feedback-widget__status feedback-widget__status--error">{error}</div> : null}

                <div className="feedback-widget__actions">
                  <button type="button" onClick={closePanel} className="feedback-widget__secondary">
                    取消
                  </button>
                  <button type="submit" disabled={isSubmitDisabled}>
                    {status === 'submitting' ? '提交中…' : '提交反馈'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function getAnonymousId(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  try {
    const existing = localStorage.getItem(ANON_KEY);
    if (existing) {
      return existing;
    }
    const value = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `anon-${Date.now()}`;
    localStorage.setItem(ANON_KEY, value);
    return value;
  } catch {
    return undefined;
  }
}

function collectDiagnostics(): DiagnosticsPayload {
  if (typeof window === 'undefined') {
    return {};
  }
  const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const logs = (window as typeof window & { __PI_LOGS?: unknown[] }).__PI_LOGS;
  return {
    timestamp: new Date().toISOString(),
    client: {
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      online: navigator.onLine
    },
    screen: {
      width: window.screen?.width ?? null,
      height: window.screen?.height ?? null,
      pixelRatio: window.devicePixelRatio ?? 1
    },
    performance: navEntry
      ? {
          domComplete: navEntry.domComplete,
          loadEventEnd: navEntry.loadEventEnd,
          responseStart: navEntry.responseStart
        }
      : undefined,
    logs: Array.isArray(logs) ? logs.slice(-20) : undefined
  };
}
