<template>
  <view class="page-shell detail-page">
    <view class="topbar">
      <view class="back-button" @tap="goBack">‹</view>
      <text>菜谱详情</text>
      <view class="top-placeholder" />
    </view>

    <view v-if="loading" class="loading-card paper-soft">
      <image src="/static/illustrations/upload-recipe.png" mode="aspectFit" />
      <text>正在翻开菜谱本...</text>
    </view>

    <view v-else-if="error" class="loading-card paper-soft">
      <image src="/static/illustrations/empty-recipes.png" mode="aspectFit" />
      <text>{{ error }}</text>
      <button size="mini" @tap="loadRecipe">重试</button>
    </view>

    <template v-else>
      <view class="photo-card paper-card">
        <image class="photo-tape left" src="/static/illustrations/tape-yellow.png" mode="aspectFit" />
        <image class="photo-tape right" src="/static/illustrations/tape-green.png" mode="aspectFit" />
        <swiper v-if="recipe.image_urls.length" class="photo-swiper" circular indicator-dots indicator-color="rgba(74,48,34,.25)" indicator-active-color="#df7523">
          <swiper-item v-for="image in recipe.image_urls" :key="image">
            <image class="hero-image" :src="image" mode="aspectFill" />
          </swiper-item>
        </swiper>
        <view v-else class="hero-fallback">
          <image src="/static/illustrations/empty-recipes.png" mode="aspectFit" />
          <text>{{ recipe.title }}</text>
        </view>
      </view>

      <view class="title-card paper-card paper-hero">
        <image class="title-decor" src="/static/illustrations/decor-flower.png" mode="aspectFit" />
        <text class="eyebrow">今天这道</text>
        <text class="recipe-title">{{ recipe.title }}</text>
        <view class="doodle-underline" />
        <text class="recipe-desc">{{ recipe.description || '还没有写简介，先把好吃记在心里。' }}</text>
        <view class="meta-row">
          <view>
            <text>{{ recipe.cook_time_minutes || 0 }}</text>
            <text>分钟</text>
          </view>
          <view>
            <text>{{ recipe.ingredients.length }}</text>
            <text>种食材</text>
          </view>
          <view>
            <text>{{ recipe.image_urls.length }}</text>
            <text>张图片</text>
          </view>
        </view>
        <view v-if="recipe.tags.length" class="tags">
          <text v-for="tag in recipe.tags" :key="tag">#{{ tag }}</text>
        </view>
      </view>

      <view class="section-card paper-soft">
        <view class="section-head">
          <text>食材清单</text>
          <image src="/static/illustrations/decor-leaf.png" mode="aspectFit" />
        </view>
        <view v-if="recipe.ingredients.length" class="ingredient-list">
          <view v-for="ingredient in recipe.ingredients" :key="ingredient">
            <text class="check">✓</text>
            <text>{{ ingredient }}</text>
          </view>
        </view>
        <view v-else class="empty-line">还没有写食材，编辑时可以补上。</view>
      </view>

      <view class="section-card paper-soft">
        <view class="section-head">
          <text>小厨备注</text>
          <image src="/static/illustrations/decor-star.png" mode="aspectFit" />
        </view>
        <text class="note-text">{{ recipe.description || '适合记录步骤、口味、替换食材，后面我们可以继续把做法步骤也加进来。' }}</text>
      </view>

      <view class="bottom-actions">
        <button v-if="recipe.can_edit" class="ghost" @tap="openEdit">编辑菜谱</button>
        <button class="primary" @tap="addToPlan">加入计划</button>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { addPlanItem, getRecipe } from '../../services/api'

const recipeId = ref('')
const loading = ref(true)
const error = ref('')
const recipe = ref({
  id: '',
  title: '',
  description: '',
  cook_time_minutes: 0,
  ingredients: [],
  image_urls: [],
  tags: [],
  can_edit: false,
})

onLoad((query) => {
  recipeId.value = query?.id || ''
  loadRecipe()
})

async function loadRecipe() {
  if (!recipeId.value) {
    error.value = '没有找到这道菜'
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    const data = await getRecipe(recipeId.value)
    recipe.value = {
      ...data,
      ingredients: data.ingredients || [],
      image_urls: data.image_urls || [],
      tags: data.tags || [],
      can_edit: !!data.can_edit,
    }
  } catch (err) {
    error.value = err.message || '菜谱加载失败'
  } finally {
    loading.value = false
  }
}

function goBack() {
  uni.navigateBack()
}

function openEdit() {
  uni.navigateTo({ url: `/pages/recipes/form?id=${recipeId.value}` })
}

function addToPlan() {
  const slots = ['早餐', '午餐', '下午茶', '晚餐', '夜宵']
  uni.showActionSheet({
    itemList: slots,
    success: async ({ tapIndex }) => {
      try {
        await addPlanItem(today(), { recipe_id: Number(recipeId.value), meal_slot: slots[tapIndex], note: '' })
        uni.showToast({ title: '已加入计划', icon: 'success' })
      } catch (err) {
        uni.showToast({ title: err.message || '加入失败', icon: 'none' })
      }
    },
  })
}

function today() {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
</script>

<style lang="scss" scoped>
.detail-page { padding-left: 26rpx; padding-right: 26rpx; padding-bottom: 190rpx; }
.topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; color: #2f2118; font-size: 30rpx; font-weight: 800; }
.back-button,.top-placeholder { width: 70rpx; height: 70rpx; }
.back-button { display: flex; align-items: center; justify-content: center; border: 2rpx solid #4a3022; border-radius: 50%; background: #fff7df; box-shadow: 4rpx 5rpx 0 rgba(138, 84, 41, .18); font-size: 54rpx; line-height: 54rpx; color: #4a3022; }
.loading-card { min-height: 520rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18rpx; padding: 40rpx; color: #6f523c; font-size: 28rpx; font-weight: 800; text-align: center; }
.loading-card image { width: 210rpx; height: 180rpx; }
.loading-card button { border: 2rpx solid #8f4f1f; border-radius: 20rpx; background: #e98225; color: #fff7df; }
.photo-card { position: relative; padding: 24rpx 24rpx 52rpx; overflow: visible; background: #fffdf1; }
.photo-tape { position: absolute; z-index: 2; top: -24rpx; width: 130rpx; height: 58rpx; }
.photo-tape.left { left: 42rpx; transform: rotate(-8deg); }
.photo-tape.right { right: 42rpx; transform: rotate(7deg); }
.photo-swiper { height: 470rpx; border: 2rpx solid #d6b17d; border-radius: 20rpx; overflow: hidden; background: #f0c886; }
.hero-image { width: 100%; height: 100%; }
.hero-fallback { height: 470rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16rpx; border: 2rpx dashed #d6b17d; border-radius: 20rpx; background: #fff4d5; color: #a45f26; font-size: 42rpx; font-weight: 800; text-align: center; }
.hero-fallback image { width: 220rpx; height: 170rpx; }
.title-card { position: relative; margin-top: 28rpx; padding: 34rpx 32rpx; overflow: hidden; }
.title-decor { position: absolute; top: 28rpx; right: 30rpx; width: 70rpx; height: 70rpx; }
.eyebrow { color: #a4642e; font-size: 24rpx; font-weight: 700; }
.recipe-title { display: block; margin-top: 10rpx; padding-right: 84rpx; color: #2f2118; font-size: 52rpx; font-weight: 900; line-height: 62rpx; }
.recipe-desc { display: block; margin-top: 18rpx; color: #6f523c; font-size: 27rpx; line-height: 40rpx; }
.meta-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; margin-top: 24rpx; }
.meta-row view { padding: 14rpx 6rpx; border: 2rpx dashed #cda16c; border-radius: 18rpx; background: #fff7df; text-align: center; }
.meta-row text:first-child { display: block; color: #d86f19; font-size: 34rpx; font-weight: 900; }
.meta-row text:last-child { display: block; margin-top: 4rpx; color: #71533d; font-size: 21rpx; }
.tags { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 20rpx; }
.tags text { padding: 7rpx 14rpx; border-radius: 14rpx; background: #ffe1a6; color: #9f5d25; font-size: 22rpx; font-weight: 700; }
.section-card { margin-top: 24rpx; padding: 28rpx; }
.section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18rpx; }
.section-head text { color: #2f2118; font-size: 34rpx; font-weight: 900; }
.section-head image { width: 58rpx; height: 58rpx; }
.ingredient-list { display: flex; flex-direction: column; gap: 14rpx; }
.ingredient-list view { display: flex; align-items: center; gap: 14rpx; padding: 16rpx 18rpx; border: 2rpx dashed #d6b17d; border-radius: 18rpx; background: #fffaf0; color: #4a3022; font-size: 27rpx; }
.check { width: 36rpx; height: 36rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #d5dd9a; color: #4a3022; font-size: 24rpx; font-weight: 900; }
.empty-line,.note-text { display: block; color: #7a614e; font-size: 27rpx; line-height: 42rpx; }
.bottom-actions { position: fixed; z-index: 900; left: 0; right: 0; bottom: 0; display: flex; gap: 18rpx; padding: 20rpx 28rpx calc(26rpx + env(safe-area-inset-bottom)); background: #fff2cf; box-shadow: 0 -10rpx 22rpx rgba(112, 70, 38, .14); }
.bottom-actions button { flex: 1; height: 78rpx; border-radius: 24rpx; font-size: 28rpx; font-weight: 800; }
.ghost { border: 2rpx dashed #cda16c; background: #fff9e8; color: #71533d; }
.primary { border: 2rpx solid #8f4f1f; background: #e98225; color: #fff7df; }
</style>
