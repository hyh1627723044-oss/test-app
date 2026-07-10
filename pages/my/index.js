Page({
  data: {
    stats: [
      { label: '菜谱', value: 0 },
      { label: '计划', value: 3 },
      { label: '收藏', value: 0 }
    ],
    drawModes: [
      { id: 'wheel', name: '转盘' },
      { id: 'gacha', name: '扭蛋' }
    ],
    activeDrawMode: 'wheel',
    drawTags: ['全部'],
    activeDrawTag: '全部',
    drawRecipes: [],
    drawPool: [],
    drawResult: null,
    isDrawing: false,
    wheelStyle: '',
    gachaOpen: false
  },

  onLoad() {
    this.loadFavorites()
    this.loadDrawData()
  },

  onShow() {
    this.loadFavorites()
    this.loadDrawData()
  },

  onShareAppMessage() {
    return {
      title: '我的厨房',
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

  onTapAiRecommend() {
    wx.navigateTo({ url: '/pages/ai-recommend/index' })
  },

  onTapMyRecipes() {
    wx.navigateTo({ url: '/pages/my-recipes/index' })
  },

  loadFavorites() {
    if (!wx.cloud) return
    wx.cloud.callFunction({
      name: 'listFavorites',
      success: (res) => {
        const favorites = res.result && res.result.favorites
        if (!Array.isArray(favorites)) return
        this.updateStat('收藏', favorites.length)
      }
    })
  },

  loadDrawData() {
    if (!wx.cloud) return
    wx.cloud.callFunction({
      name: 'listRecipes',
      data: {
        only_mine: true,
        limit: 50
      },
      success: (res) => {
        const recipes = res.result && res.result.recipes
        if (!Array.isArray(recipes)) return
        const normalized = recipes.map((recipe) => ({
          ...recipe,
          id: recipe._id || recipe.id,
          tags: Array.isArray(recipe.tags) ? recipe.tags : [],
          meal_types: Array.isArray(recipe.meal_types) ? recipe.meal_types : []
        }))
        this.setData({ drawRecipes: normalized }, () => {
          this.updateStat('菜谱', normalized.length)
          this.buildDrawTags()
          this.applyDrawFilter()
        })
      }
    })
  },

  updateStat(label, value) {
    const stats = this.data.stats.map((item) => {
      if (item.label !== label) return item
      return { ...item, value }
    })
    this.setData({ stats })
  },

  buildDrawTags() {
    const tagSet = new Set(['全部'])
    this.data.drawRecipes.forEach((recipe) => {
      recipe.tags.forEach((tag) => tagSet.add(tag))
    })
    const drawTags = Array.from(tagSet).slice(0, 12)
    const activeDrawTag = drawTags.indexOf(this.data.activeDrawTag) >= 0
      ? this.data.activeDrawTag
      : '全部'
    this.setData({ drawTags, activeDrawTag })
  },

  applyDrawFilter() {
    const activeTag = this.data.activeDrawTag
    const drawPool = activeTag === '全部'
      ? this.data.drawRecipes
      : this.data.drawRecipes.filter((recipe) => recipe.tags.indexOf(activeTag) >= 0)
    this.setData({ drawPool })
  },

  onChangeDrawMode(e) {
    const { mode } = e.currentTarget.dataset
    this.setData({
      activeDrawMode: mode,
      drawResult: null,
      isDrawing: false,
      gachaOpen: false
    })
  },

  onSelectDrawTag(e) {
    const { tag } = e.currentTarget.dataset
    this.setData({ activeDrawTag: tag, drawResult: null }, () => {
      this.applyDrawFilter()
    })
  },

  onStartDraw() {
    if (this.data.isDrawing) return
    if (this.data.drawPool.length === 0) {
      wx.showToast({ title: '这个标签下还没有菜谱', icon: 'none' })
      return
    }

    const recipe = this.pickRecipe()
    if (this.data.activeDrawMode === 'gacha') {
      this.playGacha(recipe)
      return
    }
    this.playWheel(recipe)
  },

  pickRecipe() {
    const index = Math.floor(Math.random() * this.data.drawPool.length)
    return this.data.drawPool[index]
  },

  playWheel(recipe) {
    const turn = 1440 + Math.floor(Math.random() * 720)
    this.setData({
      isDrawing: true,
      drawResult: null,
      wheelStyle: 'transform: rotate(' + turn + 'deg);'
    })
    setTimeout(() => {
      this.setData({
        isDrawing: false,
        drawResult: recipe
      })
    }, 1200)
  },

  playGacha(recipe) {
    this.setData({
      isDrawing: true,
      drawResult: null,
      gachaOpen: false
    })
    setTimeout(() => {
      this.setData({ gachaOpen: true })
    }, 520)
    setTimeout(() => {
      this.setData({
        isDrawing: false,
        drawResult: recipe
      })
    }, 1050)
  },

  onViewDrawRecipe() {
    const recipe = this.data.drawResult
    if (!recipe || !recipe.id) return
    wx.navigateTo({ url: '/pages/recipe-detail/index?id=' + recipe.id })
  },

  onAddDrawToPlan() {
    const recipe = this.data.drawResult
    if (!recipe || !recipe.id || !wx.cloud) return
    const slotOptions = [
      { id: 'breakfast', label: '早餐' },
      { id: 'lunch', label: '午餐' },
      { id: 'afternoon_tea', label: '下午茶' },
      { id: 'dinner', label: '晚餐' },
      { id: 'night_snack', label: '夜宵' }
    ]
    wx.showActionSheet({
      itemList: slotOptions.map((item) => item.label),
      success: (res) => {
        const slot = slotOptions[res.tapIndex]
        if (!slot) return
        wx.showLoading({ title: '加入中' })
        wx.cloud.callFunction({
          name: 'addMealPlanItem',
          data: {
            recipe_id: recipe.id,
            plan_date: this.getToday(),
            meal_slot: slot.id,
            reminder_enabled: false
          },
          success: (result) => {
            wx.hideLoading()
            if (result.result && result.result.ok === false) {
              wx.showToast({ title: '加入失败', icon: 'none' })
              return
            }
            wx.showToast({ title: '已加入计划', icon: 'success' })
          },
          fail: () => {
            wx.hideLoading()
            wx.showToast({ title: '加入失败', icon: 'none' })
          }
        })
      }
    })
  },

  getToday() {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return year + '-' + month + '-' + day
  }
})
