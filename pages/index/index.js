Page({
  data: {
    activeTab: 'menu',
    tabs: [
      { id: 'menu', label: '点单' },
      { id: 'orders', label: '订单' },
      { id: 'mine', label: '我的' }
    ]
  },

  onLoad() {},

  onShow() {},

  onShareAppMessage() {
    return {
      title: '欢迎点单',
      path: '/pages/index/index'
    }
  },

  onTapTab(e) {
    const { id } = e.currentTarget.dataset
    this.setData({ activeTab: id })
  }
})
