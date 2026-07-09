Page({
  data: {
    inputText: '',
    sending: false,
    messages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: '今天想吃点什么？可以直接告诉我口味、食材、忌口或用餐场景，比如“想吃清淡一点的热菜”。'
      }
    ],
    recommendations: [],
    existingRecipeTitles: []
  },

  onLoad() {
    this.loadRecipeTitles()
  },

  onShareAppMessage() {
    return {
      title: '让 AI 帮你想今天吃什么',
      path: '/pages/ai-recommend/index'
    }
  },

  loadRecipeTitles() {
    if (!wx.cloud) return
    wx.cloud.callFunction({
      name: 'listRecipes',
      data: { only_mine: true, limit: 50 },
      success: (res) => {
        const recipes = res.result && res.result.recipes
        if (!Array.isArray(recipes)) return
        this.setData({
          existingRecipeTitles: recipes.map((item) => item.title).filter(Boolean)
        })
      }
    })
  },

  onInputMessage(e) {
    this.setData({ inputText: e.detail.value })
  },

  onSendMessage() {
    const content = this.data.inputText.trim()
    if (!content || this.data.sending) return
    if (!wx.cloud) {
      wx.showToast({ title: '云开发未启用', icon: 'none' })
      return
    }

    const userMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content
    }
    const messages = this.data.messages.concat(userMessage)
    this.setData({
      inputText: '',
      sending: true,
      messages
    })

    wx.cloud.callFunction({
      name: 'askAi',
      data: {
        intent: 'recommend_today',
        payload: {
          user_message: content,
          history: this.toHistory(messages.slice(0, -1)),
          existing_recipe_titles: this.data.existingRecipeTitles
        }
      },
      success: (res) => {
        const result = res.result
        if (!result || !result.ok) {
          this.showAiError(result)
          return
        }
        const aiResult = result.result || {}
        const decorTypes = ['flower', 'leaf', 'star', 'moon']
        const recommendations = (Array.isArray(aiResult.recommendations)
          ? aiResult.recommendations
          : []).map((item, index) => ({
          ...item,
          decor_type: decorTypes[index % decorTypes.length]
        }))
        const reply = aiResult.assistant_message ||
          (recommendations.length > 0 ? '我根据你的描述挑了这几道，可以继续告诉我哪里想调整。' : '我还需要一点信息，可以再说说你的口味或现有食材。')
        this.setData({
          messages: this.data.messages.concat({
            id: 'assistant-' + Date.now(),
            role: 'assistant',
            content: reply,
            context_content: reply + (recommendations.length > 0
              ? '\n本轮推荐：' + JSON.stringify(recommendations)
              : '')
          }),
          recommendations
        })
      },
      fail: () => {
        wx.showToast({ title: 'AI 暂时没有回应', icon: 'none' })
      },
      complete: () => {
        this.setData({ sending: false })
      }
    })
  },

  onUseSuggestion(e) {
    const text = e.currentTarget.dataset.text || ''
    this.setData({ inputText: text }, () => this.onSendMessage())
  },

  toHistory(messages) {
    return messages
      .filter((item) => item.id !== 'welcome')
      .slice(-10)
      .map((item) => ({
        role: item.role,
        content: item.context_content || item.content
      }))
  },

  showAiError(result) {
    const title = result && result.code === 'AI_NOT_CONFIGURED'
      ? 'AI 尚未配置'
      : 'AI 暂时不可用'
    wx.showToast({ title, icon: 'none' })
  }
})
