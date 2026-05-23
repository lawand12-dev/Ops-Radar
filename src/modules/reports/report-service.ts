import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { env } from "../../config/env";
import { dbQuery, getDb } from "../../lib/db";
import { AppError } from "../../lib/errors";
import { logInfo, logWarn, logError } from "../../lib/logger";
import { fetchWithTimeout } from "../../lib/fetch-with-timeout";
import { recentBreadcrumbs } from "../memory/breadcrumbs";
import { selectPatternCards, buildPatternCardsPromptBlock } from "../memory/pattern-cards";
import { enqueueEmbeddingJob, type EmbeddingSourceKind } from "../memory/embedding-jobs";

// Email / reports config resolved from process.env so the caller doesn't need
// to modify env.ts before using these features.
const RESEND_API_KEY = process.env["RESEND_API_KEY"] ?? null;
const SMTP_FROM = process.env["SMTP_FROM"] ?? "reports@ops-platform.local";
const REPORTS_ENABLED = process.env["REPORTS_ENABLED"] === "true";

// company_brain is a superset kind not yet in the core EmbeddingSourceKind union.
const COMPANY_BRAIN_KIND = "company_brain" as EmbeddingSourceKind;

export type ReportType = "executive_summary" | "risk_analysis" | "operational_review";

export interface GenerateReportInput {
  userId: string;
  userEmail: string;
  reportType?: ReportType;
  sendEmail?: boolean;
}

export interface ReportResult {
  report_id: string;
  title: string;
  content_chars: number;
  email_sent: boolean;
  created_at: string;
}

export interface ReportItem {
  id: string;
  report_type: string;
  title: string;
  content_chars: number;
  email_delivered: boolean;
  created_at: string;
}

const REPORT_TITLE_MAP: Record<ReportType, string> = {
  executive_summary: "Executive Summary",
  risk_analysis: "Risk Analysis Report",
  operational_review: "Operational Review"
};

const SYSTEM_PROMPT = `You are a senior executive analyst generating a structured business report.
Create a comprehensive report based on the operational data provided.
Format the report as clean HTML with sections: Executive Summary, Key Metrics, Risks & Issues, Recommendations, Operational Highlights.
Use <h2> for section headers, <p> for paragraphs, <ul>/<li> for lists.
Keep the report factual, data-driven, and actionable. Target length: 600-900 words.`;

// ---------------------------------------------------------------------------
// Email delivery via Resend API
// ---------------------------------------------------------------------------

export async function sendEmailViaResend(
  to: string,
  subject: string,
  htmlBody: string
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    logWarn("email", "RESEND_API_KEY not configured; skipping email delivery");
    return false;
  }
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: SMTP_FROM || "reports@ops-platform.local",
        to: [to],
        subject,
        html: htmlBody
      })
    });
    if (!resp.ok) {
      const err = await resp.text();
      logWarn("email", "Resend API error", { status: resp.status, body: err.slice(0, 200) });
      return false;
    }
    return true;
  } catch (err) {
    logWarn("email", "Email send failed", {
      error: err instanceof Error ? err.message : String(err)
    });
    return false;
  }
}

// ---------------------------------------------------------------------------
// Context building
// ---------------------------------------------------------------------------

function buildContextBlock(
  breadcrumbLines: string[],
  patternBlock: string
): string {
  const sections: string[] = [];

  if (breadcrumbLines.length > 0) {
    sections.push(`=== RECENT ACTIVITY ===\n${breadcrumbLines.join("\n")}`);
  }

  if (patternBlock) {
    sections.push(`=== PATTERNS ===\n${patternBlock}`);
  }

  return sections.join("\n\n");
}

// Strip HTML tags to produce plain text for embedding.
function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(h[1-6]|p|li|ul|ol|div|section)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------------------------------------------------------------------------
// generateReport
// ---------------------------------------------------------------------------

export async function generateReport(input: GenerateReportInput): Promise<ReportResult> {
  const startedAt = Date.now();
  const reportType: ReportType = input.reportType ?? "executive_summary";

  if (!env.ANTHROPIC_API_KEY) {
    throw new AppError(500, "AI_CONFIG_ERROR", "AI not configured for reports.");
  }

  // 1. Gather breadcrumbs (7 days, up to 40 entries)
  let breadcrumbText = "";
  try {
    const crumbs = await recentBreadcrumbs({
      ownerUserId: input.userId,
      sinceHours: 7 * 24,
      limit: 40
    });
    const lines: string[] = [];
    for (const c of crumbs) {
      const ts = c.at instanceof Date ? c.at.toISOString() : String(c.at);
      const summary = c.summary ?? "(no summary)";
      const outcome = c.outcome ? ` [${c.outcome}]` : "";
      lines.push(`[${ts}] ${c.kind}${outcome}: ${summary}`);
    }
    breadcrumbText = lines.join("\n").slice(0, 3000);
  } catch (err) {
    logWarn("reports", "Breadcrumb fetch failed; proceeding without context", {
      error: err instanceof Error ? err.message : String(err)
    });
  }

  // 2. Gather pattern cards (up to 1000 chars)
  let patternBlock = "";
  try {
    const cards = selectPatternCards({ prompt: reportType, outputKind: "coo_playbook" });
    const raw = buildPatternCardsPromptBlock(cards);
    patternBlock = raw.slice(0, 1000);
  } catch (err) {
    logWarn("reports", "Pattern card selection failed; proceeding without cards", {
      error: err instanceof Error ? err.message : String(err)
    });
  }

  const contextBlock = buildContextBlock(breadcrumbText ? [breadcrumbText] : [], patternBlock);
  const title = REPORT_TITLE_MAP[reportType];

  // 3. Call Anthropic
  const userMessage = `Generate a ${reportType} report for this period.\n\nCONTEXT:\n${contextBlock || "(no context available)"}`;

  const response = await fetchWithTimeout({
    url: `${env.ANTHROPIC_BASE_URL}/messages`,
    timeoutMs: env.AI_REQUEST_TIMEOUT_MS,
    requestName: "anthropic.messages:reports",
    errorCode: "AI_REQUEST_TIMEOUT",
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": env.ANTHROPIC_VERSION
      },
      body: JSON.stringify({
        model: env.AI_MODEL_COMPLEX || env.AI_MODEL_PRIMARY,
        max_tokens: env.ANTHROPIC_MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }]
      })
    }
  });

  if (!response.ok) {
    const details = await response.text();
    logError("reports", "AI request failed", { status: response.status, body: details.slice(0, 200) });
    throw new AppError(502, "AI_REQUEST_FAILED", "Report generation failed.", {
      status: response.status
    });
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  const reportContent = payload.content?.find((p) => p.type === "text")?.text ?? "";
  const tokensUsed =
    (payload.usage?.input_tokens ?? 0) + (payload.usage?.output_tokens ?? 0) || 0;

  const latencyMs = Date.now() - startedAt;
  const reportId = randomUUID();

  // 4. Persist report
  interface ReportRow extends RowDataPacket {
    id: string;
  }
  await dbQuery<ReportRow[]>(
    getDb(),
    `INSERT INTO ai_reports
       (id, user_id, report_type, title, content, content_chars, tokens_used, latency_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reportId,
      input.userId,
      reportType,
      title,
      reportContent,
      reportContent.length,
      tokensUsed || null,
      latencyMs
    ]
  );

  logInfo("reports", "Report generated", {
    report_id: reportId,
    user_id: input.userId,
    report_type: reportType,
    content_chars: reportContent.length,
    latency_ms: latencyMs
  });

  // 5. Optionally send email
  let emailSent = false;
  if (input.sendEmail && input.userEmail) {
    const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;">
<h1>${title}</h1>
${reportContent}
<hr>
<p style="color:#666;font-size:12px;">Generated on ${new Date().toUTCString()}</p>
</body>
</html>`;

    emailSent = await sendEmailViaResend(input.userEmail, title, emailHtml);

    if (emailSent) {
      await dbQuery(
        getDb(),
        `UPDATE ai_reports SET email_delivered = 1, email_delivered_at = NOW() WHERE id = ?`,
        [reportId]
      );
    }
  }

  // 6. Fire-and-forget: enqueue for embedding
  const plainText = htmlToPlainText(reportContent).slice(0, 3000);
  enqueueEmbeddingJob({
    ownerUserId: input.userId,
    sourceKind: COMPANY_BRAIN_KIND,
    sourceId: reportId,
    content: plainText,
    metadata: { report_type: reportType, title }
  }).catch((err) => {
    logWarn("reports", "Failed to enqueue report embedding", {
      report_id: reportId,
      error: err instanceof Error ? err.message : String(err)
    });
  });

  return {
    report_id: reportId,
    title,
    content_chars: reportContent.length,
    email_sent: emailSent,
    created_at: new Date().toISOString()
  };
}

// ---------------------------------------------------------------------------
// listReports
// ---------------------------------------------------------------------------

interface ReportListRow extends RowDataPacket {
  id: string;
  report_type: string;
  title: string;
  content_chars: number;
  email_delivered: number;
  created_at: Date | string;
}

export async function listReports(
  userId: string,
  limit = 20,
  offset = 0
): Promise<ReportItem[]> {
  const safeLimit = Math.min(Math.max(1, limit), 50);
  const safeOffset = Math.max(0, offset);

  const [rows] = await dbQuery<ReportListRow[]>(
    getDb(),
    `SELECT id, report_type, title, content_chars, email_delivered, created_at
       FROM ai_reports
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`,
    [userId, safeLimit, safeOffset]
  );

  return rows.map((r) => ({
    id: r.id,
    report_type: r.report_type,
    title: r.title,
    content_chars: r.content_chars,
    email_delivered: Boolean(r.email_delivered),
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at)
  }));
}

export { REPORTS_ENABLED };
