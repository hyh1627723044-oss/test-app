<template>
  <view class="app-nav">
    <image class="nav-edge" src="/static/illustrations/nav-torn-edge.png" mode="scaleToFill" />
    <view v-for="item in items" :key="item.id" class="nav-item" :class="{ active: active === item.id }" @tap="go(item.path)">
      <image class="nav-icon" :src="item.icon" mode="aspectFit" />
      <text class="nav-label">{{ item.label }}</text>
    </view>
  </view>
</template>

<script setup>
defineProps({ active: { type: String, required: true } })

const items = [
  { id: 'recipes', label: '菜谱', icon: '/static/illustrations/tab-recipes.png', path: '/pages/recipes/index' },
  { id: 'plan', label: '计划', icon: '/static/illustrations/tab-plan.png', path: '/pages/plan/index' },
  { id: 'my', label: '我的', icon: '/static/illustrations/tab-my.png', path: '/pages/my/index' },
]

function go(path) {
  uni.reLaunch({ url: path })
}
</script>

<style lang="scss" scoped>
.app-nav {
  position: fixed;
  z-index: 1000;
  left: 0;
  right: 0;
  bottom: 0;
  height: 188rpx;
  padding: 14rpx 42rpx 22rpx;
  box-sizing: border-box;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  background: #fff6df;
  box-shadow: 0 -8rpx 18rpx rgba(112, 70, 38, 0.08);
}
.nav-edge { position: absolute; top: -20rpx; left: 0; width: 100%; height: 26rpx; pointer-events: none; }
.nav-item { position: relative; width: 160rpx; height: 150rpx; border-radius: 34rpx; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; opacity: .58; }
.nav-item.active { opacity: 1; background: #f6bd67; }
.nav-icon { width: 108rpx; height: 92rpx; }
.nav-label { margin-top: 4rpx; color: #6f5137; font-size: 34rpx; line-height: 40rpx; font-weight: 600; }
</style>
