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
var rate_limit_1 = require("../../../lib/rate-limit");
var security_1 = require("../../../lib/security");
var resend = new resend_1.Resend(process.env.RESEND_API_KEY);
var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var rateLimitResponse, body, payload, to, annualWaste, error, err_1;
        var _a, _b, _c, _d, _e, _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    _h.trys.push([0, 3, , 4]);
                    rateLimitResponse = (0, rate_limit_1.applyRateLimit)(request, 'notify');
                    if (rateLimitResponse) {
                        return [2 /*return*/, rateLimitResponse];
                    }
                    return [4 /*yield*/, request.json()];
                case 1:
                    body = _h.sent();
                    payload = {
                        company: (0, security_1.sanitizeString)(String((_a = body === null || body === void 0 ? void 0 : body.company) !== null && _a !== void 0 ? _a : ''), 200),
                        name: (0, security_1.sanitizeString)(String((_b = body === null || body === void 0 ? void 0 : body.name) !== null && _b !== void 0 ? _b : ''), 200),
                        email: (0, security_1.sanitizeString)(String((_c = body === null || body === void 0 ? void 0 : body.email) !== null && _c !== void 0 ? _c : ''), 320),
                        teamSize: (0, security_1.sanitizeString)(String((_d = body === null || body === void 0 ? void 0 : body.teamSize) !== null && _d !== void 0 ? _d : ''), 200),
                        agencyType: (0, security_1.sanitizeString)(String((_e = body === null || body === void 0 ? void 0 : body.agencyType) !== null && _e !== void 0 ? _e : ''), 200),
                        timeWasters: (0, security_1.sanitizeString)(String((_f = body === null || body === void 0 ? void 0 : body.timeWasters) !== null && _f !== void 0 ? _f : ''), 1000),
                        automationReadinessScore: Number((_g = body === null || body === void 0 ? void 0 : body.automationReadinessScore) !== null && _g !== void 0 ? _g : 0),
                        estimatedAnnualWaste: typeof (body === null || body === void 0 ? void 0 : body.estimatedAnnualWaste) === 'number' ? body.estimatedAnnualWaste : null,
                    };
                    if (!payload.company || !payload.name || !payload.teamSize || !payload.agencyType) {
                        return [2 /*return*/, Response.json({ error: 'Invalid request payload' }, { status: 400 })];
                    }
                    if (!EMAIL_REGEX.test(payload.email)) {
                        return [2 /*return*/, Response.json({ error: 'Invalid email format' }, { status: 400 })];
                    }
                    to = process.env.NOTIFICATION_EMAIL;
                    if (!to) {
                        console.error('[notify] missing notification email configuration');
                        return [2 /*return*/, (0, security_1.serverErrorResponse)()];
                    }
                    annualWaste = payload.estimatedAnnualWaste != null
                        ? "$".concat(payload.estimatedAnnualWaste.toLocaleString())
                        : 'N/A';
                    return [4 /*yield*/, resend.emails.send({
                            from: 'OpsRadar <onboarding@resend.dev>',
                            to: to,
                            subject: "New OpsRadar Audit \u2014 ".concat(payload.company),
                            html: "\n        <div style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0f1e; color: #eef2ff; padding: 32px; border-radius: 12px;\">\n          <div style=\"margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.08);\">\n            <h1 style=\"margin: 0 0 4px; font-size: 22px; font-weight: 700; color: #eef2ff;\">\n              New Audit Completed\n            </h1>\n            <p style=\"margin: 0; font-size: 13px; color: rgba(255,255,255,0.4);\">OpsRadar \u00B7 ".concat(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), "</p>\n          </div>\n\n          <table style=\"width: 100%; border-collapse: collapse; margin-bottom: 24px;\">\n            <tr>\n              <td style=\"padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: rgba(255,255,255,0.3); width: 40%;\">Company</td>\n              <td style=\"padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 14px; color: #eef2ff; font-weight: 600;\">").concat((0, security_1.escapeHtml)(payload.company), "</td>\n            </tr>\n            <tr>\n              <td style=\"padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: rgba(255,255,255,0.3);\">Contact</td>\n              <td style=\"padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 14px; color: #eef2ff;\">").concat((0, security_1.escapeHtml)(payload.name), "</td>\n            </tr>\n            <tr>\n              <td style=\"padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: rgba(255,255,255,0.3);\">Email</td>\n              <td style=\"padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 14px;\"><a href=\"mailto:").concat((0, security_1.escapeHtml)(payload.email), "\" style=\"color: #60a5fa; text-decoration: none;\">").concat((0, security_1.escapeHtml)(payload.email), "</a></td>\n            </tr>\n            <tr>\n              <td style=\"padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: rgba(255,255,255,0.3);\">Team Size</td>\n              <td style=\"padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 14px; color: #eef2ff;\">").concat((0, security_1.escapeHtml)(payload.teamSize), "</td>\n            </tr>\n            <tr>\n              <td style=\"padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: rgba(255,255,255,0.3);\">Industry</td>\n              <td style=\"padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 14px; color: #eef2ff;\">").concat((0, security_1.escapeHtml)(payload.agencyType), "</td>\n            </tr>\n            <tr>\n              <td style=\"padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: rgba(255,255,255,0.3);\">Top Time Wasters</td>\n              <td style=\"padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 14px; color: rgba(255,255,255,0.7);\">").concat((0, security_1.escapeHtml)(payload.timeWasters), "</td>\n            </tr>\n          </table>\n\n          <div style=\"display: flex; gap: 12px; margin-bottom: 24px;\">\n            <div style=\"flex: 1; background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.2); border-radius: 10px; padding: 16px; text-align: center;\">\n              <p style=\"margin: 0 0 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255,255,255,0.35);\">Readiness Score</p>\n              <p style=\"margin: 0; font-size: 28px; font-weight: 800; color: ").concat(payload.automationReadinessScore >= 60 ? '#10b981' : payload.automationReadinessScore >= 30 ? '#f59e0b' : '#ef4444', ";\">").concat(payload.automationReadinessScore, "<span style=\"font-size: 14px; font-weight: 400; color: rgba(255,255,255,0.3);\">/100</span></p>\n            </div>\n            <div style=\"flex: 1; background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.15); border-radius: 10px; padding: 16px; text-align: center;\">\n              <p style=\"margin: 0 0 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255,255,255,0.35);\">Annual Waste</p>\n              <p style=\"margin: 0; font-size: 28px; font-weight: 800; color: #fbbf24;\">").concat(annualWaste, "</p>\n            </div>\n          </div>\n\n          <p style=\"margin: 0; font-size: 12px; color: rgba(255,255,255,0.2); text-align: center;\">OpsRadar \u00B7 Automated audit notification</p>\n        </div>\n      "),
                        })];
                case 2:
                    error = (_h.sent()).error;
                    if (error) {
                        console.error('[notify] Resend error:', error);
                        return [2 /*return*/, (0, security_1.serverErrorResponse)()];
                    }
                    return [2 /*return*/, Response.json({ ok: true })];
                case 3:
                    err_1 = _h.sent();
                    console.error('[notify] Unexpected error:', err_1);
                    return [2 /*return*/, (0, security_1.serverErrorResponse)()];
                case 4: return [2 /*return*/];
            }
        });
    });
}
