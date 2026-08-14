// 小程序入口
// 架构说明：本小程序本身不做排盘计算，所有测算逻辑复用现有 Node 后端（server.js + /api/*）。
// 只需把 apiBase 指向运行中的后端地址即可。
App({
  globalData: {
    // 后端 API 基地址（默认本地开发；可在「服务设置」页修改并持久化到本地存储）：
    //  - 本地/局域网开发：填 http://<你的电脑局域网IP>:3000，并在开发者工具勾选"不校验合法域名"
    //  - 正式发布：必须填 https 域名，并在小程序后台「开发管理-服务器域名-request合法域名」中加入该域名
    apiBase: 'http://localhost:3000',
    clientId: ''
  },

  onLaunch() {
    // 若用户在「服务设置」中配置过后端地址，则优先使用
    const savedBase = wx.getStorageSync('apiBase');
    if (savedBase) this.globalData.apiBase = savedBase;

    // 生成本机唯一的 clientId（用于后端按用户隔离历史/收藏），首次启动生成并持久化
    let cid = wx.getStorageSync('clientId');
    if (!cid) {
      cid = 'mp-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      wx.setStorageSync('clientId', cid);
    }
    this.globalData.clientId = cid;
  }
});
