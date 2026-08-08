-- ==============================================================================
-- 夏雨全链矩阵系统 D1 数据库初始化脚本 (v5)
-- ==============================================================================

-- ⚠️ 注意：如果您需要彻底清空并重置数据库，请取消下面四行 DROP 语句的注释。
-- 这将删除所有历史订单和配置数据，请谨慎操作！
-- DROP TABLE IF EXISTS orders;
-- DROP TABLE IF EXISTS webhooks;
-- DROP TABLE IF EXISTS addresses;
-- DROP TABLE IF EXISTS sys_state;

-- ------------------------------------------------------------------------------
-- 1. 全链交易流水表 (Orders)
-- 用于记录所有通过边缘节点抓取到的链上入账数据。
-- 采用 tx_hash + network 作为联合主键，彻底杜绝同哈希在异构链上的双花重放攻击。
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    tx_hash TEXT,
    network TEXT NOT NULL,
    amount TEXT NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tx_hash, network)
);

-- ------------------------------------------------------------------------------
-- 2. 异步回调路由表 (Webhooks)
-- 用于保存下游发卡网或其他业务系统的 API 接收网关。
-- 支持精准过滤 (binds) 和独立通讯密钥 (secret)。
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS webhooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT NOT NULL,
    binds TEXT DEFAULT '*',
    icon TEXT,
    remark TEXT,
    enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 3. 监控收款地址池 (Addresses)
-- ⚠️ 核心升级：已移除 address 字段的 UNIQUE 限制。
-- 结合前端的 @@ 标识，完美支持将同一个物理钱包地址多次添加并独立绑定不同的区块链网络。
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    icon TEXT,
    remark TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 4. 系统高频状态表 (System State)
-- ⚠️ 核心升级：专为解决 Cloudflare KV 每日 1000 次 PUT 限制而设计的降维替代方案。
-- 承载引擎每分钟高频扫块时的“最新区块高度/时间戳”记录，利用 D1 每日 10 万次免费写入额度。
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sys_state (
    key_name TEXT PRIMARY KEY,
    key_value TEXT
);

CREATE TABLE IF NOT EXISTS active_watches (
    address TEXT PRIMARY KEY,  
    network TEXT NOT NULL,   
    expected_amount TEXT NOT NULL, 
    order_id TEXT NOT NULL, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP 
);
