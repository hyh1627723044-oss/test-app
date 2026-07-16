<template>
  <view class="page-shell">
    <view class="hero paper-card paper-hero">
      <text class="eyebrow">今日菜单</text>
      <text class="hero-title">今天想吃点什么？</text>
      <view class="doodle-underline" />
      <text class="hero-desc">挑一道菜，加入早餐、午餐、晚餐或夜宵计划。</text>
    </view>

    <view class="search-card paper-card">
      <view class="search-row">
        <input v-model="keyword" class="search-input" placeholder="搜索菜名 / 标签" confirm-type="search" @confirm="loadRecipes" />
        <image class="search-cat" src="/static/illustrations/search-cat.png" mode="aspectFit" />
      </view>
      <scroll-view scroll-x class="tag-scroll">
        <view class="tag-row">
          <text v-for="tag in quickTags" :key="tag" class="quick-tag" :class="{ selected: activeTag === tag }" @tap="toggleTag(tag)">
            {{ tag }}
          </text>
          <text class="quick-tag plus">+</text>
        </view>
      </scroll-view>
    </view>

    <view class="section-row">
      <scroll-view scroll-x class="category-scroll">
        <view class="category-row">
          <text v-for="category in categories" :key="category" class="category" :class="{ selected: activeCategory === category }" @tap="activeCategory = category">
            {{ category }}
          </text>
        </view>
      </scroll-view>
      <view class="add-button" @tap="openForm()">
        <image src="/static/illustrations/icon-recipe-add.png" mode="aspectFit" />
        <text>添加菜谱</text>
      </view>
    </view>

    <view v-if="loadError" class="notice paper-card">
      <text>后端暂时没有连上，正在展示本地示例菜谱。</text>
    </view>

    <view v-for="recipe in filteredRecipes" :key="recipe.id" class="recipe-card paper-card">
      <image class="tape" :src="`/static/illustrations/tape-${recipe.tape}.png`" mode="aspectFit" />
      <image class="decor" :src="`/static/illustrations/decor-${recipe.decor}.png`" mode="aspectFit" />
      <image v-if="recipe.cover" class="cover" :src="recipe.cover" mode="aspectFill" />
      <view v-else class="cover fallback"><text>{{ recipe.title }}</text></view>
      <view class="recipe-copy">
        <view class="title-row">
          <text class="recipe-title">{{ recipe.title }}</text>
          <text v-if="recipe.canEdit" class="edit-link" @tap="openForm(recipe.id)">编辑</text>
        </view>
        <text class="time">约 {{ recipe.time }} 分钟</text>
        <text class="description">{{ recipe.description }}</text>
        <view class="tags"><text v-for="tag in recipe.tags" :key="tag">#{{ tag }}</text></view>
        <view class="card-footer">
          <view />
          <button class="plan-button" size="mini" @tap="addToPlan(recipe)">加入计划</button>
        </view>
      </view>
    </view>
    <AppNav active="recipes" />
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppNav from '../../components/AppNav.vue'
import { addPlanItem, listRecipes } from '../../services/api'

const keyword = ref('')
const activeTag = ref('')
const activeCategory = ref('全部')
const loadError = ref('')
const quickTags = ['快手', '低脂', '下饭', '家常', '高蛋白', '早餐']
const categories = ['全部', '早餐', '午餐', '晚餐', '饮品']

const mockRecipes = [
  { id: 1, title: '番茄炒蛋', time: 12, description: '酸甜开胃，简单快手，一碗暖心的家常菜。', tags: ['家常', '快手'], tape: 'yellow', decor: 'flower', cover: '', canEdit: false },
  { id: 2, title: '香煎豆腐', time: 15, description: '外焦里嫩，简单调味，豆香浓郁又下饭。', tags: ['清淡', '素食'], tape: 'green', decor: 'leaf', cover: '', canEdit: false },
  { id: 3, title: '虾仁蒸蛋', time: 18, description: '嫩滑营养，做法简单，大人小孩都喜欢。', tags: ['高蛋白', '蒸菜'], tape: 'pink', decor: 'star', cover: '', canEdit: false },
]
const recipes = ref(mockRecipes)

const filteredRecipes = computed(() => recipes.value.filter((recipe) => {
  const text = `${recipe.title}${recipe.tags.join('')}`
  return (!keyword.value || text.includes(keyword.value)) && (!activeTag.value || recipe.tags.includes(activeTag.value))
}))

watch([keyword, activeTag], () => {
  if (!loadError.value) loadRecipes()
})

onShow(loadRecipes)

function toggleTag(tag) {
  activeTag.value = activeTag.value === tag ? '' : tag
}

function openForm(id) {
  uni.navigateTo({ url: id ? `/pages/recipes/form?id=${id}` : '/pages/recipes/form' })
}

async function loadRecipes() {
  try {
    const rows = await listRecipes({ keyword: keyword.value })
    recipes.value = rows.map((item, index) => normalizeRecipe(item, index))
    loadError.value = ''
  } catch (error) {
    loadError.value = error.message
    recipes.value = mockRecipes
  }
}

async function addToPlan(recipe) {
  if (loadError.value) {
    uni.showToast({ title: '请先启动后端', icon: 'none' })
    return
  }
  const slots = ['早餐', '午餐', '下午茶', '晚餐', '夜宵']
  uni.showActionSheet({
    itemList: slots,
    success: async ({ tapIndex }) => {
      try {
        await addPlanItem(today(), { recipe_id: recipe.id, meal_slot: slots[tapIndex], note: '' })
        uni.showToast({ title: '已加入计划', icon: 'success' })
      } catch (error) {
        uni.showToast({ title: error.message || '加入失败', icon: 'none' })
      }
    },
  })
}

function normalizeRecipe(item, index) {
  return {
    id: item.id,
    title: item.title,
    time: item.cook_time_minutes || 0,
    description: item.description || '还没有填写简介。',
    tags: item.tags || [],
    cover: item.image_urls?.[0] || '',
    tape: ['yellow', 'green', 'pink'][index % 3],
    decor: ['flower', 'leaf', 'star', 'moon'][index % 4],
    canEdit: !!item.can_edit,
  }
}

function today() {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
</script>

<style lang="scss" scoped>
.hero { padding: 34rpx 30rpx; }.eyebrow { color: #9a5d2f; font-size: 24rpx; }.hero-title { display: block; margin-top: 12rpx; color: #3b2718; font-size: 44rpx; font-weight: 700; }.hero-desc { display: block; margin-top: 18rpx; color: #72543d; font-size: 26rpx; line-height: 38rpx; }
.search-card { margin-top: 22rpx; padding: 18rpx; }.search-row { display: flex; align-items: center; }.search-input { flex: 1; height: 74rpx; padding: 0 18rpx; border: 2rpx solid #d9b98d; border-radius: 20rpx; background: #f8e8cf; font-size: 28rpx; }.search-cat { width: 126rpx; height: 82rpx; margin-left: 14rpx; }.tag-scroll,.category-scroll { white-space: nowrap; }.tag-row,.category-row { display: inline-flex; gap: 12rpx; padding-top: 16rpx; }.quick-tag,.category { display: inline-flex; align-items: center; height: 54rpx; padding: 0 24rpx; border: 2rpx solid #cfa46f; border-radius: 18rpx; background: #fff0da; color: #a76225; font-size: 24rpx; }.quick-tag.selected,.category.selected { background: #4b321f; border-color: #4b321f; color: #fff6df; }.plus { width: 30rpx; justify-content: center; border-style: dashed; }
.section-row { display: flex; align-items: center; gap: 16rpx; margin: 26rpx 0; }.category-scroll { flex: 1; min-width: 0; }.category-row { padding-top: 0; }.category { height: 58rpx; color: #70533d; background: #fff9e8; border-color: #d8b98f; }.add-button { width: 186rpx; height: 58rpx; flex: none; display: flex; align-items: center; justify-content: center; gap: 7rpx; border: 2rpx solid #9a5727; border-radius: 22rpx; background: #ee8e36; box-shadow: 0 3rpx 0 #d6a06b; color: #fff6df; font-size: 23rpx; font-weight: 600; }.add-button image { width: 35rpx; height: 35rpx; }
.notice { margin: 0 0 24rpx; padding: 18rpx 22rpx; color: #8a5c38; font-size: 24rpx; }
.recipe-card { position: relative; min-height: 300rpx; margin-bottom: 28rpx; padding: 22rpx 24rpx; display: flex; overflow: visible; }.tape { position: absolute; z-index: 2; top: -26rpx; left: 46rpx; width: 142rpx; height: 66rpx; transform: rotate(-9deg); }.decor { position: absolute; z-index: 3; top: 30rpx; right: 28rpx; width: 74rpx; height: 74rpx; }.cover { width: 270rpx; height: 244rpx; flex: none; border: 2rpx solid #d7b17e; border-radius: 16rpx; background: #f0c993; }.fallback { display: flex; align-items: center; justify-content: center; padding: 20rpx; box-sizing: border-box; color: #a75d23; font-size: 42rpx; text-align: center; font-weight: 700; }.recipe-copy { min-width: 0; flex: 1; padding: 18rpx 60rpx 0 28rpx; }.title-row { display: flex; align-items: center; gap: 10rpx; }.recipe-title { flex: 1; display: block; font-size: 38rpx; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }.edit-link { color: #a76225; font-size: 24rpx; text-decoration: underline; }.time,.description { display: block; margin-top: 10rpx; color: #72543d; font-size: 24rpx; }.description { line-height: 36rpx; }.tags { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 12rpx; }.tags text { padding: 5rpx 11rpx; border-radius: 12rpx; background: #ffe2b5; color: #a76225; font-size: 21rpx; }.card-footer { display: flex; justify-content: flex-end; margin-top: 12rpx; }.plan-button { margin: 0; padding: 0 20rpx; border: 2rpx solid #9a5727; border-radius: 20rpx; background: #ee8e36; color: #fff6df; font-size: 23rpx; }
</style>
