const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const recipeId = String(event.id || event.recipe_id || '').trim()

  if (!recipeId) {
    return fail('RECIPE_ID_REQUIRED', 'recipe id is required')
  }

  const result = await db.collection('recipes').doc(recipeId).get().catch(() => null)
  if (!result || !result.data || result.data.is_deleted) {
    return fail('RECIPE_NOT_FOUND', 'recipe not found')
  }

  const recipe = result.data
  if (recipe.owner_openid !== wxContext.OPENID) {
    return fail('RECIPE_FORBIDDEN', 'recipe is not yours')
  }

  const coverImages = normalizeCoverImages(event.cover_images || recipe.cover_images || [])
  const primaryCover = event.primary_cover_file_id || (
    coverImages.length > 0 ? coverImages[0].file_id : ''
  )

  const payload = {
    title: String(event.title || recipe.title || '').trim(),
    description: String(event.description || '').trim(),
    primary_cover_file_id: primaryCover,
    cover_images: coverImages,
    category: String(event.category || recipe.category || 'home_cooking'),
    meal_types: normalizeStringList(event.meal_types || []),
    tags: normalizeStringList(event.tags || []),
    difficulty: String(event.difficulty || recipe.difficulty || 'easy'),
    cook_time_minutes: toNumber(event.cook_time_minutes, 0),
    servings: toNumber(event.servings, 1),
    calories: toNumber(event.calories, 0),
    ingredients: normalizeIngredients(event.ingredients || []),
    steps: normalizeSteps(event.steps || []),
    is_public: Boolean(event.is_public),
    updated_at: new Date()
  }

  if (!payload.title) {
    return fail('TITLE_REQUIRED', 'title is required')
  }

  await db.collection('recipes').doc(recipeId).update({ data: payload })
  await syncUserTags(wxContext.OPENID, payload.tags)
  await cleanupRemovedFiles(recipe.cover_images || [], coverImages)

  return { ok: true, id: recipeId }
}

async function syncUserTags(openid, tags) {
  const now = new Date()
  for (const tag of tags) {
    const found = await db.collection('user_tags').where({ owner_openid: openid, name: tag }).limit(1).get()
    if (found.data.length > 0) {
      await db.collection('user_tags').doc(found.data[0]._id).update({ data: { updated_at: now } })
    } else {
      await db.collection('user_tags').add({ data: { owner_openid: openid, name: tag, use_count: 1, created_at: now, updated_at: now } })
    }
  }
}

async function cleanupRemovedFiles(oldImages, nextImages) {
  const oldIds = normalizeCoverImages(oldImages).map((image) => image.file_id)
  const nextSet = new Set(normalizeCoverImages(nextImages).map((image) => image.file_id))
  const removed = oldIds.filter((fileId) => fileId && !nextSet.has(fileId))
  if (removed.length === 0 || typeof cloud.deleteFile !== 'function') return
  await cloud.deleteFile({ fileList: removed }).catch(() => null)
}

function normalizeCoverImages(images) {
  if (!Array.isArray(images)) return []
  return images
    .filter((image) => image && image.file_id)
    .map((image, index) => ({
      file_id: image.file_id,
      sort_order: Number(image.sort_order || index + 1),
      width: Number(image.width || 0),
      height: Number(image.height || 0)
    }))
    .sort((a, b) => a.sort_order - b.sort_order)
}

function normalizeIngredients(ingredients) {
  if (!Array.isArray(ingredients)) return []
  return ingredients.filter((item) => item && item.name).map((item) => ({ name: String(item.name).trim(), amount: String(item.amount || '').trim() }))
}

function normalizeSteps(steps) {
  if (!Array.isArray(steps)) return []
  return steps.filter((item) => item && item.text).map((item, index) => ({ order: Number(item.order || index + 1), text: String(item.text).trim() })).sort((a, b) => a.order - b.order)
}

function normalizeStringList(list) {
  if (!Array.isArray(list)) return []
  return Array.from(new Set(list.map((item) => String(item).trim()).filter(Boolean)))
}

function toNumber(value, fallback) {
  const number = Number(value)
  return Number.isNaN(number) ? fallback : number
}

function fail(code, message) {
  return { ok: false, code, message }
}
