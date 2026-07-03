Page({
  data: {
    recipeId: '',
    selectedDate: '',
    selectedSlot: 'lunch',
    recipe: {
      id: 'recipe_tomato_egg',
      _id: 'recipe_tomato_egg',
      title: '番茄炒蛋',
      description: '十分钟快手家常菜，适合午餐和晚餐。',
      primary_cover_file_id: '',
      cover_images: [],
      tags: ['快手', '家常', '下饭'],
      meal_types: ['lunch', 'dinner'],
      cook_time_minutes: 10,
      difficulty: 'easy',
      servings: 2,
      calories: 320,
      ingredients: [
        { name: '番茄', amount: '2 个' },
        { name: '鸡蛋', amount: '3 个' },
        { name: '盐', amount: '少许' }
      ],
      steps: [
        { order: 1, text: '番茄切块，鸡蛋打散。' },
        { order: 2, text: '先把鸡蛋炒至凝固后盛出。' },
        { order: 3, text: '番茄炒出汁后倒回鸡蛋，调味即可。' }
      ]
    },
    difficultyMap: {
      easy: '简单',
      normal: '普通',
      hard: '进阶'
    },
    mealSlots: [
      { id: 'breakfast', name: '早餐' },
      { id: 'lunch', name: '午餐' },
      { id: 'afternoon_tea', name: '下午茶' },
      { id: 'dinner', name: '晚餐' },
      { id: 'night_snack', name: '夜宵' }
    ]
  },

  onLoad(options) {
    const selectedDate = this.getToday()
    this.setData({
      recipeId: options.id || '',
      selectedDate
    })
    this.loadRecipe(options.id || '')
  },

  onShow() {},

  onShareAppMessage() {
    return {
      title: this.data.recipe.title,
      path: '/pages/recipe-detail/index?id=' + this.data.recipeId
    }
  },

  loadRecipe(id) {
    if (!id || !wx.cloud) return

    wx.cloud.callFunction({
      name: 'getRecipe',
      data: { id },
      success: (res) => {
        if (res.result && res.result.ok && res.result.recipe) {
          this.setData({ recipe: res.result.recipe })
        }
      }
    })
  },

  onChangeDate(e) {
    this.setData({ selectedDate: e.detail.value })
  },

  onChooseSlot(e) {
    const { slot } = e.currentTarget.dataset
    this.setData({ selectedSlot: slot })
  },

  onAddToPlan() {
    if (!wx.cloud) {
      wx.showToast({ title: '云开发未启用', icon: 'none' })
      return
    }

    wx.cloud.callFunction({
      name: 'addMealPlanItem',
      data: {
        recipe_id: this.data.recipe._id || this.data.recipe.id,
        plan_date: this.data.selectedDate,
        meal_slot: this.data.selectedSlot,
        reminder_enabled: true
      },
      success: (res) => {
        if (res.result && res.result.ok === false) {
          wx.showToast({ title: '加入失败', icon: 'none' })
          return
        }
        wx.showToast({
          title: '已加入计划',
          icon: 'success'
        })
      },
      fail: () => {
        wx.showToast({ title: '加入失败', icon: 'none' })
      }
    })
  },

  onFavorite() {
    wx.showToast({ title: '收藏功能待接入', icon: 'none' })
  },

  getToday() {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return year + '-' + month + '-' + day
  }
})
