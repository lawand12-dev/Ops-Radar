"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClientIp = getClientIp;
exports.checkRateLimit = checkRateLimit;
exports.applyRateLimit = applyRateLimit;
var ONE_HOUR_MS = 60 * 60 * 1000;
var rateLimiter = new Map();
var RATE_LIMITS = {
    'admin-auth': { limit: 10, windowMs: ONE_HOUR_MS },
    'audit-step': { limit: 120, windowMs: ONE_HOUR_MS },
    'build-request': { limit: 10, windowMs: ONE_HOUR_MS },
    chat: { limit: 20, windowMs: ONE_HOUR_MS },
    'chat-history': { limit: 10, windowMs: ONE_HOUR_MS },
    'funnel-event': { limit: 240, windowMs: ONE_HOUR_MS },
    'generate-audit': { limit: 3, windowMs: ONE_HOUR_MS },
    notify: { limit: 5, windowMs: ONE_HOUR_MS },
    'notify-chat-lead': { limit: 10, windowMs: ONE_HOUR_MS },
    'send-unlock-email': { limit: 10, windowMs: ONE_HOUR_MS },
};
function pruneExpiredEntries(now) {
    for (var _i = 0, _a = rateLimiter.entries(); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], entry = _b[1];
        if (entry.resetAt <= now) {
            rateLimiter.delete(key);
        }
    }
}
function getClientIp(request) {
    var _a;
    var forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return ((_a = forwardedFor.split(',')[0]) === null || _a === void 0 ? void 0 : _a.trim()) || 'anonymous';
    }
    return (request.headers.get('x-real-ip') ||
        request.headers.get('cf-connecting-ip') ||
        request.headers.get('fly-client-ip') ||
        'anonymous');
}
function checkRateLimit(key, limit, windowMs) {
    var now = Date.now();
    pruneExpiredEntries(now);
    var entry = rateLimiter.get(key);
    if (!entry || entry.resetAt <= now) {
        rateLimiter.set(key, { count: 1, resetAt: now + windowMs });
        return true;
    }
    if (entry.count >= limit) {
        return false;
    }
    entry.count += 1;
    rateLimiter.set(key, entry);
    return true;
}
function applyRateLimit(request, routeName) {
    var config = RATE_LIMITS[routeName];
    var ip = getClientIp(request);
    var allowed = checkRateLimit("".concat(routeName, ":").concat(ip), config.limit, config.windowMs);
    if (allowed) {
        return null;
    }
    return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
}
