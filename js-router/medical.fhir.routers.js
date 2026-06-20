(function () {
    const NAME_FILE = 'vanilla-medical-body-server/js-router/medical.fhir.routers.js';
    console.log(NAME_FILE);

    if (!global.SERVER || !global.SERVER.addRouter) return;

    const dns = require('dns').promises;
    const net = require('net');

    const MAX_PROXY_BYTES = Number(process.env.MEDICAL_FHIR_PROXY_MAX_BYTES || 5 * 1024 * 1024);
    const PROXY_TIMEOUT_MS = Number(process.env.MEDICAL_FHIR_PROXY_TIMEOUT_MS || 8000);
    const MAX_TARGET_URL_LENGTH = Number(process.env.MEDICAL_FHIR_PROXY_MAX_URL_LENGTH || 2048);
    const DEFAULT_ALLOWED_HOSTS = [];
    const ALLOWED_HOSTS = parseAllowList(
        process.env.MEDICAL_FHIR_PROXY_ALLOWLIST,
        DEFAULT_ALLOWED_HOSTS
    );

    global.SERVER.addRouter('/fhir/proxy', async function (req, res) {
        if (req.method !== 'GET') {
            res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'method_not_allowed' }));
            return;
        }

        try {
            assertSameOriginRequest(req);
            const requestUrl = new URL(req.url, 'http://127.0.0.1');
            const target = requestUrl.searchParams.get('url') || '';
            if (target.length > MAX_TARGET_URL_LENGTH) {
                throw statusError(414, 'FHIR proxy URL is too long');
            }
            const parsed = new URL(target);

            await assertSafeProxyTarget(parsed);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
            let text;
            let response;
            let contentType;
            try {
                response = await fetch(parsed.toString(), {
                    headers: {
                        Accept: 'application/fhir+json, application/json'
                    },
                    redirect: 'manual',
                    signal: controller.signal
                });
                if (response.status >= 300 && response.status < 400) {
                    throw statusError(502, 'FHIR proxy redirects are blocked');
                }
                contentType = response.headers.get('content-type') || '';
                if (!isJsonContentType(contentType)) {
                    throw new Error('FHIR proxy only accepts JSON/FHIR JSON responses');
                }
                text = await readLimitedText(response, MAX_PROXY_BYTES);
            } finally {
                clearTimeout(timeoutId);
            }

            res.writeHead(response.status, {
                'Content-Type': contentType.includes('fhir')
                    ? 'application/fhir+json; charset=utf-8'
                    : 'application/json; charset=utf-8',
                'Cache-Control': 'no-store'
            });
            res.end(text);
        } catch (error) {
            const status = error && error.statusCode ? error.statusCode : 400;
            res.writeHead(status, {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-store'
            });
            res.end(JSON.stringify({
                error: 'fhir_proxy_failed',
                message: error && error.message ? error.message : String(error)
            }));
        }
    });

    function parseAllowList(value, fallback) {
        if (value === 'none' || value === 'off' || value === '0') return [];
        const source = value && value.trim() ? value : fallback.join(',');
        return source
            .split(',')
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean);
    }

    async function assertSafeProxyTarget(parsed) {
        if (parsed.protocol !== 'https:') {
            throw statusError(400, 'Only HTTPS FHIR URLs are allowed');
        }
        if (parsed.username || parsed.password) {
            throw statusError(400, 'FHIR proxy URLs must not contain credentials');
        }

        const hostname = parsed.hostname.toLowerCase();
        if (!isAllowedHost(hostname)) {
            throw statusError(
                403,
                'FHIR proxy host is not allowed. Set MEDICAL_FHIR_PROXY_ALLOWLIST to permit it.'
            );
        }

        const addresses = await resolveHost(hostname);
        if (!addresses.length) throw statusError(400, 'FHIR proxy host could not be resolved');
        if (addresses.some((address) => isBlockedAddress(address))) {
            throw statusError(403, 'FHIR proxy blocks private, loopback, and link-local targets');
        }
    }

    function assertSameOriginRequest(req) {
        const security = global.MedicalBodySecurity;
        const origin = getHeader(req, 'origin');
        if (origin && security && !security.isAllowedOrigin(req, origin)) {
            throw statusError(403, 'FHIR proxy origin is not allowed');
        }
        if (security && !security.isSameSiteBrowserRequest(req)) {
            throw statusError(403, 'FHIR proxy blocks cross-site browser requests');
        }
    }

    function isAllowedHost(hostname) {
        return ALLOWED_HOSTS.some((pattern) => {
            if (pattern.startsWith('*.')) {
                const suffix = pattern.slice(1);
                return hostname.endsWith(suffix) && hostname !== suffix.slice(1);
            }
            return hostname === pattern;
        });
    }

    async function resolveHost(hostname) {
        if (net.isIP(hostname)) return [hostname];
        const records = await dns.lookup(hostname, { all: true, verbatim: true });
        return records.map((record) => record.address);
    }

    function isBlockedAddress(address) {
        const normalized = String(address || '').replace(/^::ffff:/, '');
        if (net.isIP(normalized) === 4) return isBlockedIpv4(normalized);
        if (net.isIP(normalized) === 6) return isBlockedIpv6(normalized);
        return true;
    }

    function isBlockedIpv4(address) {
        const parts = address.split('.').map(Number);
        const first = parts[0];
        const second = parts[1];
        if (first === 0 || first === 10 || first === 127) return true;
        if (first === 169 && second === 254) return true;
        if (first === 172 && second >= 16 && second <= 31) return true;
        if (first === 192 && second === 168) return true;
        if (first === 100 && second >= 64 && second <= 127) return true;
        if (first === 198 && (second === 18 || second === 19)) return true;
        if (first >= 224) return true;
        return false;
    }

    function isBlockedIpv6(address) {
        const value = address.toLowerCase();
        return (
            value === '::' ||
            value === '::1' ||
            value.startsWith('fc') ||
            value.startsWith('fd') ||
            value.startsWith('fe80:')
        );
    }

    function isJsonContentType(contentType) {
        const value = String(contentType || '').toLowerCase();
        return value.includes('json') || value.includes('fhir');
    }

    async function readLimitedText(response, limitBytes) {
        const chunks = [];
        let total = 0;
        for await (const chunk of response.body) {
            const buffer = Buffer.from(chunk);
            total += buffer.length;
            if (total > limitBytes) {
                throw statusError(413, 'FHIR proxy response is too large');
            }
            chunks.push(buffer);
        }
        return Buffer.concat(chunks).toString('utf8');
    }

    function statusError(statusCode, message) {
        const error = new Error(message);
        error.statusCode = statusCode;
        return error;
    }

    function getHeader(req, name) {
        const headers = (req && req.headers) || {};
        return headers[name] || headers[name.toLowerCase()] || '';
    }
}());
