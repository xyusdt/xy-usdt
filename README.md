<p align="center">
  <img src="https://img.shields.io/badge/Cloudflare-Workers-F4811F?logo=cloudflare&logoColor=white" alt="Cloudflare Workers">
  <img src="https://img.shields.io/badge/D1-Database-3B82F6?logo=cloudflare&logoColor=white" alt="D1 Database">
  <img src="https://img.shields.io/badge/链数-20+-10B981" alt="20+ Chains">
  <img src="https://img.shields.io/badge/协议-USDT%20|%20USDT0-22D3EE" alt="USDT">
  <img src="https://img.shields.io/badge/许可证-MIT-blue" alt="License">
</p>

<h1 align="center">夏雨全链矩阵 · USDT 收款监控系统</h1>

<p align="center">
  基于 Cloudflare Workers 边缘网络构建的全链 USDT 收款监控矩阵。<br>
  覆盖 20+ 主流公链，按需唤醒扫块，秒级触发回调，为发卡网/商户系统提供企业级收款能力。
</p>

---

## 📖 目录

- [核心特性](#-核心特性)
- [系统架构](#-系统架构)
- [部署指南](#-部署指南)
- [后台设置](#-后台设置)
- [对接发卡网](#-对接发卡网)
- [API 参考](#-api-参考)
- [回调报文签名验证](#-回调报文签名验证)
- [常见问题](#-常见问题)

---

## ✨ 核心特性

| 特性 | 说明 |
|------|------|
| **20+ 公链覆盖** | TRON、ETH、BSC、Solana、TON、Aptos、Arbitrum、Optimism、Polygon、Base、Avalanche、Berachain、Monad 等 |
| **按需唤醒 (JIT)** | 发卡网下单时才启动扫块，平时 0 消耗，不浪费 RPC 额度 |
| **即时触发** | 调用 `/api/watch` 后立即启动后台扫块，无需等待定时器 |
| **多发卡网并行** | 支持 N 个发卡网共用同一套收款地址，到账后广播通知所有回调节点 |
| **独立密钥签名** | 每个回调路由独立 APP_SECRET，SHA-256 签名防篡改 |
| **边缘安全架构** | 天然抗 DDoS，全球边缘节点低延迟分发 |
| **零代码扩容** | 新增 EVM 兼容链只需在后台填入 RPC 和合约地址 |
| **智能网络识别** | 粘贴 `T` 开头自动识别波场，`0x` 开头自动并发所有 EVM 链 |

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                     发卡网 / 商户系统                         │
│                                                             │
│  ① 用户下单 → POST /api/watch (登记订单)                     │
│  ④ 收到回调 → 验签 → 发货/充值                               │
└─────────────┬──────────────────────────────▲────────────────┘
              │                              │
              ▼                              │
┌─────────────────────────────────────────────────────────────┐
│              Cloudflare Workers 边缘节点                      │
│                                                             │
│  ② 即时扫块引擎启动                                          │
│     ├── EVM 链: eth_getLogs (Transfer 事件)                  │
│     ├── Tron: API 轮询 TRC20 转账                            │
│     ├── Solana: getTokenAccounts                             │
│     ├── TON: /transactions                                   │
│     └── Aptos: events 查询                                   │
│                                                             │
│  ③ 检测到入账 → 写入 D1 → 遍历 Webhooks 广播回调             │
└─────────────┬──────────────────────────────▲────────────────┘
              │                              │
              ▼                              │
┌──────────────────────┐    ┌────────────────────────────────┐
│   D1 数据库           │    │   区块链 RPC 节点               │
│                      │    │                                │
│  • orders (流水)     │    │  • Ethereum / BSC / Tron ...   │
│  • webhooks (路由)   │    │  • 公共节点 或 私有节点          │
│  • addresses (地址)  │    │                                │
│  • active_watches    │    └────────────────────────────────┘
└──────────────────────┘
```

**工作流程：**

1. 发卡网生成订单后，调用 `POST /api/watch` 登记（地址 + 金额 + 订单号）
2. 系统立即启动后台扫块循环（持续 N 分钟，每 M 秒扫一次）
3. 扫到匹配金额入账 → 写入 `orders` 表 → 遍历所有匹配的 webhook 广播回调
4. 发卡网收到回调 → 验签 → 执行发货/充值逻辑

---

## 🚀 部署指南

本项目提供两种部署方式，选择适合你的：

| 方式 | 适合人群 | 优点 |
|------|----------|------|
| **方式一：浏览器部署** | 不懂代码 / 没有服务器 | 无需安装任何工具，全程鼠标操作 |
| **方式二：命令行部署** | 熟悉终端操作 | 一键部署，后续更新方便 |

---

### 方式一：浏览器界面部署（推荐新手）

> 全程在 Cloudflare 网页后台操作，不需要安装任何软件，适合没有技术基础的用户。

#### 1. 注册 Cloudflare 账号

访问 [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) 注册一个免费账号。

#### 2. 创建 KV 命名空间

1. 登录 Cloudflare Dashboard
2. 左侧菜单找到 **Workers 和 Pages**
3. 点击左侧子菜单 **KV**
4. 点击右上角 **创建命名空间**
5. 名称填写 `kv`，点击 **添加**
6. ✅ 创建成功后，**记下命名空间 ID**（点击右侧的「复制」按钮保存好）

```
命名空间 ID 示例：6af7f7a56e9341edb03883c67e01781c
```

#### 3. 创建 D1 数据库

1. 左侧菜单回到 **Workers 和 Pages**
2. 点击左侧子菜单 **D1**
3. 点击右上角 **创建数据库**
4. 数据库名称填写 `xy-usdt`，位置选择「自动」，点击 **创建**
5. ✅ 创建成功后，**记下数据库 ID**（页面上会显示）

```
数据库 ID 示例：be97c23d-c895-4596-a876-b9b84c79bdd1
```

#### 4. 初始化数据库表结构

1. 点击刚创建的 `xy-usdt` 数据库进入详情页
2. 点击上方的 **控制台** 标签页
3. 在 SQL 输入框中，依次粘贴执行以下建表语句：

**第一段：交易流水表**
```sql
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
```

**第二段：回调路由表**
```sql
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
```

**第三段：收款地址表**
```sql
CREATE TABLE IF NOT EXISTS addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    icon TEXT,
    remark TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**第四段：系统状态表**
```sql
CREATE TABLE IF NOT EXISTS sys_state (
    key_name TEXT PRIMARY KEY,
    key_value TEXT
);
```

**第五段：活跃监控表**
```sql
CREATE TABLE IF NOT EXISTS active_watches (
    order_id TEXT PRIMARY KEY,
    address TEXT NOT NULL,
    network TEXT NOT NULL,
    expected_amount TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

> 💡 每段 SQL 粘贴后点击右下角「执行」按钮，看到 `Success` 即表示成功。也可以一次性全部粘贴执行。

#### 5. 创建 Worker

1. 左侧菜单回到 **Workers 和 Pages**
2. 点击右上角 **创建应用程序**
3. 选择 **Worker** → 点击 **创建 Worker**
4. 名称填写 `xy-usdt`（或自定义），点击 **部署**
5. 部署完成后，你会看到一个默认域名，如 `xy-usdt.xxx.workers.dev`
6. ⚠️ 先记住这个域名，后面会用到

#### 6. 上传代码

有两种方式上传代码到 Worker：

**方式 A：在线编辑器上传（简单）**

1. 进入刚创建的 Worker 详情页
2. 点击上方的 **编辑代码** 标签
3. 进入在线编辑器后：
   - 左侧文件树，右键 `worker.js` → 用本仓库的 `worker.js` 内容**全部替换**
   - 左侧文件树，右键 `public/` 文件夹 → 创建 `admin.html`，粘贴本仓库 `public/admin.html` 的内容
   - 左侧文件树，创建 `public/files/` 目录，上传本仓库 `public/files/` 下的所有 `.webp` 图片
4. 点击右上角 **保存并部署**

**方式 B：直接粘贴代码（最快）**

1. 进入刚创建的 Worker 详情页
2. 点击上方的 **编辑代码** 标签
3. 在左侧文件树找到 `worker.js`，将本仓库的 `worker.js` 内容**全部替换**进去
4. 点击右上角 **保存并部署**

> ⚠️ 如果使用方式 B（仅 worker.js），管理后台的静态资源（admin.html、图片）需要通过 Workers Assets 托管，或修改代码将 admin.html 内联到 worker.js 中。

#### 7. 绑定变量

这是最关键的一步！进入 Worker 的设置页面：

1. 进入 Worker 详情页 → 点击 **设置** 标签
2. 点击左侧 **变量和机密**
3. 点击 **添加**，依次添加以下变量：

| 变量名称 | 类型 | 值 |
|----------|------|----|
| `DB` | D1 数据库绑定 | 选择刚创建的 `xy-usdt` |
| `KV` | KV 命名空间绑定 | 选择刚创建的 `kv` |

添加步骤：
- 点击「添加」→ 类型选择「D1 数据库绑定」→ 变量名称填 `DB` → D1 数据库选择 `xy-usdt` → 保存
- 再次点击「添加」→ 类型选择「KV 命名空间绑定」→ 变量名称填 `KV` → KV 命名空间选择 `kv` → 保存

> ⚠️ 变量名称必须是大写的 `DB` 和 `KV`，与代码中的 `env.db` 和 `env.kv` 对应。

#### 8. 配置 Cron 触发器

1. 在 Worker 设置页面，点击左侧 **触发事件**
2. 找到 **Cron 触发器** 区域
3. 点击 **添加 Cron 触发器**
4. 表达式填写：`* * * * *`（每分钟执行一次）
5. 点击 **添加**

#### 9. 配置静态资源（Assets）

1. 在 Worker 设置页面，点击左侧 **绑定**
2. 点击 **添加** → 类型选择 **Assets**
3. 变量名称填 `assets`
4. 保存

> 如果你使用了「在线编辑器」方式上传了 `public/` 文件夹，静态资源会自动托管。

#### 10. 访问后台

1. 浏览器访问你的 Workers 域名，例如：`https://xy-usdt.你的子域.workers.dev`
2. 使用默认账号登录：
   - 账号：`admin`
   - 密码：`123456`
3. ✅ **请立即在「基础配置」中修改默认密码！**

#### 11. 绑定自定义域名（可选）

1. 在 Worker 设置页面，点击左侧 **触发事件**
2. 找到 **路由** 区域
3. 点击 **添加自定义域名**
4. 输入你的域名（需已在 Cloudflare 托管该域名的 DNS）
5. 点击 **添加自定义域名**
6. Cloudflare 会自动配置 DNS 记录和 SSL 证书

#### 12. 更新代码

后续更新只需：
1. 进入 Worker → **编辑代码**
2. 替换 `worker.js` 内容
3. 点击 **保存并部署**

---

### 方式二：命令行部署（推荐有经验者）

#### 前置条件

- [Node.js](https://nodejs.org/) >= 18
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (Cloudflare 官方部署工具)
- Cloudflare 账号

#### 第一步：克隆仓库

```bash
git clone https://github.com/xyusdt/xy-usdt.git
cd xy-usdt
```

### 第二步：安装 Wrangler

```bash
npm install -g wrangler
wrangler login
```

### 第三步：创建 D1 数据库

```bash
wrangler d1 create xy-usdt
```

执行后会输出类似：

```
✅ Successfully created DB 'xy-usdt'
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

> 📌 复制 `database_id`，填入 `wrangler.toml` 中的 `database_id` 字段。

### 第四步：创建 KV 命名空间

```bash
wrangler kv namespace create kv
```

输出类似：

```
{ binding = "kv", id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
```

> 📌 复制 `id`，填入 `wrangler.toml` 中的 `id` 字段。

### 第五步：配置 wrangler.toml

打开 `wrangler.toml`，将上面获取的 ID 填入：

```toml
name = "xy-usdt"
main = "worker.js"
compatibility_date = "2026-05-20"

[triggers]
crons = ["* * * * *"]    # 每分钟定时器（备用保底）

[[kv_namespaces]]
binding = "kv"
id = "你的KV命名空间ID"

[[d1_databases]]
binding = "db"
database_name = "xy-usdt"
database_id = "你的D1数据库ID"

[[rules]]
type = "Text"
globs = ["**/*.html"]
fallthrough = true

[assets]
binding = "assets"
directory = "public"
run_worker_first = true
```

### 第六步：初始化数据库表

```bash
wrangler d1 execute xy-usdt --file=./schema.sql
```

### 第七步：部署

```bash
wrangler deploy
```

部署成功后，Wrangler 会输出你的 Workers 域名，例如：

```
Published xy-usdt (x.xx sec)
  https://xy-usdt.你的子域.workers.dev
```

### 第八步：绑定自定义域名（可选）

在 Cloudflare Dashboard 中：

1. 进入 **Workers & Pages** → 选择 `xy-usdt`
2. 点击 **Settings** → **Domains & Routes**
3. 添加自定义域名（需已在 Cloudflare 托管）

---

## ⚙️ 后台设置

### 首次登录

访问你的 Workers 域名，使用默认账号登录：

```
账号: admin
密码: 123456
```

> ⚠️ **请立即在「基础配置」中修改默认密码！**

### 1. 添加收款地址

进入 **收款地址** 页面，点击 **+ 增加地址**：

| 字段 | 说明 | 示例 |
|------|------|------|
| 网络/名称 | 自定义钱包标识 | `波场主钱包` |
| 钱包地址 | 链上收款地址 | `Txxxxx...` 或 `0xxxx...` |
| 指定扫描网络 | 选择扫描策略 | `智能自动识别` (默认) |
| 图标 | 钱包图标 URL (选填) | — |
| 备注 | 内部备注 (选填) | `业务A专用` |

**网络识别规则：**
- 粘贴 `T` 开头地址 → 自动挂载所有 `tron` 类型网络
- 粘贴 `0x` 开头地址 → 自动并发所有 `evm` 类型网络
- 手动指定网络 → 仅扫描该单链（节省 RPC）

### 2. 配置网络节点

进入 **网络节点** 页面，查看/编辑已接入的区块链网络。

系统预置了常用网络，你也可以点击 **+ 新增网络** 添加自定义链：

| 字段 | 说明 | 示例 |
|------|------|------|
| 标识 | 网络唯一主键 (建议大写) | `BSC` |
| 架构 | 底层引擎类型 | `evm` / `tron` / `solana` / `ton` / `aptos` |
| RPC 节点 | 链上数据 API | `https://bsc-dataseed.binance.org` |
| USDT 合约 | 代币合约地址 | `0x55d398326f99059...` |
| 精度 | 小数位数 | `6` 或 `18` 或 `9` |
| 标识底色 | 前端显示颜色 | — |

**常用公链参数速查：**

| 网络 | 架构 | 精度 | USDT 合约 |
|------|------|------|-----------|
| TRON | tron | 6 | `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t` |
| ETH | evm | 6 | `0xdac17f958d2ee523a2206206994597c13d831ec7` |
| BSC | evm | 18 | `0x55d398326f99059ff775485246999027b3197955` |
| Arbitrum | evm | 6 | `0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9` |
| Solana | solana | 6 | (引擎内置) |
| TON | ton | 9 | (引擎内置) |
| Aptos | aptos | 6 | (引擎内置) |

### 3. 添加回调路由

进入 **回调路由** 页面，点击 **+ 增加回调节点**：

| 字段 | 说明 | 示例 |
|------|------|------|
| 节点名称 | 发卡网标识 | `官方发卡网` |
| CALLBACK_URL | 发卡网回调接收地址 | `https://发卡网域名/api/notify/usdt` |
| APP_SECRET | 通讯密钥 (双方约定) | `my_secret_key_123` |
| 绑定号池 | 接收哪些地址的通知 | `*` (全部) 或指定地址 |
| 图标 | 节点图标 URL (选填) | — |
| 备注 | 内部备注 (选填) | — |

**多发卡网场景：** 添加多条回调路由即可，每条独立 URL 和密钥。

### 4. 扫块引擎配置

进入 **基础配置** 页面，设置即时扫块参数：

| 参数 | 说明 | 建议值 |
|------|------|--------|
| 扫块持续时长 | 订单登记后持续扫块的分钟数 | `5` 分钟 |
| 扫块间隔 | 每次扫块之间的等待秒数 | `30` 秒 |
| 扫块间隔模式 | `固定` 或 `随机` (防 RPC 限流) | `随机` |

---

## 🔌 对接发卡网

### 核心流程

```
发卡网                              全链矩阵
  │                                    │
  │  POST /api/watch                   │
  │  { address, network, amount,       │
  │    order_id }                      │
  │  Authorization: Bearer <secret>    │
  │ ─────────────────────────────────► │
  │                                    │  ← 扫块引擎启动
  │                                    │  ← 检测到入账
  │  POST <CALLBACK_URL>               │
  │  { tx_hash, amount, sign, ... }    │
  │ ◄───────────────────────────────── │
  │                                    │
  │  验签 → 发货                       │
```

### 1. 登记订单（发卡网 → 矩阵）

用户在发卡网下单后，发卡网向矩阵发送监控请求：

```bash
curl -X POST https://你的域名/api/watch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 你的APP_SECRET" \
  -d '{
    "address": "Txxxxxxx收款地址",
    "network": "TRON",
    "amount": "100.50",
    "order_id": "ORDER_20260808_001"
  }'
```

**响应：**

```json
{
  "success": true,
  "scan_started": true,
  "scan_config": {
    "duration_min": 5,
    "interval_sec": 30,
    "mode": "random"
  }
}
```

| 参数 | 必填 | 说明 |
|------|------|------|
| `address` | ✅ | 收款钱包地址 |
| `network` | ✅ | 网络标识，如 `TRON`、`BSC`、`ETH` |
| `amount` | ✅ | 期望到账金额 (精确匹配) |
| `order_id` | ✅ | 订单唯一 ID (防重复) |
| `scan_duration` | ❌ | 扫块时长 (分钟)，不填用系统默认 |
| `scan_interval` | ❌ | 扫块间隔 (秒)，不填用系统默认 |
| `scan_mode` | ❌ | `fixed` 或 `random`，不填用系统默认 |

> 🔐 `Authorization` Header 中的密钥必须与后台「回调路由」中某条记录的 `APP_SECRET` 一致，否则返回 401。

### 2. 接收回调（矩阵 → 发卡网）

到账后，矩阵向你的 `CALLBACK_URL` 发送 POST 请求：

```json
{
  "network": "TRON",
  "tx_hash": "abc123def456...",
  "amount": "100.50",
  "from_address": "T付款方地址",
  "to_address": "T收款方地址",
  "sign": "sha256签名字符串",
  "timestamp": 1723094400
}
```

### 3. 发卡网验签

```php
<?php
$rawBody = file_get_contents('php://input');
$notifyData = json_decode($rawBody, true);

$network   = $notifyData['network'];
$txHash    = $notifyData['tx_hash'];
$amount    = $notifyData['amount'];
$sign      = $notifyData['sign'];
$timestamp = $notifyData['timestamp'];

// 本地密钥（与后台回调路由中的 APP_SECRET 一致）
$appSecret = '你的APP_SECRET';

// 按顺序拼接签名
$stringToSign = $network . $txHash . $amount . $appSecret;
$calculatedSign = hash('sha256', $stringToSign);

if ($calculatedSign !== $sign) {
    http_response_code(403);
    die(json_encode(['code' => 403, 'msg' => '签名验证失败']));
}

// 验签通过，执行发货逻辑
// TODO: 根据 amount 或 tx_hash 匹配订单，发放卡密...

echo json_encode(['code' => 200, 'msg' => 'SUCCESS']);
```

> ⚠️ 签名拼接顺序为：`网络标识 + 交易哈希 + 金额 + APP_SECRET`，请严格按此顺序。

---

## 📡 API 参考

### 认证方式

| 接口 | 认证方式 |
|------|----------|
| `/api/watch` | `Authorization: Bearer <APP_SECRET>` |
| `/api/orders` | Cookie Token (登录后) |
| `/api/webhooks` | Cookie Token (登录后) |
| `/api/addresses` | Cookie Token (登录后) |
| `/api/networks` | Cookie Token (登录后) |
| `/api/settings` | Cookie Token (登录后) |

### 订单管理

```
GET    /api/orders                    获取最近 100 条流水
DELETE /api/orders?tx_hash=xx&network=xx   删除单条
DELETE /api/orders                   批量删除 (Body: { items: [...] })
```

### 回调路由

```
GET    /api/webhooks                  获取所有路由
POST   /api/webhooks                  新增路由
PUT    /api/webhooks?id=xx            更新路由
PUT    /api/webhooks?id=xx&status=1   启用/禁用路由
DELETE /api/webhooks?id=xx            删除路由
```

### 收款地址

```
GET    /api/addresses                 获取所有地址
POST   /api/addresses                 新增地址
PUT    /api/addresses                 更新地址
DELETE /api/addresses?id=xx           删除地址
```

### 网络节点

```
GET    /api/networks                  获取所有网络配置
POST   /api/networks                  更新全量网络配置
```

### 扫块配置

```
GET    /api/scan-config               获取扫块配置
POST   /api/scan-config               保存扫块配置
```

### 手动同步

```
POST   /api/sync                      手动触发全链数据同步
```

---

## 🔒 回调报文签名验证

### 签名算法

```
签名原文 = network + tx_hash + amount + APP_SECRET
签名结果 = SHA-256(签名原文)
```

### 验证示例

假设收到回调：

```json
{
  "network": "TRON",
  "tx_hash": "abc123",
  "amount": "100.50",
  "sign": "xxxx"
}
```

本地计算：

```
原文 = "TRON" + "abc123" + "100.50" + "你的密钥"
签名 = SHA-256(原文)
对比 = 签名 === 收到的 sign
```

### 各语言验签代码

<details>
<summary><b>PHP</b></summary>

```php
$stringToSign = $network . $txHash . $amount . $appSecret;
$calculated = hash('sha256', $stringToSign);
if ($calculated !== $sign) { /* 签名非法 */ }
```
</details>

<details>
<summary><b>Node.js</b></summary>

```js
const crypto = require('crypto');
const stringToSign = network + txHash + amount + appSecret;
const calculated = crypto.createHash('sha256').update(stringToSign).digest('hex');
if (calculated !== sign) { /* 签名非法 */ }
```
</details>

<details>
<summary><b>Python</b></summary>

```python
import hashlib
string_to_sign = network + tx_hash + amount + app_secret
calculated = hashlib.sha256(string_to_sign.encode()).hexdigest()
if calculated != sign:
    # 签名非法
    pass
```
</details>

<details>
<summary><b>Go</b></summary>

```go
import (
    "crypto/sha256"
    "encoding/hex"
)
stringToSign := network + txHash + amount + appSecret
hash := sha256.Sum256([]byte(stringToSign))
calculated := hex.EncodeToString(hash[:])
if calculated != sign {
    // 签名非法
}
```
</details>

---

## ❓ 常见问题

### Q: 部署后无法自动扫块？

确认 Cloudflare 控制台中已正确配置 Cron 触发器：

**Workers → 设置 → 触发器 → Cron 表达式**：`* * * * *`

### Q: 多个发卡网用同一个钱包怎么配置？

1. 在「收款地址」中添加一次该钱包地址
2. 在「回调路由」中为每个发卡网各添加一条记录
3. 每条路由填各自的回调 URL 和密钥，绑定号池填 `*`
4. 收到款后系统会广播通知所有匹配的路由

### Q: 如何避免多发卡网串单？

- 发卡网生成订单时使用**带随机小数的金额**（如 100.37、100.82），降低碰撞概率
- 或者不同发卡网绑定不同的收款地址（最稳妥）

### Q: 扫块会不会被 RPC 节点限流？

- 系统默认使用「随机间隔」模式，在设定值的 50%~150% 之间波动
- 建议使用私有 RPC 节点，公共节点有请求频率限制
- 按需唤醒架构下，平时不扫块，只有下单时才触发

### Q: 如何添加新的 EVM 兼容链？

在「网络节点」页面点击 **+ 新增网络**，填入：

- 标识：链名缩写 (如 `BASE`)
- 架构：`evm`
- RPC：该链的公共/私有 RPC 端点
- USDT 合约：该链上 USDT/USDT0 的合约地址
- 精度：大多数为 `6`，部分为 `18`

### Q: Cloudflare Workers 免费额度够用吗？

| 资源 | 免费额度 | 说明 |
|------|----------|------|
| Workers 请求 | 100,000 次/天 | 正常使用足够 |
| D1 数据库 | 100,000 行读/天, 50,000 行写/天 | 流水定期清理 |
| KV 读取 | 100,000 次/天 | 内存缓存已优化 |
| KV 写入 | 1,000 次/天 | 高频数据已改用 D1 |

> 💡 系统已内置内存缓存 + D1 降维方案，KV 写入压力极低。

### Q: 如何更新部署？

```bash
git pull
wrangler deploy
```

---

## 📄 许可证

MIT License

---

<p align="center">
  <sub>夏雨全链矩阵 · Powered by Cloudflare Workers</sub>
</p>
