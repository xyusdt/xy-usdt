<p align="center">
  <img src="https://img.shields.io/badge/Cloudflare-Workers-F4811F?logo=cloudflare&logoColor=white" alt="Cloudflare Workers">
  <img src="https://img.shields.io/badge/D1-Database-3B82F6?logo=cloudflare&logoColor=white" alt="D1 Database">
  <img src="https://img.shields.io/badge/KV-Storage-F4811F?logo=cloudflare&logoColor=white" alt="KV Storage">
  <img src="https://img.shields.io/badge/链数-20+-10B981" alt="20+ Chains">
  <img src="https://img.shields.io/badge/协议-USDT%20|%20USDT0-22D3EE" alt="USDT">
  <img src="https://img.shields.io/badge/许可证-MIT-blue" alt="License">
</p>

<h1 align="center">夏雨全链矩阵 · USDT 收款监控系统</h1>

<p align="center">
  基于 Cloudflare Workers 边缘网络构建的全链 USDT 收款监控矩阵。<br>
  覆盖 20+ 主流公链，按需唤醒扫块，秒级触发回调，为发卡网/商户系统提供企业级收款能力。<br>
  内置 BEpusdt 兼容网关，支持独角数卡、彩虹易支付等主流发卡系统一键对接。
</p>

---

## 📖 目录

- [核心特性](#-核心特性)
- [系统架构](#-系统架构)
- [部署指南](#-部署指南)
  - [方式一：浏览器界面部署](#方式一浏览器界面部署推荐新手)
  - [方式二：命令行部署](#方式二命令行部署推荐有经验者)
- [后台设置详解](#-后台设置详解)
  - [基础配置](#1-基础配置)
  - [收款地址](#2-收款地址)
  - [网络节点](#3-网络节点)
  - [回调路由](#4-回调路由)
  - [数据导入导出](#5-数据导入导出)
- [对接发卡网](#-对接发卡网)
  - [默认回调格式](#默认回调格式)
  - [BEpusdt 回调格式](#bepusdt-回调格式)
  - [支持的发卡系统](#支持的发卡系统)
  - [独角数卡对接教程](#独角数卡dujiao-next对接教程)
  - [彩虹易支付对接教程](#彩虹易支付对接教程)
- [API 参考](#-api-参考)
- [常见问题](#-常见问题)

---

## ✨ 核心特性

| 特性 | 说明 |
|------|------|
| **20+ 公链覆盖** | TRON、ETH、BSC、Solana、TON、Aptos、Arbitrum、Optimism、Polygon、Base、Avalanche、Berachain、Monad 等 |
| **按需唤醒 (JIT)** | 发卡网下单时才启动扫块，平时 0 消耗，不浪费 RPC 额度 |
| **即时触发** | 调用 `/api/watch` 后立即启动后台扫块，无需等待定时器 |
| **多发卡网并行** | 支持 N 个发卡网共用同一套收款地址，到账后广播通知所有回调节点 |
| **双回调格式** | 支持「默认格式」和「BEpusdt」两种回调协议，适配所有发卡系统 |
| **独立密钥签名** | 每个回调路由独立 APP_SECRET，SHA-256 / MD5 签名防篡改 |
| **边缘安全架构** | 基于 Cloudflare Workers，天然抗 DDoS，全球边缘节点低延迟 |
| **零代码扩容** | 新增 EVM 兼容链只需在后台填入 RPC 和合约地址 |
| **智能网络识别** | 粘贴 `T` 开头自动识别波场，`0x` 开头自动并发所有 EVM 链 |
| **数据导入导出** | 回调路由、收款地址、网络节点均支持 TXT 格式批量导入导出 |

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                     发卡网 / 商户系统                         │
│                                                             │
│  ① 用户下单 → POST /api/watch (登记订单)                     │
│     或 POST /api/v1/order/create-order (BEpusdt)            │
│  ④ 收到回调 → 验签 → 发货/充值                               │
└─────────────┬──────────────────────────────▲────────────────┘
              │                              │
              ▼                              │
┌─────────────────────────────────────────────────────────────┐
│              Cloudflare Workers 边缘节点                      │
│                                                             │
│  ② 即时扫块引擎启动                                          │
│     ├── EVM 链: eth_getLogs (Transfer 事件)                  │
│     ├── Tron: TronGrid API 轮询 TRC20 转账                   │
│     ├── Solana: getTokenAccounts                             │
│     ├── TON: TonCenter API                                   │
│     └── Aptos: REST API events                               │
│                                                             │
│  ③ 检测到入账 → 写入 D1 → 遍历 Webhooks 广播回调             │
│     ├── 默认格式: SHA-256 签名                                │
│     └── BEpusdt: MD5 签名                                    │
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
│  • sys_state         │
└──────────────────────┘
```

**工作流程：**

1. 用户在发卡网下单 → 发卡网调用 `POST /api/watch` 登记（地址 + 金额 + 订单号）
2. 系统立即启动后台扫块循环（持续 N 分钟，每 M 秒扫一次）
3. 扫到匹配金额入账 → 写入 `orders` 表 → 遍历所有匹配的 webhook 广播回调
4. 发卡网收到回调 → 验签 → 执行发货/充值逻辑

---

## 🚀 部署指南

### 前置准备

- 一个 Cloudflare 账号（免费注册）
- 本仓库代码（`worker.js` + `public/` 文件夹）

---

### 方式一：浏览器界面部署（推荐新手）

> 全程在 Cloudflare 网页后台操作，不需要安装任何软件。

#### 第 1 步：注册 Cloudflare 账号

访问 [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) 注册免费账号。

#### 第 2 步：创建 KV 命名空间

KV 用于存储系统配置（账号密码、网络节点、扫块参数等）。

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 左侧菜单 → **Workers 和 Pages** → **KV**
3. 点击右上角 **创建命名空间**
4. 名称填写 `kv`，点击 **添加**
5. ✅ 创建成功后，**复制命名空间 ID** 保存好

```
命名空间 ID 示例：6af7f7a56e9341edb03883c67e01781c
```

#### 第 3 步：创建 D1 数据库

D1 用于存储交易流水、回调路由、收款地址等业务数据。

1. 左侧菜单 → **Workers 和 Pages** → **D1**
2. 点击右上角 **创建数据库**
3. 数据库名称填写 `xy-usdt`，位置选择「自动」
4. 点击 **创建**
5. ✅ 创建成功后，**复制数据库 ID** 保存好

```
数据库 ID 示例：be97c23d-c895-4596-a876-b9b84c79bdd1
```

#### 第 4 步：初始化数据库表结构

1. 点击刚创建的 `xy-usdt` 数据库进入详情页
2. 点击上方的 **控制台** 标签页
3. 在 SQL 输入框中，**一次性粘贴以下全部建表语句**，点击 **执行**：

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

CREATE TABLE IF NOT EXISTS webhooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT NOT NULL,
    binds TEXT DEFAULT '*',
    callback_type TEXT DEFAULT 'default',
    icon TEXT,
    remark TEXT,
    enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    icon TEXT,
    remark TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sys_state (
    key_name TEXT PRIMARY KEY,
    key_value TEXT
);

CREATE TABLE IF NOT EXISTS active_watches (
    order_id TEXT PRIMARY KEY,
    address TEXT NOT NULL,
    network TEXT NOT NULL,
    expected_amount TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

> 💡 看到 `Success` 即表示建表成功。系统首次请求时也会自动建表，但建议手动执行一次。

#### 第 5 步：创建 Worker

1. 左侧菜单 → **Workers 和 Pages** → **创建应用程序**
2. 选择 **Worker** → 点击 **创建 Worker**
3. 名称填写 `xy-usdt`（或自定义），点击 **部署**
4. 部署完成后会显示默认域名，如 `https://xy-usdt.xxx.workers.dev`
5. ⚠️ 记住这个域名

#### 第 6 步：上传代码

1. 进入 Worker 详情页 → 点击 **编辑代码**
2. 在在线编辑器中：
   - 左侧文件树找到 `worker.js` → **全选删除** → 粘贴本仓库 `worker.js` 的全部内容
   - 左侧文件树右键 `public` 文件夹 → 新建文件 `admin.html` → 粘贴本仓库 `public/admin.html` 的全部内容
   - 在 `public` 下新建 `files` 文件夹 → 上传本仓库 `public/files/` 下的所有 `.webp` 图片
3. 点击右上角 **保存并部署**

> ⚠️ 如果在线编辑器不方便上传图片，可以跳过图片上传。图片仅用于后台界面的网络图标显示，不影响核心功能。

#### 第 7 步：绑定数据库和存储

**这是最关键的一步！** 不绑定变量，系统无法运行。

1. 进入 Worker 详情页 → **设置** → **变量和机密**
2. 点击 **添加**，类型选择 **D1 数据库绑定**：
   - 变量名称：`db`（小写）
   - D1 数据库：选择 `xy-usdt`
   - 保存
3. 再次点击 **添加**，类型选择 **KV 命名空间绑定**：
   - 变量名称：`kv`（小写）
   - KV 命名空间：选择 `kv`
   - 保存

> ⚠️ 变量名称必须是小写的 `db` 和 `kv`，与代码中的 `env.db` 和 `env.kv` 对应。

#### 第 8 步：配置 Cron 触发器

Cron 触发器是扫块引擎的备用保底机制。

1. Worker 设置页 → **触发事件** → **Cron 触发器**
2. 点击 **添加 Cron 触发器**
3. 表达式填写：`* * * * *`（每分钟执行一次）
4. 保存

#### 第 9 步：配置静态资源绑定

1. Worker 设置页 → **绑定** → **添加**
2. 类型选择 **Assets**
3. 变量名称填 `assets`
4. 保存

#### 第 10 步：访问后台

1. 浏览器访问 `https://你的Worker域名.workers.dev`
2. 使用默认账号登录：
   - **账号：** `admin`
   - **密码：** `123456`
3. ✅ **请立即进入「基础配置」修改默认密码！**

#### 第 11 步：绑定自定义域名（可选）

1. Worker 设置页 → **触发事件** → **路由** → **添加自定义域名**
2. 输入你的域名（需已在 Cloudflare 托管 DNS）
3. Cloudflare 自动配置 DNS 和 SSL

#### 后续更新

1. 进入 Worker → **编辑代码**
2. 替换 `worker.js` 内容
3. 点击 **保存并部署**

---

### 方式二：命令行部署（推荐有经验者）

#### 前置条件

- [Node.js](https://nodejs.org/) >= 18
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- Cloudflare 账号

#### 第 1 步：克隆仓库

```bash
git clone https://github.com/xyusdt/xy-usdt.git
cd xy-usdt
```

#### 第 2 步：安装并登录 Wrangler

```bash
npm install -g wrangler
wrangler login
```

#### 第 3 步：创建 D1 数据库

```bash
wrangler d1 create xy-usdt
```

输出示例：

```
✅ Successfully created DB 'xy-usdt'
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

> 📌 复制 `database_id`。

#### 第 4 步：创建 KV 命名空间

```bash
wrangler kv namespace create kv
```

输出示例：

```
{ binding = "kv", id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
```

> 📌 复制 `id`。

#### 第 5 步：配置 wrangler.toml

打开 `wrangler.toml`，填入上面获取的 ID：

```toml
name = "xy-usdt"
main = "worker.js"
compatibility_date = "2026-05-20"

[triggers]
crons = ["* * * * *"]

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

#### 第 6 步：初始化数据库

```bash
wrangler d1 execute xy-usdt --file=./schema.sql
```

#### 第 7 步：部署

```bash
wrangler deploy
```

输出示例：

```
Published xy-usdt (x.xx sec)
  https://xy-usdt.你的子域.workers.dev
```

#### 第 8 步：绑定自定义域名（可选）

```bash
wrangler routes add "your-domain.com/*" xy-usdt
```

或在 Cloudflare Dashboard → Workers → 设置 → 触发事件 → 添加自定义域名。

---

## ⚙️ 后台设置详解

### 首次登录

```
默认账号：admin
默认密码：123456
```

> ⚠️ **登录后第一件事：进入「基础配置」修改密码！**

---

### 1. 基础配置

进入 **基础配置** 页面：

| 设置项 | 说明 | 建议值 |
|--------|------|--------|
| 登录账号 | 后台登录用户名 | 改为你自己的 |
| 登录密码 | 后台登录密码 | 改为强密码 |
| 登录页验证码 | 是否启用验证码 | 开启（安全） |
| 扫块持续时长 | 订单登记后持续扫块的分钟数 | `5` 分钟 |
| 扫块间隔 | 每次扫块之间的等待秒数 | `15` ~ `30` 秒 |
| 扫块间隔模式 | 固定间隔或随机间隔 | `随机`（防 RPC 限流） |

**扫块参数说明：**
- **持续时长**：用户下单后系统持续扫块的时间。超时后自动停止，不浪费资源。建议 3~10 分钟。
- **扫块间隔**：每次查链的间隔。太频繁可能被公共 RPC 限流，太慢会延迟到账通知。建议 15~60 秒。
- **随机模式**：每次间隔在设定值的 50%~150% 之间波动，有效降低被限流概率。

---

### 2. 收款地址

进入 **收款地址** 页面，点击 **+ 增加地址**：

| 字段 | 说明 | 示例 |
|------|------|------|
| 指定扫描网络 | 扫描策略 | `智能自动识别`（默认，推荐） |
| 图标链接 | 钱包图标 URL（选填） | `https://example.com/wallet.webp` |
| 网络/名称 | 自定义钱包标识 | `波场主钱包` |
| 钱包地址 | 链上收款地址 | `Txxxxx...` 或 `0xxxx...` |
| 备注 | 内部备注（选填） | `业务A专用` |

**智能网络识别规则：**

| 地址格式 | 自动识别 | 行为 |
|----------|----------|------|
| `T` 开头 | 波场 (TRON) | 仅扫描 TRON 链 |
| `0x` 开头，42位 | 所有 EVM 链 | 并发扫描 ETH、BSC、Polygon、Arbitrum 等所有 EVM 链 |
| 手动指定 | 指定的单链 | 仅扫描该链，节省 RPC |

> 💡 **同一地址可以添加多次**（绑定不同网络），系统会按绑定关系精准扫描。

---

### 3. 网络节点

进入 **网络节点** 页面，查看/编辑已接入的区块链网络。

系统预置了 20+ 常用网络。点击 **+ 新增网络** 可添加自定义链：

| 字段 | 说明 | 示例 |
|------|------|------|
| 标识 | 网络唯一主键（建议全大写） | `BSC` |
| 架构 | 底层引擎类型 | `evm` / `tron` / `solana` / `ton` / `aptos` |
| RPC 节点 | 链上数据 API 地址 | `https://bsc-dataseed.binance.org` |
| USDT 合约 | 代币合约地址 | `0x55d398326f99059...` |
| 精度 | 小数位数 | `6` 或 `18` 或 `9` |
| 标识底色 | 前端显示颜色 | `#f59e0b` |

**常用公链 USDT 参数速查表：**

| 网络 | 标识 | 架构 | 精度 | RPC | USDT 合约 |
|------|------|------|------|-----|-----------|
| Tron (TRC20) | `TRON` | tron | 6 | (内置) | `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t` |
| Ethereum (ERC20) | `ETH` | evm | 6 | `https://cloudflare-eth.com` | `0xdac17f958d2ee523a2206206994597c13d831ec7` |
| BSC (BEP20) | `BSC` | evm | 18 | `https://bsc-dataseed.binance.org` | `0x55d398326f99059ff775485246999027b3197955` |
| Polygon | `POLYGON` | evm | 6 | `https://polygon-rpc.com` | `0xc2132d05d31c914a87c6611c10748aeb04b58e8f` |
| Arbitrum | `ARBITRUM` | evm | 6 | `https://arb1.arbitrum.io/rpc` | `0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9` |
| Optimism | `OPTIMISM` | evm | 6 | `https://mainnet.optimism.io` | `0x94b008aa00579c1307b0ef2c499ad98a8ce58e58` |
| Base | `BASE` | evm | 6 | `https://mainnet.base.org` | `0x833589fcd6edb6e08f4c7c32d4f71b54bda02913` |
| Avalanche | `AVALANCHE` | evm | 6 | `https://api.avax.network/ext/bc/C/rpc` | `0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7` |
| X Layer | `XLAYER` | evm | 6 | `https://rpc.xlayer.tech` | `0x1e4a5963abfd975d8c9021ce480b42188849d41d` |
| OKT Chain | `OKT` | evm | 18 | `https://exchainrpc.okex.org` | `0x382bb369d343125bfb2117af9c149795c6c65c50` |
| Solana | `SOLANA` | solana | 6 | `https://api.mainnet-beta.solana.com` | (引擎内置) |
| TON | `TON` | ton | 9 | `https://toncenter.com/api/v2/jsonRPC` | (引擎内置) |
| Aptos | `APTOS` | aptos | 6 | `https://fullnode.mainnet.aptoslabs.com/v1` | (引擎内置) |

---

### 4. 回调路由

进入 **回调路由** 页面，点击 **+ 增加回调节点**：

| 字段 | 说明 | 示例 |
|------|------|------|
| 图标链接 | 节点图标 URL（选填） | `https://example.com/icon.webp` |
| 节点名称 | 发卡网标识 | `官方发卡网` |
| CALLBACK_URL | 发卡网回调接收地址 | `https://发卡网域名/api/notify/usdt` |
| APP_SECRET | 通讯密钥（双方约定） | `my_secret_key_123` |
| **回调类型** | **回调协议格式** | **`默认格式`** 或 **`BEpusdt`** |
| 绑定号池 | 接收哪些地址的通知 | `*`（全部）或指定地址 |
| 备注 | 内部备注（选填） | `业务A发卡网` |

**回调类型选择指南：**

| 回调类型 | 适用场景 | 签名方式 |
|----------|----------|----------|
| **默认格式** | 自建发卡系统、通用接口 | SHA-256 |
| **BEpusdt** | 独角数卡、彩虹易支付、WHMCS 等支持 BEpusdt 协议的系统 | MD5 |

> 💡 如果你不确定选哪个，先选「默认格式」。如果对接的发卡系统支持 BEpusdt，就选「BEpusdt」。

**绑定号池格式：**
- `*` — 接收所有地址的所有网络回调
- `Txxxxx` — 仅接收该地址的通知
- `Txxxxx@@TRONTRC20` — 仅接收该地址在 TRON 网络的通知
- `Txxxxx@@TRONTRC20,0xYYYY@@BSC` — 多个地址用逗号分隔

---

### 5. 数据导入导出

三个管理页面（回调路由、收款地址、网络节点）都支持：

- **📥 导出** — 将当前数据导出为 TXT 文件（制表符分隔，兼容 Excel）
- **📤 导入** — 弹窗支持**批量粘贴**或**选择 TXT 文件**导入

**导出格式（TXT，每行一条，Tab 分隔）：**

```
回调路由：名称\tURL\t密钥\t回调类型\t绑定号池\t图标\t备注
收款地址：绑定网络\t名称\t地址\t图标\t备注
网络节点：标识\t内核\tRPC\t合约\t精度\t颜色\t名称
```

**导入示例（回调路由）：**

```
我的发卡网	https://shop.com/callback	my_secret	default	*		主站
BEpusdt发卡	https://shop2.com/callback	my_token	bepusdt	*		BEpusdt站
```

> 💡 空字段保留制表符占位，确保列对齐。每行末尾不需要制表符。

---

## 🔌 对接发卡网

### 支持两种回调格式

本系统支持两种回调格式，根据你的发卡系统选择：

---

### 默认格式

适用于自建发卡系统或通用接口。

**回调报文（POST JSON）：**

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

**签名规则：**

```
签名原文 = network + tx_hash + amount + APP_SECRET
签名结果 = SHA-256(签名原文)
```

**PHP 验签示例：**

```php
<?php
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

$appSecret = '你的APP_SECRET';
$stringToSign = $data['network'] . $data['tx_hash'] . $data['amount'] . $appSecret;
$calculated = hash('sha256', $stringToSign);

if ($calculated !== $data['sign']) {
    http_response_code(403);
    die(json_encode(['code' => 403, 'msg' => '签名验证失败']));
}

// 验签通过，执行发货逻辑
echo json_encode(['code' => 200, 'msg' => 'SUCCESS']);
```

**Node.js 验签：**

```js
const crypto = require('crypto');
const stringToSign = network + txHash + amount + appSecret;
const calculated = crypto.createHash('sha256').update(stringToSign).digest('hex');
if (calculated !== sign) { /* 签名非法 */ }
```

**Python 验签：**

```python
import hashlib
string_to_sign = network + tx_hash + amount + app_secret
calculated = hashlib.sha256(string_to_sign.encode()).hexdigest()
if calculated != sign:
    # 签名非法
    pass
```

---

### BEpusdt 回调格式

适用于支持 BEpusdt/Epusdt 协议的发卡系统（独角数卡、彩虹易支付、WHMCS 等）。

**回调报文（POST JSON）：**

```json
{
  "trade_id": "XYT1723094400000a8b3c",
  "order_id": "ORDER_20260808_001",
  "amount": 100.50,
  "actual_amount": 100.50,
  "token": "Tf863NSHNMmEHpVSahZCFcP2X89gg888",
  "block_transaction_id": "abc123def456...",
  "status": 2,
  "signature": "md5签名字符串"
}
```

| 字段 | 说明 |
|------|------|
| `trade_id` | 系统生成的唯一交易号 |
| `order_id` | 发卡网传入的商户订单号 |
| `amount` | 支付金额 |
| `actual_amount` | 实际到账金额 |
| `token` | 收款钱包地址 |
| `block_transaction_id` | 链上交易哈希 |
| `status` | 状态（2 = 支付成功） |
| `signature` | MD5 签名 |

**签名规则（BEpusdt 标准）：**

1. 将所有参数（除 `signature`）按 key 的 ASCII 码排序
2. 拼接为 `key1=value1&key2=value2` 格式
3. 末尾追加 APP_SECRET（无 `&` 符号）
4. 对整个字符串做 MD5，结果转小写

```
签名原文示例：
actual_amount=100.50&amount=100.50&block_transaction_id=abc123&order_id=ORDER_001&status=2&token=Txxx&trade_id=XYTxxxmy_secret_key

签名结果 = MD5(上述原文)
```

---

### 支持的发卡系统

| 发卡系统 | 回调类型 | 对接方式 |
|----------|----------|----------|
| **独角数卡** (Dujiao-Next) | `BEpusdt` | 原生支持，选择 BEpusdt 渠道即可 |
| **彩虹易支付** | `BEpusdt` | 官方插件对接 |
| **WHMCS** | `BEpusdt` | 官方网关插件 |
| **异次元发卡** (ACG-FAKA) | `BEpusdt` | 通过易支付间接对接 |
| **萌次元** | `BEpusdt` | 通过易支付间接对接 |
| **XYFK** (夏雨发卡) | `默认格式` | 自定义回调接口 |
| **其他支持 Epusdt 的系统** | `BEpusdt` | BEpusdt 完全兼容 Epusdt 插件 |
| **自建发卡系统** | `默认格式` | 按本文档的签名规则实现验签 |

---

### 独角数卡(Dujiao-Next)对接教程

#### 第一步：本系统后台配置

1. 进入 **收款地址** → 添加你的 USDT 收款地址
2. 进入 **回调路由** → **+ 增加回调节点**：

| 字段 | 填写内容 |
|------|----------|
| 节点名称 | `独角数卡` |
| CALLBACK_URL | `https://你的独角数卡域名/api/v1/payments/callback` |
| APP_SECRET | 自定义密钥，如 `my_dujiao_secret` |
| **回调类型** | **选择 `BEpusdt`** |
| 绑定号池 | `*`（或指定收款地址） |

#### 第二步：独角数卡后台配置

1. 进入独角数卡后台 → **支付管理** → **支付渠道** → **新建渠道**

| 字段 | 填写内容 |
|------|----------|
| 渠道名称 | `USDT收款` |
| 渠道类型 | **BEpusdt** |
| 网关地址 | `https://你的Workers域名` |
| API Token | **`my_dujiao_secret`**（必须与本系统 APP_SECRET 一致） |
| 交易类型 | `usdt.trc20` |
| 通知地址 | `https://你的独角数卡域名/api/v1/payments/callback` |
| 回跳地址 | `https://你的独角数卡域名` |
| 交互模式 | **跳转（redirect）** |

2. 保存并启用该渠道

#### 第三步：测试

1. 在独角数卡前台选一个商品下单
2. 选择 USDT 支付 → 自动跳转到本系统的支付页面
3. 用钱包扫码转账
4. 等待 15 秒 ~ 2 分钟，独角数卡订单自动变为「已支付」

> ⚠️ **密钥一致性**：本系统 APP_SECRET 和独角数卡 API Token 必须完全一致，否则验签失败。

---

### 彩虹易支付对接教程

#### 第一步：安装 BEpusdt 插件

1. 下载 [Epay-BEpusdt 插件](https://github.com/v03413/Epay-BEpusdt)
2. 解压得到 `usdt` 文件夹
3. 上传到彩虹易支付网站的 `plugins` 目录
4. 登录易支付后台 → **插件管理** → 启用 USDT 插件

#### 第二步：配置支付渠道

1. 进入易支付后台 → **支付接口** → **USDT/BEPusdt**
2. 填写配置：

| 字段 | 填写内容 |
|------|----------|
| 商户ID | 随意填写 |
| 网关地址 | `https://你的Workers域名` |
| 密钥 | **必须与本系统回调路由的 APP_SECRET 一致** |
| 交易类型 | `usdt.trc20` |

#### 第三步：本系统后台配置

1. 进入 **回调路由** → **+ 增加回调节点**：

| 字段 | 填写内容 |
|------|----------|
| 节点名称 | `彩虹易支付` |
| CALLBACK_URL | `https://你的易支付域名/notify/bepusdt` |
| APP_SECRET | 与易支付后台密钥一致 |
| **回调类型** | **选择 `BEpusdt`** |
| 绑定号池 | `*` |

---

## 📡 API 参考

### 认证方式

| 接口 | 认证方式 | 说明 |
|------|----------|------|
| `POST /api/watch` | `Authorization: Bearer <APP_SECRET>` | 发卡网登记订单 |
| `POST /api/v1/order/create-order` | 签名验证 (BEpusdt) | BEpusdt 兼容下单 |
| `GET /api/orders` | Cookie Token | 查看流水（需登录） |
| `POST /api/webhooks` | Cookie Token | 管理回调路由（需登录） |
| `POST /api/addresses` | Cookie Token | 管理收款地址（需登录） |
| `POST /api/networks` | Cookie Token | 管理网络节点（需登录） |
| `GET/POST /api/settings` | Cookie Token | 系统设置（需登录） |
| `GET/POST /api/scan-config` | Cookie Token | 扫块配置（需登录） |

### 登记订单（默认方式）

```
POST /api/watch
Authorization: Bearer <APP_SECRET>
Content-Type: application/json

{
  "address": "Txxxxx收款地址",
  "network": "TRON",
  "amount": "100.50",
  "order_id": "ORDER_001",
  "scan_duration": 5,      // 可选，分钟
  "scan_interval": 30,     // 可选，秒
  "scan_mode": "random"    // 可选，fixed/random
}
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

### 创建订单（BEpusdt 兼容）

```
POST /api/v1/order/create-order
Content-Type: application/json

{
  "order_id": "ORDER_001",
  "amount": "100.50",
  "notify_url": "https://发卡网/api/v1/payments/callback",
  "signature": "md5签名"
}
```

**响应：**

```json
{
  "status_code": 200,
  "message": "success",
  "data": {
    "trade_id": "XYT...",
    "order_id": "ORDER_001",
    "amount": "100.50",
    "expiration_time": 1800,
    "payment_url": "https://你的域名/pay?trade_id=..."
  }
}
```

### 管理接口

```
# 流水
GET    /api/orders                          获取最近 100 条
DELETE /api/orders?tx_hash=xx&network=xx    删除单条
DELETE /api/orders                          批量删除 { items: [...] }

# 回调路由
GET    /api/webhooks                        获取全部
POST   /api/webhooks                        新增
PUT    /api/webhooks?id=xx                  更新
PUT    /api/webhooks?id=xx&status=1         启用/禁用
DELETE /api/webhooks?id=xx                  删除

# 收款地址
GET    /api/addresses                       获取全部
POST   /api/addresses                       新增
PUT    /api/addresses                       更新
DELETE /api/addresses?id=xx                 删除

# 网络节点
GET    /api/networks                        获取全部
POST   /api/networks                        更新全量

# 扫块配置
GET    /api/scan-config                     获取
POST   /api/scan-config                     保存

# 手动同步
POST   /api/sync                            触发全链扫描
```

---

## ❓ 常见问题

### 部署相关

**Q: 部署报错 `KV namespace not found`？**

A: `wrangler.toml` 中的 KV namespace ID 不正确。在 Cloudflare Dashboard → KV 中复制正确的 ID，填入 `wrangler.toml`。

**Q: 部署后访问 500 错误？**

A: 检查是否正确绑定了 D1 和 KV 变量。变量名称必须是小写的 `db` 和 `kv`。

**Q: 如何更新代码？**

A: 命令行：`git pull && wrangler deploy`。浏览器：进入 Worker → 编辑代码 → 替换 `worker.js` → 保存并部署。

### 扫块相关

**Q: 部署后无法自动扫块？**

A: 确认 Cron 触发器已配置：Workers → 设置 → 触发器 → Cron 表达式：`* * * * *`。同时确认回调路由中有已启用的记录。

**Q: 扫块会不会被 RPC 限流？**

A: 系统默认使用「随机间隔」模式，有效降低限流概率。建议使用私有 RPC 节点。按需唤醒架构下，平时不扫块，只有下单时才触发。

**Q: 如何添加新的 EVM 兼容链？**

A: 在「网络节点」页面点击 **+ 新增网络**，填入标识、架构(`evm`)、RPC、USDT 合约、精度即可。

### 回调相关

**Q: 多个发卡网用同一个钱包怎么配置？**

A: 在「回调路由」中为每个发卡网各添加一条记录，绑定号池填 `*`。到账后系统会广播通知所有匹配的路由。

**Q: 如何避免多发卡网串单？**

A: 发卡网生成订单时使用**带随机小数的金额**（如 100.37、100.82），降低碰撞概率。或不同发卡网绑定不同收款地址。

**Q: 回调后发卡网订单没有变「已支付」？**

A: 排查顺序：
1. 确认 APP_SECRET 与发卡网密钥完全一致（无多余空格）
2. 确认回调类型选择正确（BEpusdt 系统选 BEpusdt）
3. 确认 CALLBACK_URL 填写正确
4. 在发卡网后台查看是否有回调到达记录

### 额度相关

**Q: Cloudflare 免费额度够用吗？**

| 资源 | 免费额度 | 说明 |
|------|----------|------|
| Workers 请求 | 100,000 次/天 | 正常使用足够 |
| D1 数据库 | 100,000 行读/天, 50,000 行写/天 | 流水定期清理 |
| KV 读取 | 100,000 次/天 | 内存缓存已优化 |
| KV 写入 | 1,000 次/天 | 高频数据已改用 D1 |

> 💡 系统已内置内存缓存 + D1 降维方案，KV 写入压力极低。

---

## 📄 许可证

MIT License

---

<p align="center">
  <sub>夏雨全链矩阵 · Powered by Cloudflare Workers</sub>
</p>
