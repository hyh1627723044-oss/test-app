<template>
  <view class="page-shell plan-page">
    <view class="plan-head paper-card paper-hero">
      <image class="head-decor left" src="/static/illustrations/decor-flower.png" mode="aspectFit" />
      <image class="head-decor right" src="/static/illustrations/decor-leaf.png" mode="aspectFit" />
      <text class="eyebrow">今天</text>
      <text class="title">今日计划</text>
      <view class="doodle-underline" />
      <text class="desc">像写手账一样，把想吃的菜排进今天。</text>
      <view class="date-row">
        <button size="mini" class="date-button" @tap="shiftDay(-1)">前一天</button>
        <view class="date-value">{{ planDate }}</view>
        <button size="mini" class="date-button" @tap="shiftDay(1)">后一天</button>
      </view>
    </view>

    <view class="ai-entry paper-soft">
      <image src="/static/illustrations/ai-chef.png" mode="aspectFit" />
      <view>
        <text class="ai-title">AI 帮我排一天</text>
        <text class="ai-desc">说说今天的情况，确认后再加入计划。</text>
      </view>
      <text class="arrow">›</text>
    </view>

    <view v-if="loadError" class="notice paper-soft">
      <text>后端暂时没有连上，正在展示本地示例计划。</text>
    </view>

    <view class="timeline">
      <view v-for="slot in slots" :key="slot.name" class="timeline-row">
        <view class="time-rail">
          <view class="rail-line" />
          <view class="rail-dot" :class="{ filled: slot.items.length }" />
          <text class="slot-time">{{ slot.time }}</text>
          <text class="slot-name">{{ slot.name }}</text>
        </view>

        <view class="slot-note paper-soft">
          <image class="slot-tape" :src="`/static/illustrations/tape-${slot.tape}.png`" mode="aspectFit" />
          <image class="slot-decor" :src="`/static/illustrations/decor-${slot.decor}.png`" mode="aspectFit" />

          <view v-if="slot.items.length" class="planned-list">
            <view v-for="item in slot.items" :key="item.id" class="planned">
              <image v-if="item.recipe_image_url" class="planned-cover" :src="item.recipe_image_url" mode="aspectFill" />
              <view v-else class="planned-cover fallback"><text>{{ item.recipe_title }}</text></view>
              <view class="planned-copy">
                <text class="planned-title">{{ item.recipe_title }}</text>
                <text class="planned-subtitle">已经安排好啦</text>
              </view>
            </view>
          </view>

          <view v-else class="empty-slot">
            <image src="/static/illustrations/empty-plan.png" mode="aspectFit" />
            <view>
              <text class="empty-title">还没安排</text>
              <text class="empty-desc">去菜单挑一道喜欢的菜。</text>
            </view>
          </view>
        </view>
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
.plan-page { padding-left: 24rpx; padding-right: 24rpx; }
.plan-head { position: relative; padding: 34rpx 32rpx 30rpx; overflow: hidden; }
.head-decor { position: absolute; width: 68rpx; height: 68rpx; }
.head-decor.left { top: 22rpx; right: 136rpx; }
.head-decor.right { top: 24rpx; right: 42rpx; }
.eyebrow { color: #a4642e; font-size: 24rpx; font-weight: 700; }
.title { display: block; margin-top: 10rpx; font-size: 50rpx; font-weight: 800; color: #2f2118; }
.desc { display: block; margin-top: 18rpx; color: #6f523c; font-size: 26rpx; line-height: 38rpx; }
.date-row { display: flex; align-items: center; justify-content: space-between; margin-top: 28rpx; }
.date-button,.date-value { margin: 0; border: 2rpx dashed #cda16c; border-radius: 18rpx; background: #fff8df; color: #6f523c; font-size: 24rpx; }
.date-value { min-width: 210rpx; padding: 14rpx 26rpx; text-align: center; border-style: solid; font-weight: 700; }

.ai-entry { display: flex; align-items: center; gap: 16rpx; margin: 24rpx 0 30rpx; padding: 16rpx 20rpx; }
.ai-entry image { width: 92rpx; height: 92rpx; }
.ai-entry view { flex: 1; }
.ai-title,.ai-desc { display: block; }
.ai-title { font-size: 30rpx; font-weight: 800; color: #2f2118; }
.ai-desc { margin-top: 6rpx; color: #7a614e; font-size: 22rpx; }
.arrow { color: #d86f19; font-size: 44rpx; }
.notice { margin: 0 0 24rpx; padding: 18rpx 22rpx; color: #8a5c38; font-size: 24rpx; }

.timeline { position: relative; }
.timeline-row { display: flex; align-items: stretch; margin-bottom: 28rpx; }
.time-rail { position: relative; width: 148rpx; flex: none; padding-top: 20rpx; text-align: center; }
.rail-line { position: absolute; left: 74rpx; top: 0; bottom: -28rpx; width: 3rpx; background: rgba(128, 98, 64, .25); }
.timeline-row:last-child .rail-line { bottom: 52rpx; }
.rail-dot { position: relative; z-index: 1; width: 30rpx; height: 30rpx; margin: 2rpx auto 10rpx; border: 5rpx solid #4a3022; border-radius: 50%; background: #fff9e8; box-shadow: 0 3rpx 0 rgba(138, 84, 41, .18); }
.rail-dot.filled { background: #f6b94d; }
.slot-time { display: block; color: #a4642e; font-size: 24rpx; font-weight: 800; }
.slot-name { display: block; margin-top: 4rpx; color: #2f2118; font-size: 34rpx; font-weight: 800; }

.slot-note { position: relative; flex: 1; min-height: 168rpx; padding: 28rpx 70rpx 24rpx 26rpx; overflow: visible; }
.slot-tape { position: absolute; top: -24rpx; left: 28rpx; width: 120rpx; height: 54rpx; transform: rotate(-6deg); }
.slot-decor { position: absolute; top: 24rpx; right: 24rpx; width: 58rpx; height: 58rpx; }
.planned-list { display: flex; flex-direction: column; gap: 14rpx; }
.planned { display: flex; align-items: center; gap: 16rpx; }
.planned-cover { width: 96rpx; height: 96rpx; flex: none; border: 2rpx solid #d6b17d; border-radius: 16rpx; background: #f2c681; }
.fallback { display: flex; align-items: center; justify-content: center; padding: 8rpx; box-sizing: border-box; color: #a45f26; font-size: 20rpx; text-align: center; font-weight: 700; }
.planned-copy { min-width: 0; }
.planned-title { display: block; color: #2f2118; font-size: 30rpx; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.planned-subtitle { display: block; margin-top: 6rpx; color: #8b735e; font-size: 22rpx; }
.empty-slot { display: flex; align-items: center; gap: 18rpx; min-height: 118rpx; }
.empty-slot image { width: 100rpx; height: 100rpx; opacity: .9; }
.empty-title,.empty-desc { display: block; }
.empty-title { color: #8b735e; font-size: 30rpx; font-weight: 800; }
.empty-desc { margin-top: 6rpx; color: #a3917d; font-size: 22rpx; }
.choose { display: flex; align-items: center; justify-content: space-between; margin-top: 4rpx; padding: 22rpx 26rpx; font-size: 28rpx; font-weight: 800; }
.choose button { margin: 0; border: 2rpx solid #8f4f1f; border-radius: 20rpx; background: #e98225; color: #fff7df; }
</style>
