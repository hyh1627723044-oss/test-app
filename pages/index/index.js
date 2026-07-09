Page({
  data: {
    activeTab: 'recipes',
    activeCategory: '全部',
    searchKeyword: '',
    activeQuickTag: '',
    categories: ['全部', '早餐', '午餐', '晚餐', '饮品'],
    quickTags: ['快手', '低脂', '下饭', '家常', '早餐', '饮品'],
    recipes: [
      {
        id: 'recipe_tomato_egg',
        title: '番茄炒蛋',
        description: '十分钟快手家常菜，适合午餐和晚餐。',
        primary_cover_file_id: '',
        cover_images: [],
        cover_letter: '番',
        tags: ['快手', '家常', '下饭'],
        meal_types: ['午餐', '晚餐'],
        cook_time_minutes: 10
      },
      {
        id: 'recipe_oat_milk',
        title: '燕麦牛奶杯',
        description: '早餐友好，简单不费脑。',
        primary_cover_file_id: '',
        cover_images: [],
        cover_letter: '燕',
        tags: ['早餐', '轻食'],
        meal_types: ['早餐'],
        cook_time_minutes: 5
      },
      {
        id: 'recipe_peach_soda',
        title: '桃子气泡水',
        description: '适合下午茶的清爽饮品。',
        primary_cover_file_id: '',
        cover_images: [],
        cover_letter: '桃',
        tags: ['饮品', '下午茶'],
        meal_types: ['下午茶'],
        cook_time_minutes: 3
      }
    ],
    displayRecipes: []
  },

  onLoad() {
    const recipes = this.withRecipeDecorations(this.data.recipes)
    this.setData({ recipes, displayRecipes: recipes })
    this.loadTags()
    this.loadRecipes()
  },

  onShow() {
    this.loadRecipes()
  },

  onShareAppMessage() {
    return {
      title: '今天吃点什么',
      path: '/pages/index/index'
    }
  },

  loadRecipes() {
    if (!wx.cloud) return
    wx.cloud.callFunction({
      name: 'listRecipes',
      data: {
        keyword: this.data.searchKeyword || this.data.activeQuickTag
      },
      success: (res) => {
        const recipes = res.result && res.result.recipes
        if (Array.isArray(recipes) && recipes.length > 0) {
          this.setData({ recipes: this.withRecipeDecorations(recipes) }, () => {
            this.applyFilters()
          })
        }
      }
    })
  },

  loadTags() {
    if (!wx.cloud) return
    wx.cloud.callFunction({
      name: 'listTags',
      success: (res) => {
        if (!res.result || !res.result.ok || !Array.isArray(res.result.tags)) return
        this.setData({ quickTags: res.result.tags.slice(0, 8) })
      }
    })
  },

  onInputSearch(e) {
    this.setData({
      searchKeyword: e.detail.value,
      activeQuickTag: ''
    }, () => {
      this.applyFilters()
    })
  },

  onConfirmSearch() {
    this.loadRecipes()
  },

  onClearSearch() {
    this.setData({
      searchKeyword: '',
      activeQuickTag: ''
    }, () => {
      this.applyFilters()
      this.loadRecipes()
    })
  },

  onTapQuickTag(e) {
    const { tag } = e.currentTarget.dataset
    const activeQuickTag = this.data.activeQuickTag === tag ? '' : tag
    this.setData({
      activeQuickTag,
      searchKeyword: activeQuickTag
    }, () => {
      this.applyFilters()
      this.loadRecipes()
    })
  },

  onTapCategory(e) {
    const { name } = e.currentTarget.dataset
    this.setData({ activeCategory: name }, () => {
      this.applyFilters()
    })
  },

  onTapRecipe(e) {
    const { id } = e.currentTarget.dataset
    if (!id) {
      wx.showToast({ title: '菜谱 ID 缺失', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/recipe-detail/index?id=' + id })
  },

  onTapAddToPlan(e) {
    const { id } = e.currentTarget.dataset
    if (!id) {
      wx.showToast({ title: '菜谱 ID 缺失', icon: 'none' })
      return
    }
    if (!wx.cloud) {
      wx.showToast({ title: '云开发未启用', icon: 'none' })
      return
    }

    const recipe = this.findRecipeById(id)
    const slots = [
      { id: 'breakfast', label: '早餐' },
      { id: 'lunch', label: '午餐' },
      { id: 'afternoon_tea', label: '下午茶' },
      { id: 'dinner', label: '晚餐' },
      { id: 'night_snack', label: '夜宵' }
    ]

    wx.showActionSheet({
      itemList: slots.map((item) => item.label),
      success: (res) => {
        const slot = slots[res.tapIndex]
        if (!slot) return
        wx.showLoading({ title: '加入计划中' })
        wx.cloud.callFunction({
          name: 'addMealPlanItem',
          data: {
            recipe_id: id,
            plan_date: this.getToday(),
            meal_slot: slot.id,
            reminder_enabled: false
          },
          success: (result) => {
            wx.hideLoading()
            if (result.result && result.result.ok === false) {
              console.error('[index] addMealPlanItem returned error', result.result)
              wx.showToast({ title: this.getCloudErrorTitle(result.result, '加入失败'), icon: 'none' })
              return
            }
            wx.showToast({ title: '已加入' + slot.label, icon: 'success' })
          },
          fail: (error) => {
            wx.hideLoading()
            console.error('[index] addMealPlanItem failed', error)
            wx.showToast({ title: '加入失败', icon: 'none' })
          }
        })
      },
      fail: (error) => {
        if (error && error.errMsg && error.errMsg.indexOf('cancel') >= 0) return
        console.error('[index] choose meal slot failed', error, recipe)
      }
    })
  },

  onTapAddRecipe() {
    wx.navigateTo({ url: '/pages/recipe-edit/index' })
  },

  onTapManageTags() {
    if (!wx.cloud) {
      wx.showToast({ title: '云开发未启用', icon: 'none' })
      return
    }
    wx.showModal({
      title: '添加标签',
      editable: true,
      placeholderText: '比如 低卡晚餐',
      success: (res) => {
        const tag = String(res.content || '').trim()
        if (!res.confirm || !tag) return
        wx.cloud.callFunction({
          name: 'upsertTag',
          data: { name: tag },
          success: () => {
            wx.showToast({ title: '已添加', icon: 'success' })
            this.loadTags()
          },
          fail: () => {
            wx.showToast({ title: '添加失败', icon: 'none' })
          }
        })
      }
    })
  },

  onTapTab(e) {
    const { id } = e.currentTarget.dataset
    if (id === 'recipes') {
      this.setData({ activeTab: id })
      return
    }
    if (id === 'plan') {
      wx.redirectTo({ url: '/pages/plan/index' })
      return
    }
    wx.redirectTo({ url: '/pages/my/index' })
  },

  applyFilters() {
    const keyword = this.data.searchKeyword.trim()
    const activeCategory = this.data.activeCategory
    const displayRecipes = this.data.recipes.filter((recipe) => {
      const matchesCategory = activeCategory === '全部'
        || recipe.category === activeCategory
        || (Array.isArray(recipe.meal_types) && recipe.meal_types.indexOf(activeCategory) >= 0)
      if (!matchesCategory) return false
      if (!keyword) return true
      return this.getSearchText(recipe).indexOf(keyword) >= 0
    })
    this.setData({ displayRecipes })
  },

  withRecipeDecorations(recipes) {
    const decorTypes = ['flower', 'leaf', 'star', 'moon']
    const tapeColors = ['yellow', 'green', 'pink']
    return recipes.map((recipe, index) => {
      const id = recipe._id || recipe.id || ''
      const key = id || recipe.title || String(index)
      const charTotal = key.split('').reduce((total, char) => total + char.charCodeAt(0), 0)
      return Object.assign({}, recipe, {
        id,
        cover_letter: String(recipe.title || '').trim().slice(0, 1) || '菜',
        decor_type: decorTypes[charTotal % decorTypes.length],
        tape_color: tapeColors[charTotal % tapeColors.length]
      })
    })
  },

  getSearchText(recipe) {
    const tags = Array.isArray(recipe.tags) ? recipe.tags.join(' ') : ''
    return [
      recipe.title || '',
      recipe.description || '',
      tags
    ].join(' ')
  },

  findRecipeById(id) {
    return this.data.recipes.find((recipe) => recipe.id === id || recipe._id === id) || null
  },

  getToday() {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return year + '-' + month + '-' + day
  },

  getCloudErrorTitle(result, fallback) {
    const codeMap = {
      COLLECTION_NOT_FOUND: '数据库集合未创建',
      DATABASE_ERROR: '数据库写入失败',
      RECIPE_NOT_FOUND: '菜谱不存在',
      RECIPE_FORBIDDEN: '没有操作权限',
      PLAN_DATE_REQUIRED: '请选择日期',
      MEAL_SLOT_REQUIRED: '请选择餐次',
      RECIPE_ID_REQUIRED: '菜谱 ID 缺失'
    }
    return codeMap[result && result.code] || fallback
  }
})
