import type { FeedbackEntity } from "../feedback-store.js";
import { mailConfig } from "../../config/mail.js";

export type MailSummary = {
  totalCreated: number;
  totalUpdated: number;
  startedAt: Date;
  finishedAt: Date;
  lastSuccessAt: Date | null;
};

export type MailPayload = {
  subject: string;
  html: string;
  text: string;
};

type BuildMailContentInput = {
  items: FeedbackEntity[];
  summary: MailSummary;
  subjectTemplate?: string;
  context?: Record<string, string | null | undefined>;
};

const PLATFORM_LABEL: Record<string, string> = {
  youtube: "YouTube",
  reddit: "Reddit"
};

const DATE_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit"
});

const NUMBER_FORMATTER = new Intl.NumberFormat("zh-CN");

export function buildMailContent(input: BuildMailContentInput): MailPayload {
  const { items, summary } = input;

  const context = input.context ?? {};

  const subject = formatSubject(input.subjectTemplate ?? mailConfig.subjectTemplate, {
    date: DATE_FORMATTER.format(summary.finishedAt),
    count: String(items.length),
    platforms:
      context.platforms && context.platforms.length > 0
        ? context.platforms
        : mailConfig.to.length
        ? mailConfig.to.join(", ")
        : "",
    recipient:
      context.recipient && context.recipient.length > 0
        ? context.recipient
        : mailConfig.to.length
        ? mailConfig.to.join(", ")
        : "",
    keywords: context.keywords ?? "",
    totalCreated: String(summary.totalCreated),
    totalUpdated: String(summary.totalUpdated)
  });

  const htmlBody = renderHtml(items, summary);
  const textBody = renderText(items, summary);

  return {
    subject,
    html: htmlBody,
    text: textBody
  };
}

function formatSubject(template: string, context: Record<string, string>): string {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => context[key] ?? "");
}

function renderHtml(items: FeedbackEntity[], summary: MailSummary): string {
  const header = `
    <p>任务时间：${DATE_FORMATTER.format(summary.startedAt)} ~ ${DATE_FORMATTER.format(summary.finishedAt)}</p>
    <p>上次成功时间：${summary.lastSuccessAt ? DATE_FORMATTER.format(summary.lastSuccessAt) : "首次运行"}</p>
    <p>新增记录：<strong>${summary.totalCreated}</strong>，更新记录：<strong>${summary.totalUpdated}</strong></p>
  `;

  const body =
    items.length === 0
      ? "<p>本轮未检测到新增内容。</p>"
      : renderCardLayout(items);

  return `
    <div style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#111827;line-height:1.6;">
      <h2 style="margin-bottom:16px;">Product Insight 每日摘要</h2>
      ${header}
      ${body}
      <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;" />
      <p style="color:#6b7280;">本邮件由系统自动发送，如有疑问请联系团队。</p>
    </div>
  `;
}

function renderCardLayout(items: FeedbackEntity[]): string {
  const grouped = groupByPlatform(items);
  const sections: string[] = [];

  for (const [platform, platformItems] of grouped.entries()) {
    const platformLabel = PLATFORM_LABEL[platform] ?? platform;
    const primaryLabel = platform === "youtube" ? "播放量" : "点赞数";
    const keywords = groupByKeyword(platformItems);
    const keywordSections: string[] = [];

    for (const [keyword, keywordItems] of keywords.entries()) {
      const cards = keywordItems
        .map((item) => renderCard(platform, primaryLabel, item))
        .join("\n");

      keywordSections.push(`
        <div style="margin-bottom:16px;">
          <div style="font-size:13px;color:#6b7280;margin-bottom:8px;">关键词：${escapeHtml(keyword)}</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;">
            ${cards}
          </div>
        </div>
      `);
    }

    sections.push(`
      <div style="margin-top:24px;">
        <h3 style="margin:0 0 12px 0;">${platformLabel}</h3>
        ${keywordSections.join("\n")}
      </div>
    `);
  }

  return sections.join("\n");
}

function renderCard(
  platform: string,
  primaryLabel: string,
  item: FeedbackEntity
): string {
  const matchedKeywords = extractMatchedKeywords(item);
  const targetUrl = platform === "reddit" ? item.permalink || item.url : item.url;
  return `
    <div style="border:1px solid #e5e7eb;border-radius:10px;padding:12px;background:#ffffff;box-shadow:0 1px 2px rgba(15,23,42,0.08);">
      <a href="${targetUrl}" style="font-size:15px;font-weight:600;color:#2563eb;text-decoration:none;display:block;margin-bottom:8px;">
        ${escapeHtml(item.title)}
      </a>
      <div style="font-size:13px;color:#6b7280;margin-bottom:12px;">平台：${PLATFORM_LABEL[platform] ?? platform} · 关键词：${escapeHtml(matchedKeywords.join(", "))}</div>
      <div style="display:flex;flex-direction:column;gap:6px;font-size:13px;color:#374151;">
        <div>作者：${escapeHtml(item.author ?? "-")}</div>
        <div>${primaryLabel}：${formatMetric(platform, item)}</div>
        <div>评论数：${formatNumber(item.comment_count)}</div>
        <div>发布时间：${item.published_at ? DATE_FORMATTER.format(item.published_at) : "-"}</div>
      </div>
    </div>
  `;
}

function renderText(items: FeedbackEntity[], summary: MailSummary): string {
  const lines: string[] = [
    "Product Insight 每日摘要",
    `任务时间：${DATE_FORMATTER.format(summary.startedAt)} ~ ${DATE_FORMATTER.format(summary.finishedAt)}`,
    `上次成功时间：${summary.lastSuccessAt ? DATE_FORMATTER.format(summary.lastSuccessAt) : "首次运行"}`,
    `新增记录：${summary.totalCreated}，更新记录：${summary.totalUpdated}`,
    ""
  ];

  if (items.length === 0) {
    lines.push("本轮未检测到新增内容。");
  } else {
    const grouped = groupByPlatform(items);
    for (const [platform, platformItems] of grouped.entries()) {
      lines.push(`== ${PLATFORM_LABEL[platform] ?? platform} ==`);
      const keywords = groupByKeyword(platformItems);
      for (const [keyword, keywordItems] of keywords.entries()) {
        lines.push(`  - 关键词：${keyword}`);
        keywordItems.forEach((item, idx) => {
          const matchedKeywords = extractMatchedKeywords(item);
          const primaryLabel = platform === "youtube" ? "播放量" : "点赞数";
          lines.push(`    ${idx + 1}. ${item.title}`);
          lines.push(`       作者：${item.author ?? "-"}`);
          lines.push(`       关键词：${matchedKeywords.join(", ")}`);
          lines.push(`       ${primaryLabel}：${formatMetric(platform, item)}`);
          lines.push(`       评论数：${formatNumber(item.comment_count)}`);
          lines.push(`       发布时间：${item.published_at ? DATE_FORMATTER.format(item.published_at) : "-"}`);
          const targetUrl = platform === "reddit" ? item.permalink || item.url : item.url;
          lines.push(`       链接：${targetUrl}`);
        });
      }
    }
  }

  lines.push("");
  lines.push("本邮件由系统自动发送，如需退订请联系团队。");
  return lines.join("\n");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#039;";
      default:
        return char;
    }
  });
}

function groupByPlatform(items: FeedbackEntity[]): Map<string, FeedbackEntity[]> {
  const map = new Map<string, FeedbackEntity[]>();
  for (const item of items) {
    const list = map.get(item.platform) ?? [];
    list.push(item);
    map.set(item.platform, list);
  }
  return map;
}

function groupByKeyword(items: FeedbackEntity[]): Map<string, FeedbackEntity[]> {
  const map = new Map<string, FeedbackEntity[]>();
  for (const item of items) {
    const list = map.get(item.keyword) ?? [];
    list.push(item);
    map.set(item.keyword, list);
  }
  return map;
}

function formatMetric(platform: string, item: FeedbackEntity): string {
  if (platform === "youtube") {
    return formatNumber(item.view_count);
  }
  return formatNumber(item.score);
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "-";
  }
  if (Number.isNaN(value)) {
    return "-";
  }
  return NUMBER_FORMATTER.format(value);
}

function extractMatchedKeywords(item: FeedbackEntity): string[] {
  const maybeMatched = (item as FeedbackEntity & { matchedKeywords?: string[] }).matchedKeywords;
  if (Array.isArray(maybeMatched) && maybeMatched.length > 0) {
    return maybeMatched;
  }
  return [item.keyword];
}
