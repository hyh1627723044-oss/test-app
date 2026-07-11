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
      '麻辣',
      '清淡',
      '饮品',
      '早餐',
      '甜口',
      '香辣',
      '微辣',
      '酸辣',
      '酸甜',
      '咸香',
      '蒜香',
      '鲜香',
      '适合带饭',
      '儿童友好',
      '冰箱清库存',
      '少油',
      '素食',
      '减脂',
      '一人食',
      '汤羹',
      '烘焙',
      '宴客',
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
      '麻辣',
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
    coverImages: [],
    aiRecognizing: false,
    aiGeneratedSteps: false
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
    this.setData({ stepsText: e.detail.value, aiGeneratedSteps: false })
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
      sizeType: ['compressed'],
      success: (res) => {
        const coverImages = res.tempFiles.map((file, index) => ({
          temp_file_path: file.tempFilePath,
          sort_order: index + 1
        }))
        this.setData({ coverImages })
      }
    })
  },

  onAiRecognize() {
    if (this.data.aiRecognizing || this.data.coverImages.length === 0) return
    if (!wx.cloud) {
      wx.showToast({ title: '云开发未启用', icon: 'none' })
      return
    }

    this.setData({ aiRecognizing: true })
    wx.showLoading({ title: 'AI 识别中' })
    this.ensureFirstCoverUploaded()
      .then((fileId) => wx.cloud.callFunction({
        name: 'askAi',
        data: {
          intent: 'recognize_recipe_image',
          payload: {
            image_url: fileId,
            note: '请完整填写菜谱表单；耗时、份量、热量、食材用量和步骤允许合理估算。'
          }
        }
      }))
      .then((res) => {
        const result = res.result
        if (!result || !result.ok) {
          const code = result && result.code ? result.code : 'AI_RECOGNITION_FAILED'
          console.error('[recipe-edit] askAi recognition returned error', result)
          throw new Error(code)
        }
        this.applyAiRecognition(result.result || {})
        wx.hideLoading()
        wx.showToast({ title: '已识别，可继续修改', icon: 'success' })
      })
      .catch((error) => {
        console.error('[recipe-edit] askAi recognition failed', error)
        wx.hideLoading()
        const message = String(error && (error.errMsg || error.message) || '')
        const isTimeout = /timeout|AI_UPSTREAM_TIMEOUT|FUNCTION.*TIME.*LIMIT/i.test(message)
        wx.showToast({
          title: isTimeout ? '识别超时，请重试' : '图片识别失败',
          icon: 'none'
        })
      })
      .finally(() => {
        this.setData({ aiRecognizing: false })
      })
  },

  ensureFirstCoverUploaded() {
    const first = this.data.coverImages[0]
    if (first.file_id) return Promise.resolve(first.file_id)
    const ext = this.getFileExt(first.temp_file_path)
    const cloudPath = 'recipes/temp/' + Date.now() + '/ai-cover' + ext
    return wx.cloud.uploadFile({
      cloudPath,
      filePath: first.temp_file_path
    }).then((res) => {
      const coverImages = this.data.coverImages.slice()
      coverImages[0] = {
        ...first,
        file_id: res.fileID,
        temp_file_path: res.fileID,
        sort_order: 1
      }
      this.setData({ coverImages })
      return res.fileID
    })
  },

  applyAiRecognition(result) {
    const ingredients = Array.isArray(result.ingredients)
      ? result.ingredients.map((item) => {
        if (typeof item === 'string') return item
        return [item.name, item.amount].filter(Boolean).join('，')
      }).filter(Boolean)
      : []
    const tags = Array.isArray(result.tags)
      ? result.tags.map((item) => String(item).trim()).filter(Boolean)
      : []
    const steps = Array.isArray(result.steps)
      ? result.steps.map((item) => String(item).trim()).filter(Boolean)
      : []
    const categoryIndex = this.data.categoryOptions.findIndex((item) => item.value === result.category)
    const difficultyIndex = this.data.difficultyOptions.findIndex((item) => item.value === result.difficulty)
    const validMealTypes = Array.isArray(result.meal_types)
      ? result.meal_types.map((item) => String(item)).filter(Boolean)
      : []
    const mealTypes = this.data.mealTypes.map((item) => ({
      ...item,
      selected: validMealTypes.indexOf(item.id) >= 0
    }))
    const cookTime = toPositiveIntegerString(result.cook_time_minutes)
    const servings = toPositiveIntegerString(result.servings)
    const calories = toNonNegativeIntegerString(result.calories)
    this.setData({
      title: result.title || this.data.title,
      description: result.description || this.data.description,
      categoryIndex: categoryIndex >= 0 ? categoryIndex : this.data.categoryIndex,
      difficultyIndex: difficultyIndex >= 0 ? difficultyIndex : this.data.difficultyIndex,
      cookTime: cookTime || this.data.cookTime,
      servings: servings || this.data.servings,
      mealTypes: validMealTypes.length > 0 ? mealTypes : this.data.mealTypes,
      calories: calories || this.data.calories,
      ingredientsText: ingredients.length > 0 ? ingredients.join('\n') : this.data.ingredientsText,
      stepsText: steps.length > 0 ? steps.join('\n') : this.data.stepsText,
      selectedTags: Array.from(new Set(this.data.selectedTags.concat(tags))),
      aiGeneratedSteps: steps.length > 0
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

function toPositiveIntegerString(value) {
  const number = Math.round(Number(value))
  return Number.isFinite(number) && number > 0 ? String(number) : ''
}

function toNonNegativeIntegerString(value) {
  const number = Math.round(Number(value))
  return Number.isFinite(number) && number >= 0 ? String(number) : ''
}
