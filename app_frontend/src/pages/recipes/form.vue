<template>
  <view class="page-shell">
    <view class="form-head paper-card paper-hero">
      <text class="eyebrow">{{ isEdit ? '编辑菜谱' : '上传菜谱' }}</text>
      <text class="title">{{ isEdit ? '把这道菜改得更准确' : '记录一道新菜' }}</text>
      <view class="doodle-underline" />
      <text class="desc">先把主信息填好，图片可以上传多张，第一张会作为封面。</text>
    </view>

    <view class="form-card paper-card">
      <label class="field">
        <text>菜名</text>
        <input v-model="form.title" placeholder="比如 番茄炒蛋" />
      </label>

      <label class="field">
        <text>简介</text>
        <textarea v-model="form.description" auto-height placeholder="这道菜是什么口味、适合什么场景？" />
      </label>

      <label class="field">
        <text>预计耗时（分钟）</text>
        <input v-model.number="form.cook_time_minutes" type="number" placeholder="15" />
      </label>

      <label class="field">
        <text>食材</text>
        <textarea v-model="ingredientsText" auto-height placeholder="一行一个，比如：番茄&#10;鸡蛋&#10;葱花" />
      </label>

      <view class="field">
        <view class="field-title-row">
          <text>菜品图片</text>
          <text class="hint">最多 9 张</text>
        </view>
        <view class="image-grid">
          <view v-for="(image, index) in images" :key="image" class="image-cell">
            <image :src="image" mode="aspectFill" />
            <text class="remove" @tap="removeImage(index)">×</text>
          </view>
          <view v-if="images.length < 9" class="image-cell add" @tap="chooseImages">
            <image src="/static/illustrations/upload-recipe.png" mode="aspectFit" />
            <text>上传</text>
          </view>
        </view>
      </view>

      <view class="public-row">
        <view>
          <text class="public-title">公开到首页</text>
          <text class="public-desc">关闭后只有自己和管理员能看到。</text>
        </view>
        <switch :checked="form.is_public" color="#ee8e36" @change="form.is_public = $event.detail.value" />
      </view>
    </view>

    <view class="actions">
      <button class="ghost" @tap="goBack">取消</button>
      <button class="primary" :loading="saving" @tap="saveRecipe">{{ isEdit ? '保存修改' : '保存菜谱' }}</button>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { createRecipe, getRecipe, updateRecipe, uploadImage } from '../../services/api'

const recipeId = ref('')
const saving = ref(false)
const ingredientsText = ref('')
const images = ref([])
const form = ref({
  title: '',
  description: '',
  cook_time_minutes: 15,
  ingredients: [],
  image_urls: [],
  tag_ids: [],
  is_public: true,
})

const isEdit = computed(() => !!recipeId.value)

onLoad((query) => {
  recipeId.value = query?.id || ''
  if (recipeId.value) loadRecipe(recipeId.value)
})

async function loadRecipe(id) {
  try {
    const recipe = await getRecipe(id)
    form.value = {
      title: recipe.title || '',
      description: recipe.description || '',
      cook_time_minutes: recipe.cook_time_minutes || 15,
      ingredients: recipe.ingredients || [],
      image_urls: recipe.image_urls || [],
      tag_ids: recipe.tag_ids || [],
      is_public: recipe.is_public !== false,
    }
    ingredientsText.value = form.value.ingredients.join('\n')
    images.value = [...form.value.image_urls]
  } catch (error) {
    uni.showToast({ title: error.message || '加载失败', icon: 'none' })
  }
}

function chooseImages() {
  uni.chooseImage({
    count: Math.max(1, 9 - images.value.length),
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: ({ tempFilePaths }) => {
      images.value = [...images.value, ...tempFilePaths].slice(0, 9)
    },
  })
}

function removeImage(index) {
  images.value.splice(index, 1)
}

async function saveRecipe() {
  const title = form.value.title.trim()
  if (!title) {
    uni.showToast({ title: '先写菜名', icon: 'none' })
    return
  }

  saving.value = true
  try {
    const uploaded = []
    for (const image of images.value) {
      if (/^https?:\/\//.test(image)) {
        uploaded.push(image)
      } else {
        const result = await uploadImage(image)
        uploaded.push(result.url)
      }
    }

    const payload = {
      title,
      description: form.value.description.trim(),
      cook_time_minutes: Number(form.value.cook_time_minutes) || 0,
      ingredients: ingredientsText.value.split('\n').map((item) => item.trim()).filter(Boolean),
      image_urls: uploaded,
      tag_ids: form.value.tag_ids,
      is_public: form.value.is_public,
    }

    if (isEdit.value) {
      await updateRecipe(recipeId.value, payload)
      uni.showToast({ title: '已保存', icon: 'success' })
    } else {
      await createRecipe(payload)
      uni.showToast({ title: '已添加', icon: 'success' })
    }
    setTimeout(() => uni.navigateBack(), 350)
  } catch (error) {
    uni.showToast({ title: error.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function goBack() {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.form-head { padding: 34rpx 30rpx; }.eyebrow { color: #9a5d2f; font-size: 24rpx; }.title { display: block; margin-top: 12rpx; color: #3b2718; font-size: 44rpx; font-weight: 700; }.desc { display: block; margin-top: 18rpx; color: #72543d; font-size: 26rpx; line-height: 38rpx; }
.form-card { margin-top: 24rpx; padding: 26rpx; }.field { display: block; margin-bottom: 26rpx; }.field text,.field-title-row text:first-child { display: block; margin-bottom: 12rpx; color: #4b321f; font-size: 27rpx; font-weight: 700; }.field input,.field textarea { width: 100%; box-sizing: border-box; min-height: 72rpx; padding: 18rpx; border: 2rpx solid #d7b88f; border-radius: 18rpx; background: #fffaf0; color: #3b2718; font-size: 27rpx; line-height: 38rpx; }.field textarea { min-height: 116rpx; }
.field-title-row { display: flex; align-items: baseline; justify-content: space-between; }.field-title-row .hint { margin: 0; color: #9a7658; font-size: 22rpx; font-weight: 400; }
.image-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14rpx; }.image-cell { position: relative; height: 190rpx; border: 2rpx dashed #d7b88f; border-radius: 18rpx; overflow: hidden; background: #fff0d2; }.image-cell image { width: 100%; height: 100%; }.image-cell.add { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8rpx; color: #a76225; font-size: 24rpx; }.image-cell.add image { width: 92rpx; height: 92rpx; }.remove { position: absolute; top: 8rpx; right: 8rpx; width: 42rpx; height: 42rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: rgba(75, 50, 31, .78); color: #fff6df; font-size: 32rpx; line-height: 38rpx; }
.public-row { display: flex; align-items: center; justify-content: space-between; padding-top: 4rpx; }.public-title,.public-desc { display: block; }.public-title { color: #4b321f; font-size: 28rpx; font-weight: 700; }.public-desc { margin-top: 8rpx; color: #72543d; font-size: 23rpx; }
.actions { display: flex; gap: 18rpx; margin-top: 28rpx; padding-bottom: 28rpx; }.actions button { flex: 1; height: 78rpx; border-radius: 24rpx; font-size: 28rpx; }.ghost { border: 2rpx dashed #d7b88f; background: #fff9e8; color: #72543d; }.primary { border: 2rpx solid #9a5727; background: #ee8e36; color: #fff6df; }
</style>
