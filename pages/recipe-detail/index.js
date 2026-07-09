Page({
  data: {
    recipeId: '',
    selectedDate: '',
    selectedSlot: 'lunch',
    isFavorited: false,
    canEdit: false,
    coverLetter: '菜',
    recipe: {
      id: '',
      _id: '',
      title: '加载中',
      description: '',
      primary_cover_file_id: '',
      cover_images: [],
      tags: [],
      meal_types: [],
      cook_time_minutes: 0,
      difficulty: 'easy',
      servings: 1,
      calories: 0,
      ingredients: [],
      steps: []
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
          const recipe = this.normalizeRecipe(res.result.recipe)
          this.setData({
            recipe,
            coverLetter: this.getCoverLetter(recipe.title),
            isFavorited: Boolean(res.result.is_favorited),
            canEdit: Boolean(res.result.can_edit)
          })
          return
        }
        console.error('[recipe-detail] getRecipe returned error', res.result)
        wx.showToast({ title: this.getCloudErrorTitle(res.result, '加载失败'), icon: 'none' })
      },
      fail: (error) => {
        console.error('[recipe-detail] getRecipe failed', error)
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
          console.error('[recipe-detail] addMealPlanItem returned error', res.result)
          wx.showToast({ title: this.getCloudErrorTitle(res.result, '加入失败'), icon: 'none' })
          return
        }
        wx.showToast({
          title: '已加入计划',
          icon: 'success'
        })
      },
      fail: (error) => {
        console.error('[recipe-detail] addMealPlanItem failed', error)
        wx.showToast({ title: '加入失败', icon: 'none' })
      }
    })
  },

  onFavorite() {
    if (!wx.cloud) {
      wx.showToast({ title: '云开发未启用', icon: 'none' })
      return
    }

    wx.cloud.callFunction({
      name: 'toggleFavorite',
      data: {
        recipe_id: this.data.recipe._id || this.data.recipe.id
      },
      success: (res) => {
        if (res.result && res.result.ok === false) {
          console.error('[recipe-detail] toggleFavorite returned error', res.result)
          wx.showToast({ title: this.getCloudErrorTitle(res.result, '操作失败'), icon: 'none' })
          return
        }
        const favorited = Boolean(res.result && res.result.favorited)
        this.setData({ isFavorited: favorited })
        wx.showToast({ title: favorited ? '已收藏' : '已取消', icon: 'success' })
      },
      fail: (error) => {
        console.error('[recipe-detail] toggleFavorite failed', error)
        wx.showToast({ title: '操作失败', icon: 'none' })
      }
    })
  },

  onEditRecipe() {
    const id = this.data.recipe._id || this.data.recipe.id
    if (!id) return
    wx.navigateTo({ url: '/pages/recipe-edit/index?id=' + id })
  },

  onDeleteRecipe() {
    const id = this.data.recipe._id || this.data.recipe.id
    if (!id || !wx.cloud) return

    wx.showModal({
      title: '删除菜谱',
      content: '删除后首页不会再展示，相关封面图片也会清理。确定删除吗？',
      success: (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '删除中' })
        wx.cloud.callFunction({
          name: 'deleteRecipe',
          data: { recipe_id: id },
          success: (result) => {
            wx.hideLoading()
            if (result.result && result.result.ok === false) {
              wx.showToast({ title: '删除失败', icon: 'none' })
              return
            }
            wx.showToast({ title: '已删除', icon: 'success' })
            setTimeout(() => wx.navigateBack(), 400)
          },
          fail: () => {
            wx.hideLoading()
            wx.showToast({ title: '删除失败', icon: 'none' })
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
  },

  getCoverLetter(title) {
    const text = String(title || '').trim()
    return text ? text.slice(0, 1) : '菜'
  },

  normalizeRecipe(recipe) {
    return Object.assign({}, recipe, {
      id: recipe.id || recipe._id || '',
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      steps: Array.isArray(recipe.steps) ? recipe.steps : [],
      tags: Array.isArray(recipe.tags) ? recipe.tags : [],
      meal_types: Array.isArray(recipe.meal_types) ? recipe.meal_types : [],
      cover_images: Array.isArray(recipe.cover_images) ? recipe.cover_images : []
    })
  }
})
