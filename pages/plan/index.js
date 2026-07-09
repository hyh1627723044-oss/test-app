Page({
  data: {
    activeTab: 'plan',
    dateText: '今天',
    planDate: '',
    slots: [
      { id: 'breakfast', name: '早餐', time: '08:00', recipes: [], decor_type: 'flower', tape_color: 'yellow' },
      { id: 'lunch', name: '午餐', time: '12:00', recipes: [], decor_type: 'leaf', tape_color: 'green' },
      { id: 'afternoon_tea', name: '下午茶', time: '15:30', recipes: [], decor_type: 'star', tape_color: 'pink' },
      { id: 'dinner', name: '晚餐', time: '18:30', recipes: [], decor_type: 'moon', tape_color: 'green' },
      { id: 'night_snack', name: '夜宵', time: '21:30', recipes: [], decor_type: 'moon', tape_color: 'yellow' }
    ]
  },

  onLoad() {
    const planDate = this.getToday()
    this.setData({ planDate, dateText: this.formatDateText(planDate) })
    this.loadMealPlan(planDate)
  },

  onShow() {
    if (this.data.planDate) {
      this.loadMealPlan(this.data.planDate)
    }
  },

  onShareAppMessage() {
    return {
      title: '我的饮食计划',
      path: '/pages/plan/index'
    }
  },

  onChangeDate(e) {
    const planDate = e.detail.value
    this.setData({ planDate, dateText: this.formatDateText(planDate) })
    this.loadMealPlan(planDate)
  },

  onPrevDay() {
    this.shiftDate(-1)
  },

  onNextDay() {
    this.shiftDate(1)
  },

  onTapRecipe(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    wx.navigateTo({ url: '/pages/recipe-detail/index?id=' + id })
  },

  onTapTab(e) {
    const { id } = e.currentTarget.dataset
    if (id === 'recipes') {
      wx.redirectTo({ url: '/pages/index/index' })
      return
    }
    if (id === 'plan') return
    wx.redirectTo({ url: '/pages/my/index' })
  },

  loadMealPlan(planDate) {
    if (!wx.cloud) return

    wx.cloud.callFunction({
      name: 'getMealPlan',
      data: { plan_date: planDate },
      success: (res) => {
        if (!res.result || !res.result.ok || !Array.isArray(res.result.slots)) return
        const timeMap = {
          breakfast: '08:00',
          lunch: '12:00',
          afternoon_tea: '15:30',
          dinner: '18:30',
          night_snack: '21:30'
        }
        const decorMap = {
          breakfast: 'flower',
          lunch: 'leaf',
          afternoon_tea: 'star',
          dinner: 'moon',
          night_snack: 'flower'
        }
        const tapeColorMap = {
          breakfast: 'yellow',
          lunch: 'green',
          afternoon_tea: 'pink',
          dinner: 'green',
          night_snack: 'yellow'
        }
        const slots = res.result.slots.map((slot) => ({
          id: slot.id,
          name: slot.name,
          time: timeMap[slot.id] || '',
          decor_type: decorMap[slot.id] || 'leaf',
          tape_color: tapeColorMap[slot.id] || 'yellow',
          recipes: slot.items.map((item) => ({
            item_id: item._id,
            id: item.recipe_id,
            title: item.recipe_title || '未命名菜品',
            cover: item.recipe_primary_cover_file_id || '',
            note: item.note || ''
          }))
        }))
        this.setData({ slots })
      }
    })
  },

  onTapChooseRecipes() {
    wx.redirectTo({ url: '/pages/index/index' })
  },

  onManagePlanItem(e) {
    const { itemId, slot } = e.currentTarget.dataset
    if (!itemId || !wx.cloud) return

    const slotOptions = [
      { id: 'breakfast', label: '换到早餐' },
      { id: 'lunch', label: '换到午餐' },
      { id: 'afternoon_tea', label: '换到下午茶' },
      { id: 'dinner', label: '换到晚餐' },
      { id: 'night_snack', label: '换到夜宵' }
    ].filter((item) => item.id !== slot)
    const itemList = slotOptions.map((item) => item.label).concat('删除这项')

    wx.showActionSheet({
      itemList,
      success: (res) => {
        if (res.tapIndex === itemList.length - 1) {
          this.deletePlanItem(itemId)
          return
        }
        this.updatePlanItemSlot(itemId, slotOptions[res.tapIndex].id)
      }
    })
  },

  updatePlanItemSlot(itemId, mealSlot) {
    wx.showLoading({ title: '更新中' })
    wx.cloud.callFunction({
      name: 'updateMealPlanItem',
      data: {
        item_id: itemId,
        meal_slot: mealSlot
      },
      success: (res) => {
        wx.hideLoading()
        if (res.result && res.result.ok === false) {
          wx.showToast({ title: '更新失败', icon: 'none' })
          return
        }
        wx.showToast({ title: '已更新', icon: 'success' })
        this.loadMealPlan(this.data.planDate)
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '更新失败', icon: 'none' })
      }
    })
  },

  deletePlanItem(itemId) {
    wx.showModal({
      title: '删除安排',
      content: '确定从这一天的计划里移除吗？',
      success: (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '删除中' })
        wx.cloud.callFunction({
          name: 'deleteMealPlanItem',
          data: { item_id: itemId },
          success: (result) => {
            wx.hideLoading()
            if (result.result && result.result.ok === false) {
              wx.showToast({ title: '删除失败', icon: 'none' })
              return
            }
            wx.showToast({ title: '已删除', icon: 'success' })
            this.loadMealPlan(this.data.planDate)
          },
          fail: () => {
            wx.hideLoading()
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        })
      }
    })
  },

  shiftDate(offset) {
    const date = new Date(this.data.planDate)
    date.setDate(date.getDate() + offset)
    const planDate = this.formatDate(date)
    this.setData({ planDate, dateText: this.formatDateText(planDate) })
    this.loadMealPlan(planDate)
  },

  getToday() {
    return this.formatDate(new Date())
  },

  formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return year + '-' + month + '-' + day
  },

  formatDateText(dateText) {
    if (dateText === this.getToday()) return '今天'
    return dateText
  }
})
