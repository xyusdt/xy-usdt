// worker.js
import dashboardHTML from "./public/admin.html";
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
            interval: interval || "30",
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
            // 自动创建 webhooks 表
            await env.db.prepare(`CREATE TABLE IF NOT EXISTS webhooks (
                id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, url TEXT NOT NULL,
                secret TEXT NOT NULL, binds TEXT DEFAULT '*', icon TEXT, remark TEXT,
                enabled INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

        // ==========================================
        // 2. 登录与鉴权路由
        // ==========================================
        if (url.pathname === "/login" && request.method === "POST") {
            const data = await request.formData();
            if (data.get("username") === await env.kv.get("admin_username") && data.get("password") === await env.kv.get("admin_password")) {
                const token = crypto.randomUUID();
                await env.kv.put("admin_token", token, { expirationTtl: 86400 });
                return new Response("Login Success", { status: 302, headers: { "Location": "/dashboard", "Set-Cookie": `token=${token}; HttpOnly; Path=/` } });
            }
            return new Response("账号或密码错误", { status: 401 });
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
            font-size: 1.85rem;
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
            gap: 18px;
        }
        .brand-feature {
            display: flex;
            align-items: flex-start;
            gap: 14px;
        }
        .brand-feature-icon {
            width: 36px; height: 36px;
            background: rgba(255,255,255,0.12);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 9px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .brand-feature-icon svg {
            width: 18px; height: 18px;
            fill: none; stroke: white; stroke-width: 2;
            stroke-linecap: round; stroke-linejoin: round;
        }
        .brand-feature-text h3 {
            color: white;
            font-size: 0.9rem;
            font-weight: 600;
            margin-bottom: 3px;
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
            margin-bottom: 36px;
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
            <h1 class="brand-title">全链 USDT 收款<br>一站式监控矩阵</h1>
            <p class="brand-desc">覆盖 20+ 主流公链，边缘节点实时拦截入账，秒级触发回调通知。为您的发卡网、商户系统提供企业级稳定收款能力。</p>
            <div class="brand-features">
                <div class="brand-feature">
                    <div class="brand-feature-icon">
                        <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                    </div>
                    <div class="brand-feature-text">
                        <h3>即时扫块引擎</h3>
                        <p>按需唤醒，0 RPC 浪费。发卡网下单即触发精准扫块，到账秒级回调。</p>
                    </div>
                </div>
                <div class="brand-feature">
                    <div class="brand-feature-icon">
                        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 6v6l4 2"/></svg>
                    </div>
                    <div class="brand-feature-text">
                        <h3>20+ 公链接入</h3>
                        <p>TRON、ETH、BSC、Solana、TON、Aptos 等主流公链全覆盖，一键配置即用。</p>
                    </div>
                </div>
                <div class="brand-feature">
                    <div class="brand-feature-icon">
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
                <p>请输入您的账号信息登录系统</p>
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
                <button type="submit" class="login-btn">安全登录</button>
            </form>
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
                return new Response(JSON.stringify({ success: true }));
            }
            return new Response(JSON.stringify({
                username: await env.kv.get("admin_username"), 
                password: await env.kv.get("admin_password"),
            }), { headers: { "Content-Type": "application/json" } });
        }

        if (url.pathname === "/api/webhooks") {
            if (request.method === "GET") {
                const { results } = await env.db.prepare("SELECT * FROM webhooks ORDER BY created_at DESC").all();
                return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json" } });
            }
            if (request.method === "POST") {
                const data = await request.json();
                await env.db.prepare("INSERT INTO webhooks (name, url, secret, binds, icon, remark) VALUES (?, ?, ?, ?, ?, ?)").bind(data.name, data.url, data.secret, data.binds, data.icon, data.remark).run();
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
                    await env.db.prepare("UPDATE webhooks SET name=?, url=?, secret=?, binds=?, icon=?, remark=? WHERE id=?").bind(data.name, data.url, data.secret, data.binds, data.icon, data.remark, data.id).run();
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
            const interval = parseInt(scan_interval) || parseInt(sysConfig.interval) || 30;
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
                    // 安全增强：签名中加入 network 防止重放攻击
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
};
