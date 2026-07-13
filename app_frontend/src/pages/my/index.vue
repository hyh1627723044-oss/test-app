<template>
  <view class="page-shell">
    <view class="profile paper-card paper-hero"><image class="tape" src="/static/illustrations/tape-pink.png" mode="aspectFit" /><view class="avatar">我</view><view><text class="eyebrow">我的厨房</text><text class="name">体验用户</text><text class="profile-desc">管理我的菜谱和饮食计划。</text></view><text class="heart">♥</text></view>
    <view class="stats paper-card"><view v-for="item in stats" :key="item.label"><text>{{ item.value }}</text><text>{{ item.label }}</text></view></view>
    <view v-for="item in features" :key="item.title" class="feature paper-card"><image class="feature-tape" :src="`/static/illustrations/tape-${item.tape}.png`" mode="aspectFit" /><image :src="item.image" mode="aspectFit" /><view><text class="feature-title">{{ item.title }}</text><text class="feature-desc">{{ item.desc }}</text></view><text class="arrow">›</text></view>
    <view class="draw paper-card"><image class="feature-tape" src="/static/illustrations/tape-yellow.png" mode="aspectFit" /><text class="eyebrow">选择困难救星</text><text class="draw-title">今天随机吃什么？</text><text class="draw-desc">从我的菜谱里抽一道，可以先按标签缩小池子。</text><view class="mode-row"><text :class="{ active: mode === 'wheel' }" @tap="mode = 'wheel'">转盘</text><text :class="{ active: mode === 'gacha' }" @tap="mode = 'gacha'">扭蛋</text></view><view class="draw-stage"><image :src="mode === 'wheel' ? '/static/illustrations/random-wheel.png' : '/static/illustrations/gacha-machine.png'" mode="aspectFit" /></view><button>开始抽菜</button></view>
    <AppNav active="my" />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import AppNav from '../../components/AppNav.vue'
const mode = ref('wheel')
const stats = [{ value: 3, label: '我的菜谱' }, { value: 2, label: '收藏菜品' }, { value: 2, label: '今日安排' }]
const features = [
  { title: '我的菜谱', desc: '整理自己上传的菜品、封面和标签。', image: '/static/illustrations/my-recipes-pot.png', tape: 'yellow' },
  { title: '饮食计划', desc: '查看今天的早中晚安排。', image: '/static/illustrations/empty-plan.png', tape: 'green' },
  { title: 'AI 推荐', desc: '根据口味和库存推荐菜品。', image: '/static/illustrations/ai-chef.png', tape: 'pink' },
]
</script>

<style lang="scss" scoped>
.profile { position: relative; display: flex; align-items: center; gap: 20rpx; padding: 30rpx; overflow: visible; }.tape,.feature-tape { position: absolute; top: -22rpx; left: 34rpx; width: 128rpx; height: 58rpx; transform: rotate(-7deg); }.avatar { width: 94rpx; height: 94rpx; display: flex; align-items: center; justify-content: center; border: 3rpx solid #6f5137; border-radius: 50%; background: #f5b875; font-size: 38rpx; font-weight: 700; }.eyebrow,.profile-desc,.feature-desc,.draw-desc { display: block; color: #72543d; font-size: 23rpx; }.name { display: block; margin: 6rpx 0; color: #3b2718; font-size: 35rpx; font-weight: 700; }.heart { position: absolute; right: 28rpx; top: 28rpx; color: #e8795a; font-size: 38rpx; }
.stats { display: flex; justify-content: space-around; margin: 24rpx 0; padding: 22rpx; }.stats view { display: flex; flex-direction: column; align-items: center; gap: 8rpx; }.stats text:first-child { color: #a76225; font-size: 36rpx; font-weight: 700; }.stats text:last-child { color: #72543d; font-size: 22rpx; }
.feature { position: relative; display: flex; align-items: center; gap: 18rpx; min-height: 136rpx; margin-bottom: 22rpx; padding: 20rpx 30rpx; overflow: visible; }.feature > image:not(.feature-tape) { width: 94rpx; height: 94rpx; }.feature view { flex: 1; }.feature-title { display: block; font-size: 31rpx; font-weight: 700; }.feature-desc { margin-top: 7rpx; line-height: 32rpx; }.arrow { color: #a76225; font-size: 42rpx; }
.draw { position: relative; margin-top: 30rpx; padding: 34rpx 28rpx; overflow: visible; }.draw-title { display: block; margin: 8rpx 0; font-size: 37rpx; font-weight: 700; }.draw-desc { line-height: 34rpx; }.mode-row { display: flex; gap: 14rpx; margin-top: 20rpx; }.mode-row text { padding: 10rpx 28rpx; border: 2rpx solid #cfa46f; border-radius: 18rpx; color: #a76225; font-size: 24rpx; }.mode-row text.active { border-color: #4b321f; background: #4b321f; color: #fff6df; }.draw-stage { display: flex; justify-content: center; height: 282rpx; margin: 12rpx 0; }.draw-stage image { width: 282rpx; height: 282rpx; }.draw button { border: 2rpx solid #9a5727; border-radius: 24rpx; background: #ee8e36; color: #fff6df; font-size: 28rpx; }
</style>
