(function () {
    const NAME_FILE = 'vanilla-medical-body-server/nodejs.js';
    console.log(NAME_FILE);

    const path = require('path');

    require('../vanilla-common-node/define.js');
    global.load('vanilla-common-router/index.js');

    const KEY_PROCESS = 'vanilla-medical-body-server';
    const PORT = global.PORT_SERVER[KEY_PROCESS] || 3024;
    const WEB_ROOT = path.join(__dirname, '..', 'vanilla-web', KEY_PROCESS);
    const MEDICAL_CSP = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "media-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "frame-ancestors 'self'",
        "form-action 'self'"
    ].join('; ');
    const ALLOWED_ORIGINS = parseList(process.env.MEDICAL_BODY_ALLOWED_ORIGINS);

    global.setWebRootPath(KEY_PROCESS, 'vanilla-web');
    global.buildCSP = function () {
        return MEDICAL_CSP;
    };
    global.resolveCorsHeaders = resolveMedicalCorsHeaders;
    global.resolveStaticCacheControl = resolveMedicalStaticCacheControl;
    global.MedicalBodySecurity = Object.freeze({
        getRequestOrigin,
        isAllowedOrigin,
        isSameSiteBrowserRequest
    });

    const SERVER = global.createServerHttp(PORT, WEB_ROOT);
    UtilObject.defineProperty__const(global, 'SERVER', SERVER);

    SERVER.use(medicalPreflightGuard);
    global.setupVanillaServer(SERVER, KEY_PROCESS);

    SERVER.on('error', (error) => {
        global.UtilLogger.error('Medical Body Server Error:', error);
    });

    process.on('SIGTERM', () => {
        global.UtilLogger.log('Medical Body Server shutting down...');
        SERVER.close(() => {
            global.UtilLogger.log('Medical Body Server closed');
        });
    });

    function medicalPreflightGuard(req, res, next) {
        if (req.method !== 'OPTIONS') {
            next();
            return;
        }

        const origin = getHeader(req, 'origin');
        if (origin && !isAllowedOrigin(req, origin)) {
            res.writeHead(403, {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-store'
            });
            res.end(JSON.stringify({ error: 'origin_not_allowed' }));
            return;
        }

        const headers = resolveMedicalCorsHeaders(req);
        Object.keys(headers).forEach((name) => {
            const value = headers[name];
            if (value) res.setHeader(name, value);
        });
        res.writeHead(204);
        res.end();
    }

    function resolveMedicalCorsHeaders(req) {
        const origin = getHeader(req, 'origin');
        return {
            'Access-Control-Allow-Origin': origin && isAllowedOrigin(req, origin) ? origin : '',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '600',
            'Vary': 'Origin'
        };
    }

    function resolveMedicalStaticCacheControl(req, filePath) {
        const value = String(filePath || req.url || '').split('?')[0].toLowerCase();
        if (/\.(html?|js|css|json|dcm)$/.test(value)) {
            return 'no-cache, max-age=0, must-revalidate';
        }
        return 'public, max-age=3600';
    }

    function isAllowedOrigin(req, origin) {
        if (!origin) return true;
        if (ALLOWED_ORIGINS.includes(origin)) return true;
        return origin === getRequestOrigin(req);
    }

    function isSameSiteBrowserRequest(req) {
        const site = getHeader(req, 'sec-fetch-site').toLowerCase();
        if (!site) return true;
        return site === 'same-origin' || site === 'same-site' || site === 'none';
    }

    function getRequestOrigin(req) {
        const host = firstHeader(getHeader(req, 'x-forwarded-host')) || firstHeader(getHeader(req, 'host'));
        if (!host) return '';
        const proto =
            firstHeader(getHeader(req, 'x-forwarded-proto')) ||
            (req.socket && req.socket.encrypted ? 'https' : 'http');
        return proto + '://' + host;
    }

    function getHeader(req, name) {
        const headers = (req && req.headers) || {};
        return headers[name] || headers[name.toLowerCase()] || '';
    }

    function firstHeader(value) {
        return String(value || '').split(',')[0].trim();
    }

    function parseList(value) {
        return String(value || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }

}())
