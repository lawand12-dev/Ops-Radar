"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
var resend_1 = require("resend");
var supabase_1 = require("../../../lib/supabase");
var rate_limit_1 = require("../../../lib/rate-limit");
var security_1 = require("../../../lib/security");
var audit_report_1 = require("../../../lib/audit-report");
var resend = new resend_1.Resend(process.env.RESEND_API_KEY);
var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://opsradar.ai';
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var rateLimitResponse, body, email, auditId, _a, data, auditError, targetEmail, auditInput, auditResult, updateError, emailUpdateError, company, readinessScore, annualWaste, resultsUrl, scoreColor, error, err_1;
        var _b, _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    _g.trys.push([0, 9, , 10]);
                    rateLimitResponse = (0, rate_limit_1.applyRateLimit)(request, 'send-unlock-email');
                    if (rateLimitResponse) {
                        return [2 /*return*/, rateLimitResponse];
                    }
                    return [4 /*yield*/, request.json()];
                case 1:
                    body = _g.sent();
                    email = (0, security_1.sanitizeString)(String((_b = body === null || body === void 0 ? void 0 : body.email) !== null && _b !== void 0 ? _b : ''), 320);
                    auditId = typeof (body === null || body === void 0 ? void 0 : body.auditId) === 'string' ? (0, security_1.sanitizeString)(body.auditId, 200) : null;
                    if (!auditId) {
                        return [2 /*return*/, Response.json({ error: 'Invalid audit reference' }, { status: 400 })];
                    }
                    return [4 /*yield*/, supabase_1.supabase
                            .from('audits')
                            .select('company, email, answers, result')
                            .eq('id', auditId)
                            .single()];
                case 2:
                    _a = _g.sent(), data = _a.data, auditError = _a.error;
                    if (auditError || !data) {
                        return [2 /*return*/, Response.json({ error: 'Invalid audit reference' }, { status: 404 })];
                    }
                    targetEmail = email || (0, security_1.sanitizeString)(String((_c = data.email) !== null && _c !== void 0 ? _c : ''), 320);
                    if (!targetEmail || !EMAIL_REGEX.test(targetEmail)) {
                        return [2 /*return*/, Response.json({ error: 'Invalid email' }, { status: 400 })];
                    }
                    auditInput = (0, audit_report_1.coerceAuditInput)(data.answers);
                    if (!auditInput) {
                        return [2 /*return*/, (0, security_1.serverErrorResponse)()];
                    }
                    auditResult = data.result;
                    if (!(!auditResult || (0, audit_report_1.isPreviewAuditReport)(auditResult))) return [3 /*break*/, 5];
                    return [4 /*yield*/, (0, audit_report_1.generateAuditReport)(auditInput, 'full')];
                case 3:
                    auditResult = _g.sent();
                    return [4 /*yield*/, supabase_1.supabase
                            .from('audits')
                            .update({
                            email: targetEmail,
                            result: auditResult,
                        })
                            .eq('id', auditId)];
                case 4:
                    updateError = (_g.sent()).error;
                    if (updateError) {
                        console.error('[send-unlock-email] failed to persist full audit');
                        return [2 /*return*/, (0, security_1.serverErrorResponse)()];
                    }
                    return [3 /*break*/, 7];
                case 5:
                    if (!(targetEmail !== data.email)) return [3 /*break*/, 7];
                    return [4 /*yield*/, supabase_1.supabase
                            .from('audits')
                            .update({ email: targetEmail })
                            .eq('id', auditId)];
                case 6:
                    emailUpdateError = (_g.sent()).error;
                    if (emailUpdateError) {
                        console.error('[send-unlock-email] failed to update email');
                        return [2 /*return*/, (0, security_1.serverErrorResponse)()];
                    }
                    _g.label = 7;
                case 7:
                    company = (_d = data.company) !== null && _d !== void 0 ? _d : '';
                    readinessScore = (_e = auditResult === null || auditResult === void 0 ? void 0 : auditResult.automation_readiness_score) !== null && _e !== void 0 ? _e : null;
                    annualWaste = (_f = auditResult === null || auditResult === void 0 ? void 0 : auditResult.estimated_annual_waste) !== null && _f !== void 0 ? _f : null;
                    resultsUrl = auditId
                        ? "".concat(BASE_URL, "/results?id=").concat(auditId)
                        : "".concat(BASE_URL, "/audit");
                    scoreColor = readinessScore != null
                        ? readinessScore >= 60 ? '#10b981' : readinessScore >= 30 ? '#f59e0b' : '#ef4444'
                        : '#60a5fa';
                    return [4 /*yield*/, resend.emails.send({
                            from: 'OpsRadar <onboarding@resend.dev>',
                            to: targetEmail,
                            subject: "Your OpsRadar Automation Blueprint".concat(company ? " \u2014 ".concat(company) : ''),
                            html: "\n        <div style=\"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#060c1e;color:#eef2ff;border-radius:14px;overflow:hidden;\">\n\n          <!-- Header -->\n          <div style=\"background:linear-gradient(135deg,#0f1e45 0%,#060c1e 100%);padding:36px 36px 28px;border-bottom:1px solid rgba(173,198,255,0.08);\">\n            <div style=\"font-size:22px;font-weight:800;letter-spacing:-0.5px;background:linear-gradient(90deg,#60a5fa,#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:6px;\">\n              OpsRadar\n            </div>\n            <p style=\"margin:0;font-size:13px;color:rgba(255,255,255,0.35);\">Your full automation blueprint is unlocked</p>\n          </div>\n\n          <!-- Body -->\n          <div style=\"padding:32px 36px;\">\n            <h1 style=\"margin:0 0 12px;font-size:24px;font-weight:700;letter-spacing:-0.5px;color:#eef2ff;\">\n              Here's your complete blueprint".concat(company ? ", ".concat((0, security_1.escapeHtml)(company)) : '', " \uD83D\uDD13\n            </h1>\n            <p style=\"margin:0 0 28px;font-size:15px;color:rgba(255,255,255,0.55);line-height:1.65;\">\n              Your full OpsRadar report is ready \u2014 including automation flows, n8n nodes,\n              implementation steps, your 90-day roadmap, and tool recommendations.\n            </p>\n\n            ").concat((readinessScore != null || annualWaste != null) ? "\n            <!-- Stats row -->\n            <div style=\"display:flex;gap:12px;margin-bottom:28px;\">\n              ".concat(readinessScore != null ? "\n              <div style=\"flex:1;background:rgba(59,130,246,0.07);border:1px solid rgba(59,130,246,0.2);border-radius:10px;padding:16px;text-align:center;\">\n                <p style=\"margin:0 0 4px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.3);\">Readiness Score</p>\n                <p style=\"margin:0;font-size:30px;font-weight:800;color:".concat(scoreColor, ";\">").concat(readinessScore, "<span style=\"font-size:14px;font-weight:400;color:rgba(255,255,255,0.25);\">/100</span></p>\n              </div>") : '', "\n              ").concat(annualWaste != null ? "\n              <div style=\"flex:1;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:10px;padding:16px;text-align:center;\">\n                <p style=\"margin:0 0 4px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.3);\">Annual Savings Potential</p>\n                <p style=\"margin:0;font-size:30px;font-weight:800;color:#fbbf24;\">$".concat((annualWaste / 1000).toFixed(0), "K</p>\n              </div>") : '', "\n            </div>\n            ") : '', "\n\n            <!-- CTA -->\n            <a href=\"").concat(resultsUrl, "\" style=\"display:block;text-align:center;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:16px 28px;border-radius:12px;margin-bottom:20px;letter-spacing:-0.2px;box-shadow:0 0 30px rgba(59,130,246,0.3);\">\n              View My Full Blueprint \u2192\n            </a>\n            <p style=\"margin:0 0 28px;font-size:12px;color:rgba(255,255,255,0.2);text-align:center;\">\n              Or copy this link: <a href=\"").concat((0, security_1.escapeHtml)(resultsUrl), "\" style=\"color:rgba(173,198,255,0.5);word-break:break-all;\">").concat((0, security_1.escapeHtml)(resultsUrl), "</a>\n            </p>\n\n            <!-- What's unlocked -->\n            <div style=\"background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px;margin-bottom:24px;\">\n              <p style=\"margin:0 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.3);\">What's now unlocked</p>\n              ").concat(['Automation flows with n8n node breakdowns', 'Step-by-step implementation guides', '90-day phased roadmap', 'Tool stack recommendations', 'Onboarding time savings analysis'].map(function (item) { return "\n              <div style=\"display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.04);\">\n                <div style=\"width:18px;height:18px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.25);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;\">\n                  <span style=\"color:#10b981;font-size:10px;\">\u2713</span>\n                </div>\n                <span style=\"font-size:13px;color:rgba(255,255,255,0.6);\">".concat(item, "</span>\n              </div>"); }).join(''), "\n            </div>\n\n            <!-- CTA 2: Book call -->\n            <div style=\"background:rgba(173,198,255,0.04);border:1px solid rgba(173,198,255,0.12);border-radius:12px;padding:20px;text-align:center;\">\n              <p style=\"margin:0 0 6px;font-size:14px;font-weight:600;color:#eef2ff;\">Want us to build this for you?</p>\n              <p style=\"margin:0 0 14px;font-size:12px;color:rgba(255,255,255,0.4);\">20-minute strategy call. We scope your top automation and give you an exact price.</p>\n              <a href=\"https://calendly.com/opsradar-ai/ops-radar-strategy-call\" style=\"display:inline-block;background:rgba(173,198,255,0.1);border:1px solid rgba(173,198,255,0.25);color:#adc6ff;font-size:13px;font-weight:600;text-decoration:none;padding:10px 22px;border-radius:9px;\">\n                Book Free Strategy Call \u2192\n              </a>\n            </div>\n          </div>\n\n          <!-- Footer -->\n          <div style=\"padding:20px 36px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;\">\n            <p style=\"margin:0;font-size:11px;color:rgba(255,255,255,0.15);\">OpsRadar \u00B7 Done-For-You Agency Automation \u00B7 <a href=\"").concat(BASE_URL, "\" style=\"color:rgba(255,255,255,0.2);\">opsradar.ai</a></p>\n          </div>\n        </div>\n      "),
                        })];
                case 8:
                    error = (_g.sent()).error;
                    if (error) {
                        console.error('[send-unlock-email] Resend error:', error);
                        return [2 /*return*/, (0, security_1.serverErrorResponse)()];
                    }
                    return [2 /*return*/, Response.json({ ok: true, audit: auditResult, email: targetEmail })];
                case 9:
                    err_1 = _g.sent();
                    console.error('[send-unlock-email] Unexpected error:', err_1);
                    return [2 /*return*/, (0, security_1.serverErrorResponse)()];
                case 10: return [2 /*return*/];
            }
        });
    });
}
