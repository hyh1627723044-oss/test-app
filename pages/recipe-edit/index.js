Page({
  data: {
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
    tagsText: '',
    ingredientsText: '',
    stepsText: '',
    cookTime: '',
    servings: '1',
    calories: '',
    isPublic: true,
    coverImages: []
  },

  onLoad() {},

  onShow() {},

  onShareAppMessage() {
    return {
      title: '添加一道好菜',
      path: '/pages/recipe-edit/index'
    }
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

  onInputTags(e) {
    this.setData({ tagsText: e.detail.value })
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
          name: 'createRecipe',
          data: {
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
            tags: this.parseTags(),
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
        wx.showToast({ title: '已保存', icon: 'success' })
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

  parseTags() {
    return this.data.tagsText
      .split(/[,，\s]+/)
      .map((item) => item.trim())
      .filter(Boolean)
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
