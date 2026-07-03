Page({
  data: {
    activeTab: 'plan',
    dateText: '今天',
    planDate: '',
    slots: [
      { id: 'breakfast', name: '早餐', time: '08:00', recipes: [] },
      { id: 'lunch', name: '午餐', time: '12:00', recipes: [] },
      { id: 'afternoon_tea', name: '下午茶', time: '15:30', recipes: [] },
      { id: 'dinner', name: '晚餐', time: '18:30', recipes: [] },
      { id: 'night_snack', name: '夜宵', time: '21:30', recipes: [] }
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

  onTapMenu() {
    wx.redirectTo({ url: '/pages/index/index' })
  },

  onTapMine() {
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
        const slots = res.result.slots.map((slot) => ({
          id: slot.id,
          name: slot.name,
          time: timeMap[slot.id] || '',
          recipes: slot.items.map((item) => ({
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
