Page({
  data: {
    stats: [
      { label: '我的菜品', value: 0 },
      { label: '收藏', value: 0 },
      { label: '本周计划', value: 3 }
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
