Page({
  data: {
    recipeId: '',
    isEditing: false,
    title: '',
    description: '',
    categoryIndex: 0,
    difficultyIndex: 0,
    categoryOptions: [
      { label: '家常菜', value: 'home_cooking' },
      { label: '早餐', value: 'breakfast' },
      { label: '饮品', value: 'drink' },
      { label: '甜点', value: 'dessert' },
      { label: '轻食', value: 'light_meal' }
    ],
    difficultyOptions: [
      { label: '简单', value: 'easy' },
      { label: '普通', value: 'normal' },
      { label: '进阶', value: 'hard' }
    ],
    mealTypes: [
      { id: 'breakfast', name: '早餐', selected: false },
      { id: 'lunch', name: '午餐', selected: false },
      { id: 'afternoon_tea', name: '下午茶', selected: false },
      { id: 'dinner', name: '晚餐', selected: false },
      { id: 'night_snack', name: '夜宵', selected: false }
    ],
    systemTags: [
      '快手',
      '低脂',
      '下饭',
      '家常',
      '高蛋白',
      '早餐',
      '清淡',
      '饮品',
      '甜口',
      '适合带饭',
      '儿童友好',
      '冰箱清库存',
      '少油',
      '暖胃',
      '夏天',
      '夜宵'
    ],
    visibleSystemTags: [
      '快手',
      '低脂',
      '下饭',
      '家常',
      '高蛋白',
      '早餐',
      '清淡',
      '饮品'
    ],
    selectedTags: [],
    customTagText: '',
    showAllSystemTags: false,
    ingredientsText: '',
    stepsText: '',
    cookTime: '',
    servings: '1',
    calories: '',
    isPublic: true,
    coverImages: []
  },

  onLoad(options) {
    this.loadTags()
    if (options && options.id) {
      this.setData({
        recipeId: options.id,
        isEditing: true
      })
      this.loadRecipe(options.id)
    }
  },

  onShow() {},

  onShareAppMessage() {
    return {
      title: this.data.isEditing ? '编辑一道好菜' : '添加一道好菜',
      path: this.data.isEditing
        ? '/pages/recipe-edit/index?id=' + this.data.recipeId
        : '/pages/recipe-edit/index'
    }
  },

  loadTags() {
    if (!wx.cloud) return
    wx.cloud.callFunction({
      name: 'listTags',
      success: (res) => {
        if (!res.result || !res.result.ok) return
        const systemTags = Array.isArray(res.result.tags) ? res.result.tags : this.data.systemTags
        this.setData({
          systemTags,
          visibleSystemTags: this.data.showAllSystemTags ? systemTags : systemTags.slice(0, 8)
        })
      }
    })
  },

  loadRecipe(id) {
    if (!id || !wx.cloud) return
    wx.showLoading({ title: '加载中' })
    wx.cloud.callFunction({
      name: 'getRecipe',
      data: { id },
      success: (res) => {
        wx.hideLoading()
        if (!res.result || !res.result.ok || !res.result.recipe || !res.result.can_edit) {
          wx.showToast({ title: '没有编辑权限', icon: 'none' })
          setTimeout(() => wx.navigateBack(), 500)
          return
        }
        this.fillForm(res.result.recipe)
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '加载失败', icon: 'none' })
      }
    })
  },

  fillForm(recipe) {
    const categoryIndex = Math.max(0, this.data.categoryOptions.findIndex((item) => item.value === recipe.category))
    const difficultyIndex = Math.max(0, this.data.difficultyOptions.findIndex((item) => item.value === recipe.difficulty))
    const selectedMealTypes = Array.isArray(recipe.meal_types) ? recipe.meal_types : []
    const mealTypes = this.data.mealTypes.map((item) => ({
      ...item,
      selected: selectedMealTypes.indexOf(item.id) >= 0
    }))
    const ingredientsText = Array.isArray(recipe.ingredients)
      ? recipe.ingredients.map((item) => [item.name, item.amount].filter(Boolean).join('，')).join('\n')
      : ''
    const stepsText = Array.isArray(recipe.steps)
      ? recipe.steps.map((item) => item.text).filter(Boolean).join('\n')
      : ''
    const coverImages = Array.isArray(recipe.cover_images)
      ? recipe.cover_images.map((item, index) => ({
        file_id: item.file_id,
        temp_file_path: item.file_id,
        sort_order: item.sort_order || index + 1,
        width: item.width || 0,
        height: item.height || 0
      }))
      : []

    this.setData({
      title: recipe.title || '',
      description: recipe.description || '',
      categoryIndex,
      difficultyIndex,
      mealTypes,
      selectedTags: Array.isArray(recipe.tags) ? recipe.tags : [],
      ingredientsText,
      stepsText,
      cookTime: recipe.cook_time_minutes ? String(recipe.cook_time_minutes) : '',
      servings: recipe.servings ? String(recipe.servings) : '1',
      calories: recipe.calories ? String(recipe.calories) : '',
      isPublic: Boolean(recipe.is_public),
      coverImages
    })
  },

  onInputTitle(e) {
    this.setData({ title: e.detail.value })
  },

  onInputDescription(e) {
    this.setData({ description: e.detail.value })
  },

  onInputCookTime(e) {
    this.setData({ cookTime: e.detail.value })
  },

  onInputServings(e) {
    this.setData({ servings: e.detail.value })
  },

  onInputCalories(e) {
    this.setData({ calories: e.detail.value })
  },

  onInputCustomTag(e) {
    this.setData({ customTagText: e.detail.value })
  },

  onInputIngredients(e) {
    this.setData({ ingredientsText: e.detail.value })
  },

  onInputSteps(e) {
    this.setData({ stepsText: e.detail.value })
  },

  onChangeCategory(e) {
    this.setData({ categoryIndex: Number(e.detail.value) })
  },

  onChangeDifficulty(e) {
    this.setData({ difficultyIndex: Number(e.detail.value) })
  },

  onToggleMealType(e) {
    const { id } = e.currentTarget.dataset
    const mealTypes = this.data.mealTypes.map((item) => {
      if (item.id !== id) return item
      return { ...item, selected: !item.selected }
    })
    this.setData({ mealTypes })
  },

  onToggleSystemTag(e) {
    const { tag } = e.currentTarget.dataset
    this.toggleTag(tag)
  },

  onAddCustomTag() {
    const tag = this.data.customTagText.trim()
    if (!tag) return
    this.toggleTag(tag, true)
    this.setData({ customTagText: '' })
    if (wx.cloud) {
      wx.cloud.callFunction({
        name: 'upsertTag',
        data: { name: tag },
        success: () => this.loadTags()
      })
    }
  },

  onRemoveSelectedTag(e) {
    const { tag } = e.currentTarget.dataset
    const selectedTags = this.data.selectedTags.filter((item) => item !== tag)
    this.setData({ selectedTags })
  },

  onToggleMoreTags() {
    const showAllSystemTags = !this.data.showAllSystemTags
    const visibleSystemTags = showAllSystemTags
      ? this.data.systemTags
      : this.data.systemTags.slice(0, 8)
    this.setData({ showAllSystemTags, visibleSystemTags })
  },

  onTogglePublic(e) {
    this.setData({ isPublic: e.detail.value })
  },

  onChooseImages() {
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      success: (res) => {
        const coverImages = res.tempFiles.map((file, index) => ({
          temp_file_path: file.tempFilePath,
          sort_order: index + 1
        }))
        this.setData({ coverImages })
      }
    })
  },

  onSubmit() {
    if (!this.data.title.trim()) {
      wx.showToast({ title: '先写菜名', icon: 'none' })
      return
    }
    if (!wx.cloud) {
      wx.showToast({ title: '云开发未启用', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中' })
    this.uploadCoverImages()
      .then((coverImages) => {
        const primaryCover = coverImages.length > 0 ? coverImages[0].file_id : ''
        const category = this.data.categoryOptions[this.data.categoryIndex].value
        const difficulty = this.data.difficultyOptions[this.data.difficultyIndex].value
        return wx.cloud.callFunction({
          name: this.data.isEditing ? 'updateRecipe' : 'createRecipe',
          data: {
            id: this.data.recipeId,
            title: this.data.title.trim(),
            description: this.data.description.trim(),
            category,
            difficulty,
            cook_time_minutes: Number(this.data.cookTime || 0),
            servings: Number(this.data.servings || 1),
            calories: Number(this.data.calories || 0),
            primary_cover_file_id: primaryCover,
            cover_images: coverImages,
            meal_types: this.getSelectedMealTypes(),
            tags: this.data.selectedTags,
            ingredients: this.parseIngredients(),
            steps: this.parseSteps(),
            is_public: this.data.isPublic
          }
        })
      })
      .then((res) => {
        wx.hideLoading()
        if (res.result && res.result.ok === false) {
          wx.showToast({ title: '保存失败', icon: 'none' })
          return
        }
        wx.showToast({ title: this.data.isEditing ? '已更新' : '已保存', icon: 'success' })
        wx.navigateBack()
      })
      .catch(() => {
        wx.hideLoading()
        wx.showToast({ title: '保存失败', icon: 'none' })
      })
  },

  uploadCoverImages() {
    const files = this.data.coverImages
    if (files.length === 0) return Promise.resolve([])

    const timestamp = Date.now()
    const tasks = files.map((file, index) => {
      if (file.file_id && !file.temp_file_path.startsWith('http://tmp') && !file.temp_file_path.startsWith('wxfile://')) {
        return Promise.resolve({
          file_id: file.file_id,
          sort_order: index + 1,
          width: file.width || 0,
          height: file.height || 0
        })
      }
      const ext = this.getFileExt(file.temp_file_path)
      const cloudPath = 'recipes/temp/' + timestamp + '/cover-' + (index + 1) + ext
      return wx.cloud.uploadFile({
        cloudPath,
        filePath: file.temp_file_path
      }).then((res) => ({
        file_id: res.fileID,
        sort_order: index + 1,
        width: 0,
        height: 0
      }))
    })

    return Promise.all(tasks)
  },

  getSelectedMealTypes() {
    return this.data.mealTypes
      .filter((item) => item.selected)
      .map((item) => item.id)
  },

  toggleTag(tag, forceAdd) {
    if (!tag) return
    const exists = this.data.selectedTags.indexOf(tag) >= 0
    if (exists && !forceAdd) {
      this.setData({
        selectedTags: this.data.selectedTags.filter((item) => item !== tag)
      })
      return
    }
    if (!exists) {
      this.setData({
        selectedTags: this.data.selectedTags.concat(tag)
      })
    }
  },

  parseIngredients() {
    return this.data.ingredientsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[,，]/)
        return {
          name: (parts[0] || '').trim(),
          amount: (parts[1] || '').trim()
        }
      })
      .filter((item) => item.name)
  },

  parseSteps() {
    return this.data.stepsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text, index) => ({
        order: index + 1,
        text
      }))
  },

  getFileExt(path) {
    const index = path.lastIndexOf('.')
    if (index < 0) return '.jpg'
    return path.substring(index)
  }
})
