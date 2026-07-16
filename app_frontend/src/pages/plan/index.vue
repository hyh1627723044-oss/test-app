<template>
  <view class="page-shell">
    <view class="plan-head paper-card paper-hero">
      <image class="head-decor left" src="/static/illustrations/decor-flower.png" mode="aspectFit" />
      <image class="head-decor right" src="/static/illustrations/decor-leaf.png" mode="aspectFit" />
      <text class="eyebrow">今天</text>
      <text class="title">今日计划</text>
      <view class="doodle-underline" />
      <text class="desc">把想吃的菜安排到早餐、午餐、晚餐，也可以加下午茶和夜宵。</text>
      <view class="date-row">
        <button size="mini" class="date-button" @tap="shiftDay(-1)">前一天</button>
        <view class="date-value">{{ planDate }}</view>
        <button size="mini" class="date-button" @tap="shiftDay(1)">后一天</button>
      </view>
    </view>

    <view class="ai-entry paper-card">
      <image src="/static/illustrations/ai-chef.png" mode="aspectFit" />
      <view>
        <text class="ai-title">AI 帮我排一天</text>
        <text class="ai-desc">说说今天的情况，确认后再加入计划。</text>
      </view>
      <text class="arrow">›</text>
    </view>

    <view v-if="loadError" class="notice paper-card">
      <text>后端暂时没有连上，正在展示本地示例计划。</text>
    </view>

    <view v-for="slot in slots" :key="slot.name" class="slot-card paper-card">
      <image class="slot-tape" :src="`/static/illustrations/tape-${slot.tape}.png`" mode="aspectFit" />
      <image class="slot-decor" :src="`/static/illustrations/decor-${slot.decor}.png`" mode="aspectFit" />
      <view class="slot-label">
        <text class="slot-time">{{ slot.time }}</text>
        <text class="slot-name">{{ slot.name }}</text>
        <text>今日便签</text>
      </view>
      <view v-if="slot.items.length" class="planned-list">
        <view v-for="item in slot.items" :key="item.id" class="planned">
          <image v-if="item.recipe_image_url" class="planned-cover" :src="item.recipe_image_url" mode="aspectFill" />
          <view v-else class="planned-cover fallback"><text>{{ item.recipe_title }}</text></view>
          <view class="recipe-pill">{{ item.recipe_title }}</view>
        </view>
      </view>
      <view v-else class="empty-slot">
        <image src="/static/illustrations/empty-plan.png" mode="aspectFit" />
        <text>还没安排</text>
      </view>
    </view>
    <view class="choose paper-card" @tap="goRecipes">
      <text>还想加一道？</text>
      <button size="mini">去选菜</button>
    </view>
    <AppNav active="plan" />
  </view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import AppNav from '../../components/AppNav.vue'
import { getPlan } from '../../services/api'

const currentDate = ref(new Date())
const loadError = ref('')
const planItems = ref([])
const slotMeta = [
  { name: '早餐', time: '08:00', tape: 'yellow', decor: 'flower' },
  { name: '午餐', time: '12:00', tape: 'green', decor: 'leaf' },
  { name: '下午茶', time: '15:30', tape: 'pink', decor: 'star' },
  { name: '晚餐', time: '18:30', tape: 'green', decor: 'moon' },
  { name: '夜宵', time: '21:30', tape: 'yellow', decor: 'moon' },
]

const planDate = computed(() => formatDate(currentDate.value))
const slots = computed(() => slotMeta.map((slot) => ({
  ...slot,
  items: planItems.value.filter((item) => item.meal_slot === slot.name),
})))

onMounted(loadPlan)

async function loadPlan() {
  try {
    const plan = await getPlan(planDate.value)
    planItems.value = plan.items || []
    loadError.value = ''
  } catch (error) {
    loadError.value = error.message
    planItems.value = [
      { id: 'mock-1', meal_slot: '午餐', recipe_title: '番茄炒蛋', recipe_image_url: '' },
      { id: 'mock-2', meal_slot: '晚餐', recipe_title: '香煎豆腐', recipe_image_url: '' },
    ]
  }
}

function shiftDay(offset) {
  const next = new Date(currentDate.value)
  next.setDate(next.getDate() + offset)
  currentDate.value = next
  loadPlan()
}

function goRecipes() {
  uni.reLaunch({ url: '/pages/recipes/index' })
}

function formatDate(date) {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}
</script>

<style lang="scss" scoped>
.plan-head { position: relative; padding: 32rpx 30rpx; overflow: hidden; }.head-decor { position: absolute; width: 66rpx; height: 66rpx; }.head-decor.left { top: 18rpx; right: 132rpx; }.head-decor.right { top: 22rpx; right: 38rpx; }.eyebrow { color: #9a5d2f; font-size: 24rpx; }.title { display: block; margin-top: 10rpx; font-size: 48rpx; font-weight: 700; }.desc { display: block; margin-top: 18rpx; color: #72543d; font-size: 26rpx; line-height: 38rpx; }.date-row { display: flex; align-items: center; justify-content: space-between; margin-top: 26rpx; }.date-button,.date-value { margin: 0; border: 2rpx dashed #d7b88f; border-radius: 18rpx; background: #fff9e8; color: #72543d; font-size: 24rpx; }.date-value { padding: 14rpx 34rpx; border-style: solid; }
.ai-entry { display: flex; align-items: center; gap: 16rpx; margin: 24rpx 0; padding: 16rpx 20rpx; }.ai-entry image { width: 92rpx; height: 92rpx; }.ai-entry view { flex: 1; }.ai-title,.ai-desc { display: block; }.ai-title { font-size: 30rpx; font-weight: 700; }.ai-desc { margin-top: 6rpx; color: #72543d; font-size: 22rpx; }.arrow { color: #a76225; font-size: 42rpx; }
.notice { margin: 0 0 24rpx; padding: 18rpx 22rpx; color: #8a5c38; font-size: 24rpx; }
.slot-card { position: relative; display: flex; min-height: 156rpx; margin-bottom: 24rpx; overflow: visible; }.slot-tape { position: absolute; top: -20rpx; left: 46rpx; width: 128rpx; height: 54rpx; }.slot-decor { position: absolute; top: 26rpx; right: 28rpx; width: 62rpx; height: 62rpx; }.slot-label { width: 176rpx; flex: none; padding: 28rpx 18rpx; box-sizing: border-box; border-right: 2rpx dashed #d7b88f; background: #fff0d2; color: #aa7a4d; }.slot-label text { display: block; }.slot-time { font-size: 24rpx; font-weight: 600; }.slot-name { margin: 4rpx 0; color: #3b2718; font-size: 38rpx; font-weight: 700; }.slot-label text:last-child { font-size: 21rpx; }.empty-slot,.planned-list { flex: 1; display: flex; align-items: center; gap: 18rpx; padding: 18rpx 74rpx 18rpx 22rpx; }.planned-list { flex-direction: column; align-items: stretch; justify-content: center; }.planned { display: flex; align-items: center; gap: 14rpx; }.empty-slot image { width: 108rpx; height: 108rpx; }.empty-slot text { color: #ad9c8a; font-size: 30rpx; }.planned-cover { width: 92rpx; height: 92rpx; border: 2rpx solid #d7b17e; border-radius: 12rpx; background: #f0c993; }.fallback { display: flex; align-items: center; justify-content: center; color: #a75d23; font-size: 20rpx; text-align: center; }.recipe-pill { display: inline-flex; padding: 12rpx 20rpx; border: 2rpx solid #cab875; border-radius: 22rpx; background: #e9e1af; font-size: 25rpx; white-space: nowrap; }.choose { display: flex; align-items: center; justify-content: space-between; margin-top: 12rpx; padding: 22rpx; font-size: 28rpx; font-weight: 600; }.choose button { margin: 0; border: 2rpx solid #9a5727; border-radius: 20rpx; background: #ee8e36; color: #fff6df; }
</style>
