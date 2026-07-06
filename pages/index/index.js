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
    this.setData({ displayRecipes: this.data.recipes })
    this.loadRecipes()
  },

  onShow() {},

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
          this.setData({ recipes }, () => {
            this.applyFilters()
          })
        }
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
    wx.navigateTo({ url: '/pages/recipe-detail/index?id=' + id })
  },

  onTapAddToPlan(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: '/pages/recipe-detail/index?id=' + id + '&action=plan' })
  },

  onTapAddRecipe() {
    wx.navigateTo({ url: '/pages/recipe-edit/index' })
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

  getSearchText(recipe) {
    const tags = Array.isArray(recipe.tags) ? recipe.tags.join(' ') : ''
    return [
      recipe.title || '',
      recipe.description || '',
      tags
    ].join(' ')
  }
})
