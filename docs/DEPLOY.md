# 部署与上线指南（命理测算小程序）

本指南面向非技术背景的创始人，按「从易到难」给出三种让产品跑起来的方式。后端是 Node.js 零依赖 `http` 服务（`server.js`），前端分 **Web 版**（`public/`）与 **微信小程序壳**（`miniprogram/`）。

---

## 一、本地运行（0 成本，先验证）

```bash
# 1. 安装依赖（仅 astronomy-engine / lunar-javascript，其余零依赖）
npm install

# 2. 启动后端（默认端口 3000）
node server.js

# 3. 浏览器打开
http://localhost:3000
```

健康自检：`http://localhost:3000/api/health` 应返回 `{"ok":true,...}`。

> 数据（历史/收藏/会员）存在本地 `data/user.json`，已加入 `.gitignore`，**不会进仓库**。

---

## 二、Web 版部署（最快让用户访问）

### 方案 A：容器 / PaaS 托管（推荐，如 CloudStudio、Railway、Render、Fly.io）
1. 把整个仓库（含 `server.js`）推到 git 仓库；
2. 在平台上「新建服务 → 连接仓库 → 启动命令填 `node server.js` → 端口 3000」；
3. 平台会给你一个 HTTPS 公网地址，直接分享即可。

> 本项目后端是 Node 服务，**不是纯静态站点**，需要能跑 Node 的托管（CloudStudio 工作区、Railway、Render 等），不能直接用「纯静态托管」。

### 方案 B：自有服务器（VPS）
1. 服务器装 Node.js；
2. 用 `pm2` 守护进程：`npm install -g pm2 && pm2 start server.js`；
3. 用 Nginx 反代到 80/443，并申请免费 HTTPS 证书（Let's Encrypt）。

### 上线前 Web 端必做
- [ ] 把 `public/app.js` 里的 `apiBase` 改成你的公网 HTTPS 地址（当前默认 `http://localhost:3000`，小程序端在 `miniprogram/app.js` 的 `globalData.apiBase`）。
- [ ] 配置好 HTTPS（小程序强制要求）。

---

## 三、微信小程序发布（需 AppID + 后端 HTTPS）

### 准备
1. 微信公众平台注册小程序，拿到 **AppID**（当前 `miniprogram/project.config.json` 用的是 `touristappid` 占位，需替换）。
2. 后端必须部署在**已备案的 HTTPS 域名**上。
3. 登录小程序后台 →「开发 → 开发设置 → 服务器域名」，**把你的 HTTPS 域名加入 request 合法域名白名单**（并在开发阶段可临时开启「不校验合法域名」）。

### 构建与发布
1. 下载「微信开发者工具」，导入 `miniprogram/` 目录；
2. 修改 `miniprogram/app.js` 的 `globalData.apiBase` 为你的后端 HTTPS 地址；
3. 点「编译」本地预览 → 点「上传」生成体验版/开发版；
4. 先发**体验版**给好友内测；
5. 正式发布前，按 `M7-商业化与上线.md` 的「上线清单」补齐资质与类目。

### 关键约束
- 小程序 **request 域名必须 HTTPS + 已备案**，且需在后台白名单登记；
- 若做付费，iOS 端必须用**苹果内购**，不能走微信支付绕过。

---

## 四、发布检查清单（Launch Checklist）

### 技术与合规
- [ ] 后端已部署并可公网 HTTPS 访问，443 端口正常
- [ ] Web / 小程序 `apiBase` 已指向正确地址
- [ ] 小程序服务器域名白名单已配置 HTTPS 域名
- [ ] 已配置《隐私政策》《用户协议》并公示
- [ ] 已落实娱乐声明 + 未成年人提示（M6 已完成代码层）

### 商业化（接真实支付前）
- [ ] 定价拍板（月/年）
- [ ] 微信支付商户号申请完成（小程序）
- [ ] iOS 内购商品配置完成（若上架 App Store）
- [ ] 把演示态会员（`store.js` 的 `demo`、未接支付）替换为真实下单流程

### 资质（最耗时，尽早启动）
- [ ] 域名 ICP 备案
- [ ] 增值电信业务经营许可证（视平台类目要求，命理/占卜类常被要求）
- [ ] 小程序「算命/占卜/风水」类目审核材料

---

## 五、常见问题
- **Q：能直接把 `public/` 当静态站丢到对象存储/CDN 吗？**
  A：不能，因为前端要调用 `/api/*` 后端。要么后端一起部署（方案 A/B），要么把前端也挂在同一个 Node 服务下（本项目 `server.js` 已同时托管 `public/`，所以部署 Node 服务即可同时拿到前端+API）。
- **Q：没有 HTTPS 域名能测小程序吗？**
  A：开发阶段可在开发者工具勾选「不校验合法域名」临时测；但发布必须 HTTPS 白名单。
- **Q：会员现在能真收费吗？**
  A：不能。当前是本地模拟（`demo:true`）。接真实支付见「商业化」章节与 M7 文档。
