<template>
  <view class="app-nav">
    <image class="nav-edge" src="/static/illustrations/nav-torn-edge.png" mode="scaleToFill" />
    <view v-for="item in items" :key="item.id" class="nav-item" :class="{ active: active === item.id }" @tap="go(item.path)">
      <image class="nav-icon" :src="item.icon" mode="aspectFit" />
      <text class="nav-label">{{ item.label }}</text>
      <view class="active-mark" />
    </view>
  </view>
</template>

<script setup>
defineProps({ active: { type: String, required: true } })

const items = [
  { id: 'recipes', label: '菜单', icon: '/static/illustrations/tab-recipes.png', path: '/pages/recipes/index' },
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
  height: 164rpx;
  padding: 10rpx 44rpx calc(18rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  background: #fff2cf;
  box-shadow: 0 -10rpx 22rpx rgba(112, 70, 38, .16);
}
.nav-edge {
  position: absolute;
  top: -24rpx;
  left: 0;
  width: 100%;
  height: 34rpx;
  pointer-events: none;
}
.nav-item {
  position: relative;
  width: 150rpx;
  height: 134rpx;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  opacity: .64;
  transition: transform .16s ease, opacity .16s ease;
}
.nav-item:active { transform: translateY(2rpx); }
.nav-item.active {
  opacity: 1;
  transform: translateY(-8rpx);
}
.nav-icon {
  width: 104rpx;
  height: 88rpx;
}
.nav-label {
  margin-top: 2rpx;
  color: #6d523f;
  font-size: 32rpx;
  line-height: 38rpx;
  font-weight: 700;
}
.nav-item.active .nav-label { color: #d86f19; }
.active-mark {
  width: 88rpx;
  height: 12rpx;
  margin-top: 2rpx;
  border-radius: 99rpx;
  background: transparent;
  transform: rotate(-3deg);
}
.nav-item.active .active-mark {
  background: #f5bf5a;
  box-shadow: 0 2rpx 0 rgba(120, 72, 34, .18);
}
</style>
