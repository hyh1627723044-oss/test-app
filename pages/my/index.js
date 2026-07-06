Page({
  data: {
    stats: [
      { label: '菜谱', value: 0 },
      { label: '计划', value: 3 },
      { label: '收藏', value: 0 }
    ]
  },

  onLoad() {},

  onShow() {},

  onShareAppMessage() {
    return {
      title: '我的菜单',
      path: '/pages/my/index'
    }
  },

  onTapMenu() {
    wx.redirectTo({ url: '/pages/index/index' })
  },

  onTapPlan() {
    wx.redirectTo({ url: '/pages/plan/index' })
  }
})
