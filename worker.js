// worker.js
import dashboardHTML from "./public/admin.html";

// MD5 纯 JS 实现（Cloudflare Workers WebCrypto 不支持 MD5）
function md5(string) {
    function md5cycle(x, k) {
        let a = x[0], b = x[1], c = x[2], d = x[3];
        a = ff(a, b, c, d, k[0], 7, -680876936); d = ff(d, a, b, c, k[1], 12, -389564586); c = ff(c, d, a, b, k[2], 17, 606105819); b = ff(b, c, d, a, k[3], 22, -1044525330);
        a = ff(a, b, c, d, k[4], 7, -176418897); d = ff(d, a, b, c, k[5], 12, 1200080426); c = ff(c, d, a, b, k[6], 17, -1473231341); b = ff(b, c, d, a, k[7], 22, -45705983);
        a = ff(a, b, c, d, k[8], 7, 1770035416); d = ff(d, a, b, c, k[9], 12, -1958414417); c = ff(c, d, a, b, k[10], 17, -42063); b = ff(b, c, d, a, k[11], 22, -1990404162);
        a = ff(a, b, c, d, k[12], 7, 1804603682); d = ff(d, a, b, c, k[13], 12, -40341101); c = ff(c, d, a, b, k[14], 17, -1502002290); b = ff(b, c, d, a, k[15], 22, 1236535329);
        a = gg(a, b, c, d, k[1], 5, -165796510); d = gg(d, a, b, c, k[6], 9, -1069501632); c = gg(c, d, a, b, k[11], 14, 643717713); b = gg(b, c, d, a, k[0], 20, -373897302);
        a = gg(a, b, c, d, k[5], 5, -701558691); d = gg(d, a, b, c, k[10], 9, 38016083); c = gg(c, d, a, b, k[15], 14, -660478335); b = gg(b, c, d, a, k[4], 20, -405537848);
        a = gg(a, b, c, d, k[9], 5, 568446438); d = gg(d, a, b, c, k[14], 9, -1019803690); c = gg(c, d, a, b, k[3], 14, -187363961); b = gg(b, c, d, a, k[8], 20, 1163531501);
        a = gg(a, b, c, d, k[13], 5, -1444681467); d = gg(d, a, b, c, k[2], 9, -51403784); c = gg(c, d, a, b, k[7], 14, 1735328473); b = gg(b, c, d, a, k[12], 20, -1926607734);
        a = hh(a, b, c, d, k[5], 4, -378558); d = hh(d, a, b, c, k[8], 11, -2022574463); c = hh(c, d, a, b, k[11], 16, 1839030562); b = hh(b, c, d, a, k[14], 23, -35309556);
        a = hh(a, b, c, d, k[1], 4, -1530992060); d = hh(d, a, b, c, k[4], 11, 1272893353); c = hh(c, d, a, b, k[7], 16, -155497632); b = hh(b, c, d, a, k[10], 23, -1094730640);
        a = hh(a, b, c, d, k[13], 4, 681279174); d = hh(d, a, b, c, k[0], 11, -358537222); c = hh(c, d, a, b, k[3], 16, -722521979); b = hh(b, c, d, a, k[6], 23, 76029189);
        a = hh(a, b, c, d, k[9], 4, -640364487); d = hh(d, a, b, c, k[12], 11, -421815835); c = hh(c, d, a, b, k[15], 16, 530742520); b = hh(b, c, d, a, k[2], 23, -995338651);
        a = ii(a, b, c, d, k[0], 6, -198630844); d = ii(d, a, b, c, k[7], 10, 1126891415); c = ii(c, d, a, b, k[14], 15, -1416354905); b = ii(b, c, d, a, k[5], 21, -57434055);
        a = ii(a, b, c, d, k[12], 6, 1700485571); d = ii(d, a, b, c, k[3], 10, -1894986606); c = ii(c, d, a, b, k[10], 15, -1051523); b = ii(b, c, d, a, k[1], 21, -2054922799);
        a = ii(a, b, c, d, k[8], 6, 1873313359); d = ii(d, a, b, c, k[15], 10, -30611744); c = ii(c, d, a, b, k[6], 15, -1560198380); b = ii(b, c, d, a, k[13], 21, 1309151649);
        a = ii(a, b, c, d, k[4], 6, -145523070); d = ii(d, a, b, c, k[11], 10, -1120210379); c = ii(c, d, a, b, k[2], 15, 718787259); b = ii(b, c, d, a, k[9], 21, -343485551);
        x[0] = add32(a, x[0]); x[1] = add32(b, x[1]); x[2] = add32(c, x[2]); x[3] = add32(d, x[3]);
    }
    function cmn(q, a, b, x, s, t) { a = add32(add32(a, q), add32(x, t)); return add32((a << s) | (a >>> (32 - s)), b); }
    function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
    function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
    function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
    function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
    function md5blk(s) {
        const md5blks = [];
        for (let i = 0; i < 64; i += 4) md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
        return md5blks;
    }
    function add32(a, b) { return (a + b) & 0xFFFFFFFF; }
    function rhex(n) {
        const hc = '0123456789abcdef';
        let s = '';
        for (let j = 0; j < 4; j++) s += hc.charAt((n >> (j * 8 + 4)) & 0x0F) + hc.charAt((n >> (j * 8)) & 0x0F);
        return s;
    }
    let n = string.length;
    let state = [1732584193, -271733879, -1732584194, 271733878];
    let i;
    for (i = 64; i <= n; i += 64) md5cycle(state, md5blk(string.substring(i - 64, i)));
    string = string.substring(i - 64);
    const tail = new Array(16).fill(0);
    for (i = 0; i < string.length; i++) tail[i >> 2] |= string.charCodeAt(i) << ((i % 4) << 3);
    tail[i >> 2] |= 0x80 << ((i % 4) << 3);
    if (i > 55) { md5cycle(state, tail); tail.fill(0); }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return rhex(state[0]) + rhex(state[1]) + rhex(state[2]) + rhex(state[3]);
}

// 【新增】KV与内存双重缓存架构逻辑
let cachedNetworks = null;
let lastNetworkCacheTime = 0;
let cachedScanConfig = null;
let lastScanConfigCacheTime = 0;

async function getDynamicNetworks(env) {
    const now = Date.now();
    if (!cachedNetworks || (now - lastNetworkCacheTime > 60000)) {
        const kvData = await env.kv.get("system_networks", "json");
        cachedNetworks = kvData || {
            TRON: { type: 'tron', usdt: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', decimals: 6 },
            ETH:  { type: 'evm', rpc: 'https://cloudflare-eth.com', usdt: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6 },
            BSC:  { type: 'evm', rpc: 'https://bsc-dataseed.binance.org', usdt: '0x55d398326f99059ff775485246999027b3197955', decimals: 18 }
        };
        lastNetworkCacheTime = now;
    }
    return cachedNetworks;
}

// 【新增】扫块配置内存缓存，减少 KV 读取
async function getScanConfig(env) {
    const now = Date.now();
    if (!cachedScanConfig || (now - lastScanConfigCacheTime > 30000)) { // 30秒缓存
        const [duration, interval, mode] = await Promise.all([
            env.kv.get("scan_duration"),
            env.kv.get("scan_interval"),
            env.kv.get("scan_mode")
        ]);
        cachedScanConfig = {
            duration: duration || "5",
            interval: interval || "15",
            mode: mode || "fixed"
        };
        lastScanConfigCacheTime = now;
    }
    return cachedScanConfig;
}
// EVM ERC20 Transfer 事件的 Keccak-256 签名
const EVM_TRANSFER_SIG = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // ==========================================
        // 1. 系统初始化与建表 (v1)
        // ==========================================
        const isInit = await env.kv.get("system_init_v1");
        if (!isInit) {
            await env.db.prepare(`CREATE TABLE IF NOT EXISTS orders (
                tx_hash TEXT, network TEXT NOT NULL, amount TEXT NOT NULL,
                from_address TEXT NOT NULL, to_address TEXT, status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (tx_hash, network)
            );`).run();
            // 自动创建 webhooks 表 (支持 callback_type 区分默认/BEpusdt 回调格式)
            await env.db.prepare(`CREATE TABLE IF NOT EXISTS webhooks (
                id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, url TEXT NOT NULL,
                secret TEXT NOT NULL, binds TEXT DEFAULT '*', callback_type TEXT DEFAULT 'default',
                icon TEXT, remark TEXT, enabled INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );`).run();
            // 自动创建 addresses 表 (已解除 UNIQUE 限制支持同地址多节点)
            await env.db.prepare(`CREATE TABLE IF NOT EXISTS addresses (
                id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT NOT NULL,
                icon TEXT, remark TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );`).run();
            // 自动创建 sys_state 表 (用于替代 KV 高频存储区块高度)
            await env.db.prepare(`CREATE TABLE IF NOT EXISTS sys_state (
                key_name TEXT PRIMARY KEY, key_value TEXT
            );`).run();
            // 【修正】主键改为 order_id，支持单地址高并发多订单
            await env.db.prepare(`CREATE TABLE IF NOT EXISTS active_watches (
                order_id TEXT PRIMARY KEY, address TEXT NOT NULL, network TEXT NOT NULL, 
                expected_amount TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );`).run();
            await env.kv.put("admin_username", "admin");
            await env.kv.put("admin_password", "123456");
            await env.kv.put("system_init_v1", "true");
        }
        // 【迁移】给旧表补上 callback_type 列（无论是否首次初始化都执行，已存在则静默忽略）
        try { await env.db.prepare('ALTER TABLE webhooks ADD COLUMN callback_type TEXT DEFAULT \'default\'').run(); } catch(e) {}
        // 【迁移】将旧的 dujiao-next 值统一改为 bepusdt
        try { await env.db.prepare("UPDATE webhooks SET callback_type = 'bepusdt' WHERE callback_type = 'dujiao-next'").run(); } catch(e) {}

        // 验证码生成 API
        if (url.pathname === "/api/captcha") {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let code = '';
            for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
            const captchaId = crypto.randomUUID();
            await env.kv.put(`captcha_${captchaId}`, code, { expirationTtl: 300 });
            let svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='40' viewBox='0 0 120 40'>`;
            svg += `<rect width='120' height='40' fill='#f0f0f0' rx='4'/>`;
            for (let i = 0; i < 4; i++) {
                const x1 = Math.random()*120, y1 = Math.random()*40, x2 = Math.random()*120, y2 = Math.random()*40;
                svg += `<line x1='${x1}' y1='${y1}' x2='${x2}' y2='${y2}' stroke='#ccc' stroke-width='1'/>`;
            }
            for (let i = 0; i < 20; i++) {
                svg += `<circle cx='${Math.random()*120}' cy='${Math.random()*40}' r='1' fill='#ccc'/>`;
            }
            const clrs = ['#333','#555','#222','#444'];
            for (let i = 0; i < 4; i++) {
                const x = 14 + i * 27, y = 24 + Math.random()*8 - 4;
                const rot = Math.random()*20 - 10, fs = 20 + Math.random()*4;
                svg += `<text x='${x}' y='${y}' font-size='${fs}' font-family='monospace' font-weight='bold' fill='${clrs[i]}' transform='rotate(${rot},${x},${y})'>${code[i]}</text>`;
            }
            svg += `</svg>`;
            return new Response(JSON.stringify({ id: captchaId, svg }), { headers: { 'Content-Type': 'application/json' } });
        }

        // ==========================================
        // 2. 登录与鉴权路由
        // ==========================================
        if (url.pathname === "/login" && request.method === "POST") {
            const data = await request.formData();
            const captchaEnabled = (await env.kv.get("captcha_enabled")) !== "0";
            if (captchaEnabled) {
                const captchaId = data.get("captcha_id");
                const captchaCode = data.get("captcha_code");
                if (!captchaId || !captchaCode) {
                    return new Response(null, { status: 302, headers: { 'Location': '/?err=请输入验证码' } });
                }
                const storedCode = await env.kv.get(`captcha_${captchaId}`);
                await env.kv.delete(`captcha_${captchaId}`);
                if (!storedCode || storedCode.toUpperCase() !== captchaCode.toUpperCase()) {
                    return new Response(null, { status: 302, headers: { 'Location': '/?err=验证码错误' } });
                }
            }
            if (data.get("username") === await env.kv.get("admin_username") && data.get("password") === await env.kv.get("admin_password")) {
                const token = crypto.randomUUID();
                await env.kv.put("admin_token", token, { expirationTtl: 86400 });
                return new Response("Login Success", { status: 302, headers: { "Location": "/dashboard", "Set-Cookie": `token=${token}; HttpOnly; Path=/` } });
            }
            return new Response(null, { status: 302, headers: { "Location": "/?err=账号或密码错误" } });
        }
        if (url.pathname === "/") {
            return new Response(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>商户控制台 - 登录</title>
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f3f5f7;
            min-height: 100vh;
            display: flex;
        }
        /* ========== 左侧品牌面板 ========== */
        .brand-panel {
            flex: 1;
            background: linear-gradient(135deg, hsl(243, 75%, 55%) 0%, hsl(243, 75%, 42%) 50%, hsl(260, 60%, 35%) 100%);
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 48px 40px;
            position: relative;
            overflow: hidden;
            min-height: 100vh;
        }
        .brand-panel::before {
            content: '';
            position: absolute;
            top: -20%; right: -10%;
            width: 500px; height: 500px;
            background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
            pointer-events: none;
        }
        .brand-panel::after {
            content: '';
            position: absolute;
            bottom: -15%; left: -5%;
            width: 400px; height: 400px;
            background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%);
            pointer-events: none;
        }
        .brand-content {
            position: relative;
            z-index: 1;
            max-width: 480px;
        }
        .brand-logo-row {
            display: flex;
            align-items: center;
            margin-bottom: 48px;
        }
        .brand-logo-icon {
            width: 48px; height: 48px;
            background: rgba(255,255,255,0.15);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 14px;
            backdrop-filter: blur(4px);
        }
        .brand-logo-icon svg {
            width: 24px; height: 24px;
            fill: none; stroke: white; stroke-width: 2;
            stroke-linecap: round; stroke-linejoin: round;
        }
        .brand-logo-text {
            color: white;
            font-size: 1.25rem;
            font-weight: 700;
            letter-spacing: -0.01em;
        }
        .brand-title {
            color: white;
            font-size: 2.4rem;
            font-weight: 700;
            line-height: 1.35;
            margin-bottom: 14px;
            letter-spacing: -0.02em;
        }
        .brand-desc {
            color: rgba(255,255,255,0.75);
            font-size: 0.92rem;
            line-height: 1.65;
            margin-bottom: 36px;
        }
        .brand-features {
            display: flex;
            flex-direction: column;
            gap: 0;
        }
        .brand-feature {
            display: flex;
            align-items: flex-start;
            padding: 16px 0;
            position: relative;
        }
        .brand-feature-icon {
            width: 40px; height: 40px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .brand-feature-icon svg {
            width: 20px; height: 20px;
            fill: none; stroke: white; stroke-width: 2;
            stroke-linecap: round; stroke-linejoin: round;
        }
        .brand-feature-text {
            margin-left: 14px;
        }
        .brand-feature-text h3 {
            color: white;
            font-size: 1rem;
            font-weight: 600;
            margin-bottom: 4px;
        }
        .brand-feature-text p {
            color: rgba(255,255,255,0.6);
            font-size: 0.82rem;
            line-height: 1.5;
        }
        /* ========== 右侧登录面板 ========== */
        .login-panel {
            flex: 1;
            background: hsl(220, 14%, 96%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 48px;
            position: relative;
        }
        .login-card {
            width: 100%;
            max-width: 400px;
            background: white;
            border-radius: 16px;
            padding: 44px 36px 36px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.06);
            border: 1px solid hsl(220, 13%, 91%);
        }
        .login-header {
            margin-bottom: 20px;
        }
        .login-header h1 {
            font-size: 1.5rem;
            font-weight: 700;
            color: hsl(222, 47%, 11%);
            margin-bottom: 8px;
            letter-spacing: -0.01em;
        }
        .login-header p {
            font-size: 0.9rem;
            color: hsl(220, 9%, 46%);
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            font-size: 0.85rem;
            font-weight: 500;
            color: hsl(222, 47%, 11%);
            margin-bottom: 7px;
        }
        .form-group input {
            width: 100%;
            padding: 12px 14px;
            border: 1px solid hsl(220, 13%, 91%);
            border-radius: 8px;
            font-size: 0.9rem;
            color: hsl(222, 47%, 11%);
            background: hsl(0, 0%, 100%);
            outline: none;
            transition: all 0.15s ease;
            font-family: inherit;
        }
        .form-group input::placeholder {
            color: hsl(220, 9%, 66%);
        }
        .form-group input:focus {
            border-color: hsl(243, 75%, 59%);
            box-shadow: 0 0 0 3px rgba(80,72,229,0.12);
        }
        .login-btn {
            width: 100%;
            padding: 13px;
            background: hsl(243, 75%, 59%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
            margin-top: 4px;
            font-family: inherit;
            letter-spacing: 0.02em;
        }
        .login-btn:hover {
            background: hsl(243, 75%, 52%);
            transform: translateY(-1px);
            box-shadow: 0 4px 14px rgba(80,72,229,0.35);
        }
        .login-btn:active {
            transform: translateY(0);
        }
        .login-footer {
            text-align: center;
            margin-top: 32px;
            padding-top: 20px;
            border-top: 1px solid hsl(220, 13%, 93%);
        }
        .login-footer p {
            font-size: 0.78rem;
            color: hsl(220, 9%, 60%);
        }
        /* ========== 响应式 ========== */
        @media (max-width: 900px) {
            body {
                flex-direction: column;
                min-height: 100vh;
                min-height: 100dvh;
            }
            .brand-panel {
                width: 100%;
                min-height: auto;
                padding: 20px 24px 18px;
                background: linear-gradient(135deg, hsl(243, 75%, 55%) 0%, hsl(243, 75%, 42%) 100%);
            }
            .brand-panel::before,
            .brand-panel::after { display: none; }
            .brand-logo-row {
                margin-bottom: 10px;
            }
            .brand-logo-icon {
                width: 36px; height: 36px;
                border-radius: 9px;
            }
            .brand-logo-icon svg {
                width: 18px; height: 18px;
            }
            .brand-logo-text {
                font-size: 1.1rem;
            }
            .brand-title {
                font-size: 1.25rem;
                margin-bottom: 0;
                line-height: 1.3;
            }
            .brand-desc { display: none; }
            .brand-features { display: none; }
            .login-panel {
                flex: 1;
                padding: 24px 20px 32px;
                align-items: flex-start;
            }
            .login-card {
                max-width: 100%;
                padding: 28px 22px 24px;
                border-radius: 14px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.06);
            }
            .login-header {
                margin-bottom: 24px;
            }
            .login-header h1 {
                font-size: 1.3rem;
            }
            .login-header p {
                font-size: 0.84rem;
            }
            .form-group {
                margin-bottom: 16px;
            }
            .form-group label {
                font-size: 0.82rem;
                margin-bottom: 6px;
            }
            .form-group input {
                padding: 11px 13px;
                font-size: 0.88rem;
                border-radius: 10px;
            }
            .login-btn {
                padding: 13px;
                font-size: 0.95rem;
                border-radius: 10px;
            }
            .login-footer {
                margin-top: 24px;
                padding-top: 16px;
            }
            .login-footer p {
                font-size: 0.72rem;
            }
        }
    </style>
</head>
<body>
    <!-- 左侧品牌说明 -->
    <div class="brand-panel">
        <div class="brand-content">
            <div class="brand-logo-row">
                <div class="brand-logo-icon">
                    <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <span class="brand-logo-text">夏雨全链矩阵</span>
            </div>
            <h1 class="brand-title">非托管全链 USDT 收款<br>一站式监控矩阵</h1>
            <p class="brand-desc">覆盖 20+ 主流公链，边缘节点实时拦截入账，秒级触发回调通知。为您的发卡网、商户系统提供企业级稳定收款能力。</p>
            <div class="brand-features">
                <div class="brand-feature">
                    <div class="brand-feature-icon" style="background:rgba(34,197,94,0.25);">
                        <svg viewBox="0 0 24 24"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
                    </div>
                    <div class="brand-feature-text">
                        <h3>即时扫块引擎</h3>
                        <p>按需唤醒，0 RPC 浪费。发卡网下单即触发精准扫块，到账秒级回调。</p>
                    </div>
                </div>
                <div class="brand-feature">
                    <div class="brand-feature-icon" style="background:rgba(59,130,246,0.25);">
                        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                    </div>
                    <div class="brand-feature-text">
                        <h3>20+ 公链接入</h3>
                        <p>TRON、ETH、BSC、Solana、TON、Aptos 等主流公链全覆盖，一键配置即用。</p>
                    </div>
                </div>
                <div class="brand-feature">
                    <div class="brand-feature-icon" style="background:rgba(168,85,247,0.25);">
                        <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </div>
                    <div class="brand-feature-text">
                        <h3>边缘安全架构</h3>
                        <p>基于 Cloudflare Workers 构建，天然抗 DDoS，全球边缘节点低延迟分发。</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!-- 右侧登录表单 -->
    <div class="login-panel">
        <div class="login-card">
            <div class="login-header">
                <h1>商户控制台</h1>
                <p>非托管多链USDT收款，客户付款直达你的钱包，系统不接触资金。</p>
            <div id="err_msg" style="display:none;background:hsl(0,72%,97%);border:1px solid hsl(0,72%,85%);color:hsl(0,72%,51%);padding:10px 14px;border-radius:8px;font-size:0.85rem;margin-top:12px;"></div>
            </div>
            <form action="/login" method="POST">
                <div class="form-group">
                    <label>管理员账号</label>
                    <input type="text" name="username" placeholder="请输入管理员账号" required autocomplete="username">
                </div>
                <div class="form-group">
                    <label>登录密码</label>
                    <input type="password" name="password" placeholder="请输入登录密码" required autocomplete="current-password">
                </div>
                <div class="form-group" id="captcha_group">
                    <label>验证码</label>
                    <div style="display:flex;align-items:center;">
                        <input type="text" name="captcha_code" placeholder="请输入验证码" required autocomplete="off" maxlength="4" style="flex:1;text-transform:uppercase;letter-spacing:4px;text-align:center;">
                        <div id="captcha_img" style="cursor:pointer;height:40px;flex-shrink:0;border-radius:6px;overflow:hidden;border:1px solid hsl(220,13%,91%);margin-left:10px;" onclick="loadCaptcha()" title="点击刷新验证码"></div>
                    </div>
                    <input type="hidden" name="captcha_id" id="captcha_id">
                </div>
                <button type="submit" class="login-btn">安全登录</button>
            </form>
            <script>
            (function(){
                const p = new URLSearchParams(location.search);
                const err = p.get('err');
                if(err){const el=document.getElementById('err_msg');el.textContent=err;el.style.display='block';history.replaceState(null,'',location.pathname);}
            })();
            async function loadCaptcha() {
                try {
                    const res = await fetch('/api/captcha');
                    const data = await res.json();
                    document.getElementById('captcha_img').innerHTML = data.svg;
                    document.getElementById('captcha_id').value = data.id;
                } catch(e) { console.error('验证码加载失败', e); }
            }
            loadCaptcha(); // 默认先加载验证码
            // 检查验证码是否启用
            (async function(){
                try {
                    const res = await fetch('/api/settings');
                    const cfg = await res.json();
                    if(cfg.captcha_enabled === false) {
                        document.getElementById('captcha_group').style.display = 'none';
                        document.querySelector('input[name="captcha_code"]').removeAttribute('required');
                    }
                } catch(e) { /* 配置加载失败，保持显示验证码（安全兜底） */ }
            })();
            </script>
            <div class="login-footer">
                <p>© 夏雨全链矩阵 · Powered by Cloudflare Workers</p>
            </div>
        </div>
    </div>
</body>
</html>`, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
        }

        const cookie = request.headers.get("Cookie") || "";
        const tokenMatch = cookie.match(/token=([^;]+)/);
        if (!tokenMatch || tokenMatch[1] !== await env.kv.get("admin_token")) return new Response("未授权", { status: 302, headers: { "Location": "/" } });

        // ==========================================
        // 3. API 与页面路由
        // ==========================================
        if (url.pathname === "/dashboard") return new Response(dashboardHTML, { headers: { "Content-Type": "text/html;charset=UTF-8" } });

        if (url.pathname === "/api/orders") {
            if (request.method === "GET") {
                const { results } = await env.db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 100").all();
                return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });
            }
            if (request.method === "DELETE") {
                const urlObj = new URL(request.url);
                const txHash = urlObj.searchParams.get("tx_hash");
                const network = urlObj.searchParams.get("network");

                // 单条删除判定
                if (txHash && network) {
                    await env.db.prepare("DELETE FROM orders WHERE tx_hash = ? AND network = ?").bind(txHash, network).run();
                    return new Response(JSON.stringify({ success: true }));
                } 
                
                // 批量删除判定
                const body = await request.json();
                if (body && body.items && Array.isArray(body.items)) {
                    for (const item of body.items) {
                        if (item.tx_hash && item.network) {
                            await env.db.prepare("DELETE FROM orders WHERE tx_hash = ? AND network = ?").bind(item.tx_hash, item.network).run();
                        }
                    }
                    return new Response(JSON.stringify({ success: true }));
                }
                return new Response(JSON.stringify({ success: false }), { status: 400 });
            }
        }
        // --- 新增：收款地址 CRUD 接口 ---
        if (url.pathname === "/api/addresses") {
            if (request.method === "GET") {
                const { results } = await env.db.prepare("SELECT * FROM addresses ORDER BY created_at DESC").all();
                return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });
            }
            if (request.method === "POST") {
                const data = await request.json();
                const info = await env.db.prepare("INSERT INTO addresses (name, address, icon, remark) VALUES (?, ?, ?, ?)").bind(data.name, data.address, data.icon, data.remark).run();
                return new Response(JSON.stringify({ success: true, id: info.meta.last_row_id }));
            }
            if (request.method === "DELETE") {
                const urlObj = new URL(request.url);
                const id = urlObj.searchParams.get("id");
                await env.db.prepare("DELETE FROM addresses WHERE id = ?").bind(id).run();
                return new Response(JSON.stringify({ success: true }));
            }
            if (request.method === "PUT") {
                const data = await request.json();
                await env.db.prepare("UPDATE addresses SET name=?, address=?, icon=?, remark=? WHERE id=?").bind(data.name, data.address, data.icon, data.remark, data.id).run();
                return new Response(JSON.stringify({ success: true }));
            }
        }

        if (url.pathname === "/api/settings") {
            if (request.method === "POST") {
                const data = await request.json();
                if (data.username) await env.kv.put("admin_username", data.username);
                if (data.password) await env.kv.put("admin_password", data.password);
                if (data.captcha_enabled !== undefined) await env.kv.put("captcha_enabled", data.captcha_enabled ? "1" : "0");
                return new Response(JSON.stringify({ success: true }));
            }
            return new Response(JSON.stringify({
                username: await env.kv.get("admin_username"), 
                password: await env.kv.get("admin_password"),
                captcha_enabled: (await env.kv.get("captcha_enabled")) !== "0",
            }), { headers: { "Content-Type": "application/json" } });
        }

        if (url.pathname === "/api/webhooks") {
            if (request.method === "GET") {
                const { results } = await env.db.prepare("SELECT * FROM webhooks ORDER BY created_at DESC").all();
                return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });
            }
            if (request.method === "POST") {
                const data = await request.json();
                await env.db.prepare("INSERT INTO webhooks (name, url, secret, binds, callback_type, icon, remark) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(data.name, data.url, data.secret, data.binds, data.callback_type || 'default', data.icon, data.remark).run();
                return new Response(JSON.stringify({ success: true }));
            }
            if (request.method === "DELETE") {
                const urlObj = new URL(request.url);
                const id = urlObj.searchParams.get("id");
                await env.db.prepare("DELETE FROM webhooks WHERE id = ?").bind(id).run();
                return new Response(JSON.stringify({ success: true }));
            }
            if (request.method === "PUT") {
                const urlObj = new URL(request.url);
                const id = urlObj.searchParams.get("id");
                const status = urlObj.searchParams.get("status");
                if (status !== null) {
                    await env.db.prepare("UPDATE webhooks SET enabled = ? WHERE id = ?").bind(status === "1" ? 1 : 0, id).run();
                } else {
                    const data = await request.json();
                    await env.db.prepare("UPDATE webhooks SET name=?, url=?, secret=?, binds=?, callback_type=?, icon=?, remark=? WHERE id=?").bind(data.name, data.url, data.secret, data.binds, data.callback_type || 'default', data.icon, data.remark, data.id).run();
                }
                return new Response(JSON.stringify({ success: true }));
            }
        }

        // 【新增】网络节点池动态管理 API
        if (url.pathname === "/api/networks") {
            if (request.method === "GET") {
                return new Response(JSON.stringify(await getDynamicNetworks(env)), { headers: { "Content-Type": "application/json" } });
            }
            if (request.method === "POST") {
                const newNetworks = await request.json();
                await env.kv.put("system_networks", JSON.stringify(newNetworks));
                cachedNetworks = newNetworks; lastNetworkCacheTime = Date.now();
                return new Response(JSON.stringify({ success: true }));
            }
        }
        // 【新增】接收地址精准单链绑定关系的 API
        if (url.pathname === "/api/address-bindings") {
            if (request.method === "GET") {
                const bindings = await env.kv.get("address_to_network", "json") || {};
                return new Response(JSON.stringify(bindings), { headers: { "Content-Type": "application/json" } });
            }
            if (request.method === "POST") {
                const { id, network } = await request.json();
                const bindings = await env.kv.get("address_to_network", "json") || {};
                if (network && network !== "auto") bindings[id.toString()] = network.toUpperCase();
                else delete bindings[id.toString()];
                await env.kv.put("address_to_network", JSON.stringify(bindings));
                return new Response(JSON.stringify({ success: true }));
            }
        }
        // 【重构新增】接收业务端 (xyfk) 发送的按需监控指令 API
        if (url.pathname === "/api/watch" && request.method === "POST") {
            const authHeader = request.headers.get("Authorization");
            // 提取传入的密钥
            const token = authHeader ? authHeader.replace('Bearer ', '').trim() : '';
            
            // 【核心优化】：去 webhooks 表中动态比对
            // 只要传入的密钥与任意一个已启用的 webhook 的 secret 匹配，即视为合法的下级业务端
            const validWebhook = await env.db.prepare("SELECT id FROM webhooks WHERE secret = ? AND enabled = 1").bind(token).first();
            
            if (!validWebhook) {
                return new Response(JSON.stringify({ success: false, msg: "Unauthorized: Invalid Webhook Secret" }), { status: 401 });
            }

            const { address, network, amount, order_id, scan_duration, scan_interval, scan_mode } = await request.json();
            if (!address || !network || !amount || !order_id) return new Response("Missing params", { status: 400 });

            // 【修正】使用 order_id 防冲突，仅刷新存活时间，不再覆盖同地址的其他订单
            await env.db.prepare(
                "INSERT INTO active_watches (order_id, address, network, expected_amount) VALUES (?, ?, ?, ?) ON CONFLICT(order_id) DO UPDATE SET created_at = CURRENT_TIMESTAMP"
            ).bind(order_id, address, network, amount).run();
            
            // ====== 【核心新增：即时按需扫块】登记后立即触发后台持续扫块 ======
            // 优先使用请求传入的参数，否则使用系统全局配置（带内存缓存），最后用默认值
            const sysConfig = await getScanConfig(env);
            
            const duration = parseInt(scan_duration) || parseInt(sysConfig.duration) || 5;
            const interval = parseInt(scan_interval) || parseInt(sysConfig.interval) || 15;
            const mode = scan_mode || sysConfig.mode || "fixed";
            
            // 使用 ctx.waitUntil 在后台持续扫块，不阻塞响应
            ctx.waitUntil(this.onDemandScan(env, duration, interval, mode));
            
            return new Response(JSON.stringify({ 
                success: true, 
                scan_started: true,
                scan_config: { duration_min: duration, interval_sec: interval, mode: mode }
            }));
        }
        
        // 【新增】按需扫块配置查询与保存 API
        if (url.pathname === "/api/scan-config") {
            if (request.method === "GET") {
                const config = await getScanConfig(env);
                return new Response(JSON.stringify(config), { headers: { "Content-Type": "application/json" } });
            }
            if (request.method === "POST") {
                const data = await request.json();
                if (data.duration) await env.kv.put("scan_duration", String(data.duration));
                if (data.interval) await env.kv.put("scan_interval", String(data.interval));
                if (data.mode) await env.kv.put("scan_mode", data.mode);
                cachedScanConfig = null; // 清除缓存，下次读取时刷新
                return new Response(JSON.stringify({ success: true }));
            }
        }
        // 手动触发全链同步
        if (url.pathname === "/api/sync" && request.method === "POST") {
            await this.syncAllChainsData(env);
            return new Response(JSON.stringify({ success: true }));
        }

        // ====== BEpusdt 兼容下单接口（供独角数卡等发卡网调用） ======
        if (url.pathname === "/api/v1/order/create-order" && request.method === "POST") {
            try {
                const body = await request.json();
                const { order_id, amount, notify_url, redirect_url, fiat, name, signature } = body;

                if (!order_id || !amount || !notify_url || !signature) {
                    return new Response(JSON.stringify({ status_code: 400, message: "Missing required params: order_id, amount, notify_url, signature" }), { headers: { "Content-Type": "application/json" }, status: 400 });
                }

                // 从 webhooks 表中查找匹配 notify_url 且类型为 bepusdt 的路由
                const webhook = await env.db.prepare("SELECT * FROM webhooks WHERE url = ? AND callback_type = 'bepusdt' AND enabled = 1").bind(notify_url).first();
                if (!webhook) {
                    return new Response(JSON.stringify({ status_code: 401, message: "No matching BEpusdt webhook found for this notify_url" }), { headers: { "Content-Type": "application/json" }, status: 401 });
                }

                // 验证签名（BEpusdt 签名规则：参数按 key 排序拼接 + authToken，MD5）
                const signParams = {};
                for (const [k, v] of Object.entries(body)) {
                    if (k === "signature" || k === "sign" || k === "sign_type") continue;
                    if (v === "" || v === null || v === undefined) continue;
                    signParams[k] = v;
                }
                const sortedKeys = Object.keys(signParams).sort();
                const signStr = sortedKeys.map(k => `${k}=${signParams[k]}`).join("&") + webhook.secret;
                const msgBuffer = new TextEncoder().encode(signStr);
                const hashBuffer = await crypto.subtle.digest('MD5', msgBuffer);
                const expectedSign = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

                if (expectedSign !== signature.toLowerCase()) {
                    return new Response(JSON.stringify({ status_code: 401, message: "Signature verification failed" }), { headers: { "Content-Type": "application/json" }, status: 401 });
                }

                // 获取绑定的收款地址
                const binds = webhook.binds === '*' ? null : webhook.binds.split(',')[0].split('@@')[0].trim();
                let address = binds;
                if (!address) {
                    const addr = await env.db.prepare("SELECT address FROM addresses LIMIT 1").first();
                    address = addr ? addr.address : null;
                }
                if (!address) {
                    return new Response(JSON.stringify({ status_code: 500, message: "No收款地址 configured" }), { headers: { "Content-Type": "application/json" }, status: 500 });
                }

                // 生成交易号
                const tradeId = `XY${Date.now()}${Math.random().toString(36).substring(2, 8)}`;

                // 计算 USDT 金额（法币金额按 1:1 换算，可扩展汇率）
                const usdtAmount = parseFloat(amount).toFixed(2);

                // 登记监控
                await env.db.prepare(
                    "INSERT INTO active_watches (order_id, address, network, expected_amount) VALUES (?, ?, ?, ?) ON CONFLICT(order_id) DO UPDATE SET created_at = CURRENT_TIMESTAMP"
                ).bind(order_id, address, "TRON", usdtAmount).run();

                // 触发扫块
                const sysConfig = await getScanConfig(env);
                const duration = parseInt(sysConfig.duration) || 5;
                const interval = parseInt(sysConfig.interval) || 15;
                const mode = sysConfig.mode || "fixed";
                // noinspection ES6MissingAwait
                this.onDemandScan(env, duration, interval, mode);

                // 生成支付页面 URL
                const payUrl = `${url.origin}/pay?trade_id=${tradeId}&order_id=${encodeURIComponent(order_id)}&amount=${usdtAmount}&address=${encodeURIComponent(address)}&notify_url=${encodeURIComponent(notify_url)}&redirect_url=${encodeURIComponent(redirect_url || '')}`;

                return new Response(JSON.stringify({
                    status_code: 200,
                    message: "success",
                    data: {
                        trade_id: tradeId,
                        order_id: order_id,
                        amount: amount.toString(),
                        expiration_time: 1800,
                        payment_url: payUrl
                    }
                }), { headers: { "Content-Type": "application/json" } });

            } catch (e) {
                return new Response(JSON.stringify({ status_code: 500, message: e.message }), { headers: { "Content-Type": "application/json" }, status: 500 });
            }
        }

        // ====== 支付展示页面（USDT 地址 + 二维码） ======
        if (url.pathname === "/pay" && request.method === "GET") {
            const tradeId = url.searchParams.get("trade_id") || "";
            const orderId = url.searchParams.get("order_id") || "";
            const amount = url.searchParams.get("amount") || "";
            const address = url.searchParams.get("address") || "";
            const redirectUrl = url.searchParams.get("redirect_url") || "";

            if (!address || !amount) {
                return new Response("Missing params", { status: 400 });
            }

            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(address)}`;

            const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>USDT Payment</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%); min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px; }
.card { background:#fff; border-radius:16px; padding:40px 30px; max-width:440px; width:100%; text-align:center; box-shadow:0 25px 50px rgba(0,0,0,0.25); }
.title { font-size:1.4rem; font-weight:700; color:#0f172a; margin-bottom:8px; }
.subtitle { font-size:0.9rem; color:#64748b; margin-bottom:24px; }
.qr-box { display:inline-block; padding:12px; background:#fff; border:2px solid #e2e8f0; border-radius:12px; margin-bottom:20px; }
.qr-box img { display:block; width:240px; height:240px; }
.amount-box { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:16px; margin-bottom:20px; }
.amount-label { font-size:0.85rem; color:#16a34a; margin-bottom:4px; }
.amount-value { font-size:2rem; font-weight:700; color:#15803d; }
.amount-unit { font-size:1rem; font-weight:400; color:#16a34a; margin-left:4px; }
.addr-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px; margin-bottom:20px; word-break:break-all; }
.addr-label { font-size:0.8rem; color:#94a3b8; margin-bottom:6px; }
.addr-value { font-family:monospace; font-size:0.85rem; color:#334155; line-height:1.5; }
.copy-btn { background:#3b82f6; color:#fff; border:none; padding:10px 24px; border-radius:8px; font-size:0.9rem; cursor:pointer; margin-bottom:12px; }
.copy-btn:hover { background:#2563eb; }
.info { font-size:0.8rem; color:#94a3b8; line-height:1.6; }
.timer { color:#ef4444; font-weight:600; }
.order-id { font-size:0.75rem; color:#cbd5e1; margin-top:12px; }
</style>
</head>
<body>
<div class="card">
  <div class="title">💳 USDT Payment</div>
  <div class="subtitle">Please transfer the exact amount to the address below</div>
  <div class="qr-box"><img src="${qrUrl}" alt="QR Code"></div>
  <div class="amount-box">
    <div class="amount-label">Amount to pay</div>
    <div class="amount-value">${amount}<span class="amount-unit">USDT</span></div>
  </div>
  <div class="addr-box">
    <div class="addr-label">Wallet Address (TRC20)</div>
    <div class="addr-value" id="addr">${address}</div>
  </div>
  <button class="copy-btn" onclick="navigator.clipboard.writeText('${address}').then(()=>this.textContent='Copied!')">📋 Copy Address</button>
  <div class="info">
    Network: <strong>TRON (TRC20)</strong><br>
    Payment will be confirmed automatically after blockchain detection.
  </div>
  <div class="order-id">Order: ${orderId} | Trade: ${tradeId}</div>
  ${redirectUrl ? `<div id="countdown" class="info" style="margin-top:16px;"></div>` : ''}
</div>
${redirectUrl ? `
<script>
function checkPaid() {
  fetch('/api/order-status?trade_id=${tradeId}')
    .then(r => r.json())
    .then(d => { if (d.paid) { window.location.href = '${redirectUrl}'; } })
    .catch(() => {});
}
setInterval(checkPaid, 5000);
</script>` : ''}
</body>
</html>`;

            return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
        }

        // ====== 订单状态查询（支付页面轮询用） ======
        if (url.pathname === "/api/order-status" && request.method === "GET") {
            const tradeId = url.searchParams.get("trade_id") || "";
            const orderId = url.searchParams.get("order_id") || "";
            // 检查该 order_id 是否还有活跃监控（被清除说明已到账）
            let paid = false;
            if (orderId) {
                const watch = await env.db.prepare("SELECT order_id FROM active_watches WHERE order_id = ?").bind(orderId).first();
                paid = !watch;
            }
            return new Response(JSON.stringify({ paid }), { headers: { "Content-Type": "application/json" } });
        }

        // 如果上方的 API 路由均未匹配，则自动去资源库中寻找对应的静态文件（如 /files/xxx.webp）
        return env.assets.fetch(request);
    },

    // 定时器入口 (备用保底，正常情况下由 /api/watch 即时触发)
    async scheduled(event, env, ctx) {
        ctx.waitUntil(this.syncAllChainsData(env));
    },

    // ==========================================
    // 【核心新增】即时按需扫块引擎
    // ==========================================
    // 登记后立即在后台持续扫块，不依赖定时器
    // duration: 持续扫块分钟数, interval: 扫块间隔秒数, mode: fixed(固定间隔) / random(随机间隔)
    async onDemandScan(env, duration, interval, mode) {
        const startTime = Date.now();
        const endTime = startTime + duration * 60 * 1000;
        let scanCount = 0;
        
        console.log(`[按需扫块] 启动: 持续${duration}分钟, 间隔${interval}秒, 模式=${mode}`);
        
        while (Date.now() < endTime) {
            // 每次扫块前检查是否还有活跃订单，没有则提前结束
            const { results: activeWatches } = await env.db.prepare("SELECT order_id FROM active_watches").all();
            if (activeWatches.length === 0) {
                console.log(`[按需扫块] 无活跃订单，提前结束。共扫块${scanCount}次`);
                return;
            }
            
            // 执行一次全链扫块
            try {
                await this.syncAllChainsData(env);
                scanCount++;
            } catch (e) {
                console.error(`[按需扫块] 第${scanCount + 1}次扫块异常:`, e);
            }
            
            // 如果已经到了结束时间，退出
            if (Date.now() >= endTime) break;
            
            // 计算等待时间
            let waitMs;
            if (mode === 'random') {
                // 随机模式：在 interval 的 50%~150% 之间随机
                const minMs = Math.max(5000, interval * 500);   // 最少5秒
                const maxMs = interval * 1500;                    // 最多1.5倍
                waitMs = Math.floor(Math.random() * (maxMs - minMs) + minMs);
            } else {
                // 固定模式
                waitMs = interval * 1000;
            }
            
            // 等待指定间隔
            await new Promise(resolve => setTimeout(resolve, waitMs));
        }
        
        console.log(`[按需扫块] 结束: 持续${duration}分钟, 共扫块${scanCount}次`);
    },

    // ==========================================
    // 4. 全链并发抓取核心引擎
    // ==========================================
    async syncAllChainsData(env) {
        try {
                // 【重构：垃圾回收】清理超过 30 分钟未支付的失效监控任务，防止队列无限膨胀
                await env.db.prepare("DELETE FROM active_watches WHERE created_at < datetime('now', '-30 minutes')").run();
    
                // 【重构：按需提取】只从 active_watches 提取当前活跃的待支付地址
                const { results } = await env.db.prepare("SELECT address, network FROM active_watches").all();
                if (results.length === 0) return; // 核心防御：无订单交易时，在此处直接 return 休眠，产生 0 次 RPC 网络请求！
    
                const { results: webhooks } = await env.db.prepare("SELECT * FROM webhooks WHERE enabled = 1").all();
                const rawNetworks = await getDynamicNetworks(env);
                const NETWORKS = {};
                // 将 KV 里带括号空格的原始键名，全部格式化为纯大写字母+数字
                for (const [key, val] of Object.entries(rawNetworks)) {
                    const normalizedKey = key.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    NETWORKS[normalizedKey] = val;
                }
                const syncTasks = [];
                
                // 按网络将活跃地址分类，极速定位
               const activeTasks = {};
                for (const row of results) {
                    const net = row.network.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    if (!activeTasks[net]) activeTasks[net] = [];
                    // 【修正】增加地址去重逻辑。因为现在支持单地址多订单并发，不去重会导致瞬间重复发送多个相同 RPC 扫块请求
                    if (!activeTasks[net].includes(row.address)) {
                        activeTasks[net].push(row.address);
                    }
                }
    
                // 仅对当前有订单产生的那条链进行精确扫块
                for (const [netName, targetAddresses] of Object.entries(activeTasks)) {
                    const netConfig = NETWORKS[netName];
                    if (!netConfig || targetAddresses.length === 0) continue;
                    
                    if (netConfig.type === 'tron') syncTasks.push(this.syncTronNetwork(env, netName, netConfig, targetAddresses, webhooks));
                    else if (netConfig.type === 'evm') syncTasks.push(this.syncEVMNetwork(env, netName, netConfig, targetAddresses, webhooks));
                    else if (netConfig.type === 'aptos') syncTasks.push(this.syncAptosNetwork(env, targetAddresses, webhooks));
                    else if (netConfig.type === 'solana') syncTasks.push(this.syncSolanaNetwork(env, targetAddresses, webhooks));
                    else if (netConfig.type === 'ton') syncTasks.push(this.syncTonNetwork(env, targetAddresses, webhooks));
                }
            // 并发执行所有链的扫块
            await Promise.allSettled(syncTasks);

        } catch (error) {
            console.error("整体引擎运行失败:", error);
        }
    },

    // --- EVM 扫块核心 ---
    async syncEVMNetwork(env, netName, netConfig, addresses, webhooks) {
        try {
            // 获取链上最新区块
            const blockRes = await fetch(netConfig.rpc, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 })
            });
            const blockData = await blockRes.json();
            const latestBlock = parseInt(blockData.result, 16);

            // 改用 D1 数据库读取上次扫描的区块，默认扫前 50 个区块防遗漏
            const stateRow = await env.db.prepare("SELECT key_value FROM sys_state WHERE key_name = ?").bind(`last_block_${netName}`).first();
            let lastCheckBlock = parseInt((stateRow && stateRow.key_value) ? stateRow.key_value : (latestBlock - 50));
            
            // 如果间隔太大（如首次运行），限制最大跨度为 800 个区块，防止公共 RPC 报错
            if (latestBlock - lastCheckBlock > 800) lastCheckBlock = latestBlock - 800;
            if (latestBlock <= lastCheckBlock) return; 

            for (const addr of addresses) {
                const paddedAddr = "0x000000000000000000000000" + addr.replace("0x", "").toLowerCase();
                const payload = {
                    jsonrpc: "2.0", id: 1, method: "eth_getLogs",
                    params: [{
                        fromBlock: "0x" + lastCheckBlock.toString(16),
                        toBlock: "0x" + latestBlock.toString(16),
                        address: netConfig.usdt,
                        topics: [EVM_TRANSFER_SIG, null, paddedAddr]
                    }]
                };

                const rpcRes = await fetch(netConfig.rpc, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                });
                const logsData = await rpcRes.json();

                if (logsData.result && logsData.result.length > 0) {
                    for (const log of logsData.result) {
                        const txHash = log.transactionHash;
                        const fromAddr = "0x" + log.topics[1].slice(26);
                        const rawAmount = parseInt(log.data, 16);
                        const amountUSDT = (rawAmount / Math.pow(10, netConfig.decimals)).toString();

                        await this.saveAndNotify(env, {
                            network: netName, txHash, amount: amountUSDT, fromAddr, toAddr: addr.toLowerCase(), timestamp: Date.now()
                        }, webhooks);
                    }
                }
            }
            // 改用 D1 数据库的高频更新语句，白嫖每天 10 万次写入额度
            await env.db.prepare("INSERT INTO sys_state (key_name, key_value) VALUES (?, ?) ON CONFLICT(key_name) DO UPDATE SET key_value = excluded.key_value").bind(`last_block_${netName}`, latestBlock.toString()).run();
        } catch (e) { console.error(`${netName} 同步异常:`, e); }
    },

    // --- 波场 TRON 同步核心 ---
    async syncTronNetwork(env, netName, netConfig, addresses, webhooks) {
        const stateRow = await env.db.prepare("SELECT key_value FROM sys_state WHERE key_name = ?").bind("last_check_tron").first();
        let minTimestamp = parseInt((stateRow && stateRow.key_value) ? stateRow.key_value : (Date.now() - 3600000));
        let globalNewestTime = minTimestamp;

        for (const myAddress of addresses) {
            try {
                // 【修正】使用动态传入的 netConfig.usdt，彻底摆脱写死的常量
                const response = await fetch(`https://api.trongrid.io/v1/accounts/${myAddress}/transactions/trc20?contract_address=${netConfig.usdt}&min_timestamp=${minTimestamp}`);
                const json = await response.json();

                if (json.data && json.data.length > 0) {
                    for (const tx of json.data) {
                        if (tx.to === myAddress) {
                            // 金额转换也可以使用动态精度 (波场 USDT 默认是 6)
                            const decimals = netConfig.decimals || 6;
                            const amountUSDT = (parseInt(tx.value) / Math.pow(10, decimals)).toString();
                            
                            await this.saveAndNotify(env, {
                                network: netName, txHash: tx.transaction_id, amount: amountUSDT, fromAddr: tx.from, toAddr: tx.to, timestamp: tx.block_timestamp
                            }, webhooks);
                        }
                        if (tx.block_timestamp > globalNewestTime) globalNewestTime = tx.block_timestamp;
                    }
                }
            } catch (e) { console.error(`TRON 同步异常:`, e); }
        }
        if (globalNewestTime > minTimestamp) {
            await env.db.prepare("INSERT INTO sys_state (key_name, key_value) VALUES (?, ?) ON CONFLICT(key_name) DO UPDATE SET key_value = excluded.key_value").bind("last_check_tron", globalNewestTime.toString()).run();
        }
    },
    // --- 异构公链独立扫块引擎框架 (Aptos, Solana, TON) ---
    async syncAptosNetwork(env, addresses, webhooks) {
        // TODO: 通过 Aptos REST API 拉取对应地址的 0x1::coin::CoinStore<0x...USDT> 的 DepositEvent
        // 扫到之后调用公用方法：await this.saveAndNotify(env, { network: 'APTOS', txHash: ..., amount: ..., fromAddr: ..., toAddr: ..., timestamp: ... }, webhooks);
    },
    async syncSolanaNetwork(env, addresses, webhooks) {
        // TODO: 通过 Solana 的 getSignaturesForAddress 轮询 SPL-Token 转移情况
        // 扫到之后调用公用方法：await this.saveAndNotify(env, txData, webhooks);
    },
    async syncTonNetwork(env, addresses, webhooks) {
        // TODO: 通过 TonCenter API 查询 Jetton (USDT) 的交易历史
        // 扫到之后调用公用方法：await this.saveAndNotify(env, txData, webhooks);
    },

    // --- 数据入库与 Webhook 分发 ---
    async saveAndNotify(env, tx, webhooks) {
        const dbRes = await env.db.prepare("INSERT OR IGNORE INTO orders (tx_hash, network, amount, from_address, to_address) VALUES (?, ?, ?, ?, ?)")
            .bind(tx.txHash, tx.network, tx.amount, tx.fromAddr, tx.toAddr).run();

        if (dbRes.meta.changes > 0 && webhooks.length > 0) {
            // 先查询关联的 order_id（用于 BEpusdt 回调），再清理监控池
            const watchRecord = await env.db.prepare("SELECT order_id FROM active_watches WHERE address = ? AND expected_amount = ?").bind(tx.toAddr, tx.amount).first();

            // 清理任务：通过 order_id 或 address+amount
            await env.db.prepare("DELETE FROM active_watches WHERE address = ? AND expected_amount = ?").bind(tx.toAddr, tx.amount).run();

            for (const wh of webhooks) {
                if (!wh.enabled || !wh.url || !wh.secret) continue;
                const bindsRaw = wh.binds.split(',').map(s => s.trim().toLowerCase());
                
                // 核心升级：拦截前端传来的 "地址@@网络" 格式，做到跨链同地址精准隔离推送
                const isMatch = bindsRaw.includes('*') || bindsRaw.some(b => {
                    const parts = b.split('@@');
                    if (parts[0] !== tx.toAddr.toLowerCase()) return false; // 物理地址不匹配，拦截
                    // 将绑定的网络名也进行去特殊字符和去空格处理，然后再比对
                    if (parts[1] && parts[1] !== '全网并发' && parts[1].replace(/[^a-zA-Z0-9]/g, '').toLowerCase() !== tx.network.toLowerCase()) return false;
                    return true; // 地址和网络全对上，放行
                });
                
                if (isMatch) {
                    const callbackType = wh.callback_type || 'default';

                    if (callbackType === 'bepusdt') {
                        // ===== BEpusdt 兼容回调格式（供独角数卡等发卡网使用） =====
                        const orderId = watchRecord ? watchRecord.order_id : `XY${Date.now()}`;
                        const tradeId = `XYT${Date.now()}${Math.random().toString(36).substring(2, 6)}`;
                        const amountNum = parseFloat(tx.amount) || 0;

                        // BEpusdt 签名：参数按 key 排序，拼接 + authToken，MD5
                        const signParams = {
                            trade_id: tradeId,
                            order_id: orderId,
                            amount: amountNum,
                            actual_amount: amountNum,
                            token: tx.toAddr,
                            block_transaction_id: tx.txHash,
                            status: 2
                        };
                        const sortedKeys = Object.keys(signParams).sort();
                        const signStr = sortedKeys.map(k => `${k}=${signParams[k]}`).join('&') + wh.secret;
                        const signHex = md5(signStr);

                        fetch(wh.url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                ...signParams,
                                signature: signHex
                            })
                        }).catch(e => console.error(`[${tx.network}] BEpusdt 回调分发失败:`, e));

                    } else {
                        // ===== 默认回调格式（原逻辑） =====
                        const signText = `${tx.network}${tx.txHash}${tx.amount}${wh.secret}`;
                        const msgBuffer = new TextEncoder().encode(signText);
                        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
                        const signHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

                        fetch(wh.url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                network: tx.network,
                                tx_hash: tx.txHash,
                                amount: tx.amount,
                                from_address: tx.fromAddr,
                                to_address: tx.toAddr,
                                sign: signHex,
                                timestamp: tx.timestamp
                            })
                        }).catch(e => console.error(`[${tx.network}] 分发失败:`, e));
                    }
                }
            }
        }
    }
};
