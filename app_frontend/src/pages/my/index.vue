<template>
  <view class="page-shell my-page">
    <view class="profile paper-card paper-hero">
      <image class="tape" src="/static/illustrations/tape-pink.png" mode="aspectFit" />
      <view class="avatar">我</view>
      <view class="profile-copy">
        <text class="eyebrow">我的厨房</text>
        <text class="name">体验用户</text>
        <text class="profile-desc">收好自己的菜谱，也留一点随机的快乐。</text>
      </view>
      <text class="heart">♡</text>
    </view>

    <view class="kitchen-section paper-card">
      <image class="section-tape" src="/static/illustrations/tape-yellow.png" mode="aspectFit" />
      <view class="section-head">
        <view>
          <text class="section-kicker">我的菜谱</text>
          <text class="section-title">厨房小本子</text>
        </view>
        <image src="/static/illustrations/my-recipes-pot.png" mode="aspectFit" />
      </view>
      <view class="stats-row">
        <view v-for="item in stats" :key="item.label">
          <text>{{ item.value }}</text>
          <text>{{ item.label }}</text>
        </view>
      </view>
      <view class="action-row">
        <button class="primary">管理菜谱</button>
        <button class="ghost">上传新菜</button>
      </view>
    </view>

    <view class="draw-section paper-card">
      <image class="section-tape" src="/static/illustrations/tape-green.png" mode="aspectFit" />
      <view class="draw-head">
        <view>
          <text class="section-kicker">随机选菜</text>
          <text class="section-title">今天交给运气</text>
        </view>
        <image src="/static/illustrations/gacha-capsule.png" mode="aspectFit" />
      </view>
      <text class="draw-desc">从我的菜谱里抽一道，可以先按标签缩小池子。</text>
      <view class="mode-row">
        <text :class="{ active: mode === 'wheel' }" @tap="mode = 'wheel'">转盘</text>
        <text :class="{ active: mode === 'gacha' }" @tap="mode = 'gacha'">扭蛋</text>
      </view>
      <view class="draw-stage">
        <image :src="mode === 'wheel' ? '/static/illustrations/random-wheel.png' : '/static/illustrations/gacha-machine.png'" mode="aspectFit" />
      </view>
      <button class="draw-button">开始抽菜</button>
    </view>

    <view class="mini-links">
      <view v-for="item in links" :key="item.title" class="mini-link paper-soft">
        <image :src="item.image" mode="aspectFit" />
        <view>
          <text>{{ item.title }}</text>
          <text>{{ item.desc }}</text>
        </view>
      </view>
    </view>
    <AppNav active="my" />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import AppNav from '../../components/AppNav.vue'

const mode = ref('wheel')
const stats = [
  { value: 3, label: '我的菜谱' },
  { value: 2, label: '收藏' },
  { value: 2, label: '今日安排' },
]
const links = [
  { title: '饮食计划', desc: '查看今天安排', image: '/static/illustrations/empty-plan.png' },
  { title: 'AI 推荐', desc: '按口味推荐', image: '/static/illustrations/ai-chef.png' },
]
</script>

<style lang="scss" scoped>
.my-page { padding-left: 26rpx; padding-right: 26rpx; }
.profile { position: relative; display: flex; align-items: center; gap: 20rpx; padding: 32rpx; overflow: visible; }
.tape,.section-tape { position: absolute; top: -24rpx; left: 34rpx; width: 132rpx; height: 60rpx; transform: rotate(-7deg); }
.avatar { width: 96rpx; height: 96rpx; display: flex; align-items: center; justify-content: center; border: 3rpx solid #4a3022; border-radius: 50%; background: #f4ad5d; color: #3a2619; font-size: 38rpx; font-weight: 800; }
.profile-copy { flex: 1; min-width: 0; }
.eyebrow,.profile-desc,.section-kicker,.draw-desc { display: block; color: #71533d; font-size: 23rpx; }
.name { display: block; margin: 6rpx 0; color: #2f2118; font-size: 36rpx; font-weight: 800; }
.heart { position: absolute; right: 28rpx; top: 28rpx; color: #dc7453; font-size: 38rpx; }

.kitchen-section,.draw-section { position: relative; margin-top: 30rpx; padding: 34rpx 28rpx 28rpx; overflow: visible; }
.section-head,.draw-head { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; }
.section-head image { width: 116rpx; height: 96rpx; }
.draw-head image { width: 96rpx; height: 96rpx; }
.section-kicker { color: #a4642e; font-weight: 700; }
.section-title { display: block; margin-top: 8rpx; color: #2f2118; font-size: 40rpx; font-weight: 800; }
.stats-row { display: flex; justify-content: space-between; gap: 14rpx; margin-top: 24rpx; }
.stats-row view { flex: 1; padding: 16rpx 8rpx; border: 2rpx dashed #d2aa75; border-radius: 18rpx; background: #fff4d5; text-align: center; }
.stats-row text:first-child { display: block; color: #d86f19; font-size: 36rpx; font-weight: 800; }
.stats-row text:last-child { display: block; margin-top: 4rpx; color: #71533d; font-size: 21rpx; }
.action-row { display: flex; gap: 16rpx; margin-top: 24rpx; }
.action-row button,.draw-button { height: 76rpx; border-radius: 24rpx; font-size: 28rpx; font-weight: 700; }
.action-row button { flex: 1; }
.primary,.draw-button { border: 2rpx solid #8f4f1f; background: #e98225; color: #fff7df; }
.ghost { border: 2rpx dashed #cda16c; background: #fff9e8; color: #71533d; }

.draw-section { background: #fff9e8; }
.draw-desc { margin-top: 14rpx; line-height: 34rpx; }
.mode-row { display: flex; gap: 14rpx; margin-top: 22rpx; }
.mode-row text { padding: 10rpx 30rpx; border: 2rpx solid #cfa46f; border-radius: 18rpx; color: #a76225; background: #fff4d5; font-size: 24rpx; font-weight: 700; }
.mode-row text.active { border-color: #4a3022; background: #4a3022; color: #fff7df; }
.draw-stage { display: flex; justify-content: center; height: 282rpx; margin: 12rpx 0 16rpx; }
.draw-stage image { width: 282rpx; height: 282rpx; }
.draw-button { width: 100%; }

.mini-links { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18rpx; margin-top: 24rpx; }
.mini-link { display: flex; align-items: center; gap: 12rpx; padding: 16rpx; }
.mini-link image { width: 72rpx; height: 72rpx; flex: none; }
.mini-link text:first-child { display: block; color: #2f2118; font-size: 26rpx; font-weight: 800; }
.mini-link text:last-child { display: block; margin-top: 4rpx; color: #8b735e; font-size: 20rpx; }
</style>
