Page({
  data: {
    stats: [
      { label: '菜谱', value: 0 },
      { label: '计划', value: 3 },
      { label: '收藏', value: 0 }
    ]
  },

  onLoad() {
    this.loadFavorites()
  },

  onShow() {
    this.loadFavorites()
  },

  onShareAppMessage() {
    return {
      title: '我的菜单',
      path: '/pages/my/index'
    }
  },

  onTapTab(e) {
    const { id } = e.currentTarget.dataset
    if (id === 'recipes') {
      wx.redirectTo({ url: '/pages/index/index' })
      return
    }
    if (id === 'plan') {
      wx.redirectTo({ url: '/pages/plan/index' })
    }
  },

  loadFavorites() {
    if (!wx.cloud) return
    wx.cloud.callFunction({
      name: 'listFavorites',
      success: (res) => {
        const favorites = res.result && res.result.favorites
        if (!Array.isArray(favorites)) return
        const stats = this.data.stats.map((item) => {
          if (item.label !== '收藏') return item
          return { ...item, value: favorites.length }
        })
        this.setData({ stats })
      }
    })
  }
})
