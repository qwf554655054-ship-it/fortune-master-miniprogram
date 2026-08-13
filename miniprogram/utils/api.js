// 网络请求封装：自动拼接 apiBase、注入 X-Client-Id（后端按此隔离用户历史/收藏）
function request(path, method, body) {
  return new Promise((resolve, reject) => {
    const app = getApp();
    const base = (app && app.globalData.apiBase ? app.globalData.apiBase : '').replace(/\/$/, '');
    const clientId = (app && app.globalData.clientId) || 'anon';
    wx.request({
      url: base + path,
      method: method || 'POST',
      data: body || {},
      header: {
        'Content-Type': 'application/json',
        'X-Client-Id': clientId
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.ok) {
          resolve(res.data.data);
        } else {
          reject(new Error((res.data && res.data.error) || ('请求失败（' + res.statusCode + '）')));
        }
      },
      fail(err) {
        reject(new Error((err && err.errMsg) || '网络错误'));
      }
    });
  });
}

module.exports = { request };
