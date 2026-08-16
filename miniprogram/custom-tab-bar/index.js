// 自定义底部 TabBar：暗色玄学风（金色激活态 + 金线图标）
Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/index/index',     text: '测算', icon: '/assets/tab/calc.svg',     selectedIcon: '/assets/tab/calc-active.svg' },
      { pagePath: '/pages/fortune/fortune', text: '运势', icon: '/assets/tab/fortune.svg',   selectedIcon: '/assets/tab/fortune-active.svg' },
      { pagePath: '/pages/records/records', text: '记录', icon: '/assets/tab/records.svg',   selectedIcon: '/assets/tab/records-active.svg' },
      { pagePath: '/pages/profile/profile', text: '我的', icon: '/assets/tab/profile.svg',   selectedIcon: '/assets/tab/profile-active.svg' }
    ]
  },
  methods: {
    switchTab(e) {
      const path = e.currentTarget.dataset.path;
      wx.switchTab({ url: path });
    }
  }
});
