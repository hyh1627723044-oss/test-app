Page({
  data: {
    stats: [
      { label: '??', value: 0 },
      { label: '??', value: 3 },
      { label: '??', value: 0 }
    ],
    drawModes: [
      { id: 'wheel', name: '??' },
      { id: 'gacha', name: '??' }
    ],
    activeDrawMode: 'wheel',
    drawTags: ['??'],
    activeDrawTag: '??',
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
      title: '????',
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
        this.updateStat('??', favorites.length)
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
          this.updateStat('??', normalized.length)
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
    const tagSet = new Set(['??'])
    this.data.drawRecipes.forEach((recipe) => {
      recipe.tags.forEach((tag) => tagSet.add(tag))
    })
    const drawTags = Array.from(tagSet).slice(0, 12)
    const activeDrawTag = drawTags.indexOf(this.data.activeDrawTag) >= 0
      ? this.data.activeDrawTag
      : '??'
    this.setData({ drawTags, activeDrawTag })
  },

  applyDrawFilter() {
    const activeTag = this.data.activeDrawTag
    const drawPool = activeTag === '??'
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
      wx.showToast({ title: '????????', icon: 'none' })
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
      { id: 'breakfast', label: '??' },
      { id: 'lunch', label: '??' },
      { id: 'afternoon_tea', label: '???' },
      { id: 'dinner', label: '??' },
      { id: 'night_snack', label: '??' }
    ]
    wx.showActionSheet({
      itemList: slotOptions.map((item) => item.label),
      success: (res) => {
        const slot = slotOptions[res.tapIndex]
        if (!slot) return
        wx.showLoading({ title: '???' })
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
              wx.showToast({ title: '????', icon: 'none' })
              return
            }
            wx.showToast({ title: '?????', icon: 'success' })
          },
          fail: () => {
            wx.hideLoading()
            wx.showToast({ title: '????', icon: 'none' })
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
