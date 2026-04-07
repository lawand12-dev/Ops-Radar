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
var audit_report_1 = require("../../../lib/audit-report");
var supabase_1 = require("../../../lib/supabase");
var rate_limit_1 = require("../../../lib/rate-limit");
var security_1 = require("../../../lib/security");
var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var STRING_FIELDS = [
    'name',
    'email',
    'company',
    'agencyType',
    'teamSize',
    'revenue',
    'activeClients',
    'crmTool',
    'leadEntry',
    'progressTracking',
    'automationWish',
    'futureVision',
];
var ARRAY_COMPATIBLE_FIELDS = new Set(['tools', 'timeHeavy', 'onboarding']);
function normalizeAuditField(value, options) {
    var _a;
    if (options === void 0) { options = {}; }
    var maxLength = (_a = options.maxLength) !== null && _a !== void 0 ? _a : 1000;
    if (typeof value === 'string') {
        var sanitized = (0, security_1.sanitizeString)(value, maxLength);
        return sanitized || null;
    }
    if (options.allowArray && Array.isArray(value)) {
        if (value.length === 0 || value.length > 50 || value.some(function (item) { return typeof item !== 'string'; })) {
            return null;
        }
        var sanitizedItems = (0, security_1.sanitizeStringArray)(value, 50, maxLength);
        return sanitizedItems.length > 0 ? sanitizedItems.join(', ') : null;
    }
    return null;
}
function validateRequestBody(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return null;
    }
    var input = body;
    var normalized = {};
    for (var _i = 0, STRING_FIELDS_1 = STRING_FIELDS; _i < STRING_FIELDS_1.length; _i++) {
        var field = STRING_FIELDS_1[_i];
        var maxLength = field === 'email' ? 320 : 1000;
        var value = normalizeAuditField(input[field], { maxLength: maxLength });
        if (!value) {
            return null;
        }
        normalized[field] = value;
    }
    for (var _a = 0, ARRAY_COMPATIBLE_FIELDS_1 = ARRAY_COMPATIBLE_FIELDS; _a < ARRAY_COMPATIBLE_FIELDS_1.length; _a++) {
        var field = ARRAY_COMPATIBLE_FIELDS_1[_a];
        var value = normalizeAuditField(input[field], { allowArray: true, maxLength: 1000 });
        if (!value) {
            return null;
        }
        normalized[field] = value;
    }
    return normalized;
}
function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var rateLimitResponse, body, _a, name_1, email, company, agencyType, teamSize, revenue, activeClients, tools, crmTool, timeHeavy, leadEntry, onboarding, progressTracking, automationWish, futureVision, auditInput, audit, insertPayload, _b, data, error, notifyPayload, err_1;
        var _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _e.trys.push([0, 4, , 5]);
                    rateLimitResponse = (0, rate_limit_1.applyRateLimit)(request, 'generate-audit');
                    if (rateLimitResponse) {
                        return [2 /*return*/, rateLimitResponse];
                    }
                    _a = validateRequestBody;
                    return [4 /*yield*/, request.json()];
                case 1:
                    body = _a.apply(void 0, [_e.sent()]);
                    if (!body) {
                        return [2 /*return*/, Response.json({ error: 'Invalid request payload' }, { status: 400 })];
                    }
                    name_1 = body.name, email = body.email, company = body.company, agencyType = body.agencyType, teamSize = body.teamSize, revenue = body.revenue, activeClients = body.activeClients, tools = body.tools, crmTool = body.crmTool, timeHeavy = body.timeHeavy, leadEntry = body.leadEntry, onboarding = body.onboarding, progressTracking = body.progressTracking, automationWish = body.automationWish, futureVision = body.futureVision;
                    if (!EMAIL_REGEX.test(email)) {
                        return [2 /*return*/, Response.json({ error: 'Invalid email format' }, { status: 400 })];
                    }
                    auditInput = {
                        agencyType: agencyType,
                        teamSize: teamSize,
                        revenue: revenue,
                        activeClients: activeClients,
                        tools: tools,
                        crmTool: crmTool,
                        timeHeavy: timeHeavy,
                        leadEntry: leadEntry,
                        onboarding: onboarding,
                        progressTracking: progressTracking,
                        automationWish: automationWish,
                        futureVision: futureVision,
                    };
                    return [4 /*yield*/, (0, audit_report_1.generateAuditReport)(auditInput, 'preview')];
                case 2:
                    audit = _e.sent();
                    insertPayload = {
                        name: name_1,
                        email: email,
                        company: company,
                        answers: auditInput,
                        result: audit,
                        steps_completed: 12, // all 12 steps completed — used for funnel analysis
                    };
                    return [4 /*yield*/, supabase_1.supabase
                            .from('audits')
                            .insert(insertPayload)
                            .select('id')
                            .single()];
                case 3:
                    _b = _e.sent(), data = _b.data, error = _b.error;
                    if (error) {
                        console.error('[generate-audit] failed to persist audit');
                        return [2 /*return*/, Response.json({ audit: audit })];
                    }
                    notifyPayload = {
                        company: company,
                        name: name_1,
                        email: email,
                        teamSize: teamSize,
                        agencyType: agencyType,
                        timeWasters: automationWish,
                        automationReadinessScore: (_c = audit.automation_readiness_score) !== null && _c !== void 0 ? _c : 0,
                        estimatedAnnualWaste: (_d = audit.estimated_annual_waste) !== null && _d !== void 0 ? _d : null,
                    };
                    fetch(new URL('/api/notify', request.url).toString(), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-forwarded-for': (0, rate_limit_1.getClientIp)(request),
                        },
                        body: JSON.stringify(notifyPayload),
                    }).catch(function (err) { return console.error('[notify] Failed to send notification:', err); });
                    return [2 /*return*/, Response.json({ audit: audit, id: data.id })];
                case 4:
                    err_1 = _e.sent();
                    console.error('generate-audit error:', err_1);
                    return [2 /*return*/, (0, security_1.serverErrorResponse)()];
                case 5: return [2 /*return*/];
            }
        });
    });
}
