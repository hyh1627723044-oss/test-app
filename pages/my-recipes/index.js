Page({
  data: {
    recipes: [],
    loading: false
  },

  onLoad() {
    this.loadRecipes()
  },

  onShow() {
    this.loadRecipes()
  },

  onPullDownRefresh() {
    this.loadRecipes(() => wx.stopPullDownRefresh())
  },

  onShareAppMessage() {
    return {
      title: '我的菜谱',
      path: '/pages/my-recipes/index'
    }
  },

  loadRecipes(done) {
    if (!wx.cloud) {
      this.finishLoading(done)
      return
    }
    this.setData({ loading: true })
    wx.cloud.callFunction({
      name: 'listRecipes',
      data: { only_mine: true, limit: 50 },
      success: (res) => {
        const recipes = res.result && res.result.recipes
        if (!Array.isArray(recipes)) return
        this.setData({
          recipes: recipes.map((item, index) => ({
            ...item,
            id: item._id || item.id,
            tags: Array.isArray(item.tags) ? item.tags : [],
            cover_letter: this.getCoverLetter(item.title),
            tape_color: index % 2 === 0 ? 'yellow' : 'green',
            decor_type: index % 2 === 0 ? 'flower' : 'leaf'
          }))
        })
      },
      fail: () => {
        wx.showToast({ title: '加载菜谱失败', icon: 'none' })
      },
      complete: () => this.finishLoading(done)
    })
  },

  finishLoading(done) {
    this.setData({ loading: false })
    if (typeof done === 'function') done()
  },

  onAddRecipe() {
    wx.navigateTo({ url: '/pages/recipe-edit/index' })
  },

  onViewRecipe(e) {
    const { id } = e.currentTarget.dataset
    if (id) wx.navigateTo({ url: '/pages/recipe-detail/index?id=' + id })
  },

  onEditRecipe(e) {
    const { id } = e.currentTarget.dataset
    if (id) wx.navigateTo({ url: '/pages/recipe-edit/index?id=' + id })
  },

  onDeleteRecipe(e) {
    const { id } = e.currentTarget.dataset
    if (!id || !wx.cloud) return
    wx.showModal({
      title: '删除菜谱',
      content: '删除后不会再显示在公共菜单中，封面图片也会清理。',
      success: (modalResult) => {
        if (!modalResult.confirm) return
        wx.showLoading({ title: '删除中' })
        wx.cloud.callFunction({
          name: 'deleteRecipe',
          data: { recipe_id: id },
          success: (res) => {
            wx.hideLoading()
            if (res.result && res.result.ok === false) {
              wx.showToast({ title: '没有删除权限', icon: 'none' })
              return
            }
            wx.showToast({ title: '已删除', icon: 'success' })
            this.loadRecipes()
          },
          fail: () => {
            wx.hideLoading()
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        })
      }
    })
  },

  getCoverLetter(title) {
    const text = String(title || '').trim()
    return text ? text.slice(0, 1) : '菜'
  }
})
