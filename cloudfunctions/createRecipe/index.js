const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const now = new Date()
  const title = String(event.title || '').trim()

  if (!title) {
    return fail('TITLE_REQUIRED', 'title is required')
  }

  const coverImages = normalizeCoverImages(event.cover_images || [])
  const primaryCover = event.primary_cover_file_id || (
    coverImages.length > 0 ? coverImages[0].file_id : ''
  )

  const payload = {
    owner_openid: wxContext.OPENID,
    title,
    description: String(event.description || '').trim(),
    primary_cover_file_id: primaryCover,
    cover_images: coverImages,
    category: String(event.category || 'home_cooking'),
    meal_types: normalizeStringList(event.meal_types || []),
    tags: normalizeStringList(event.tags || []),
    difficulty: String(event.difficulty || 'easy'),
    cook_time_minutes: toNumber(event.cook_time_minutes, 0),
    servings: toNumber(event.servings, 1),
    calories: toNumber(event.calories, 0),
    ingredients: normalizeIngredients(event.ingredients || []),
    steps: normalizeSteps(event.steps || []),
    is_public: Boolean(event.is_public),
    source: 'user',
    created_at: now,
    updated_at: now
  }

  const result = await db.collection('recipes').add({ data: payload })
  await syncUserTags(wxContext.OPENID, payload.tags)
  return {
    ok: true,
    id: result._id
  }
}

async function syncUserTags(openid, tags) {
  const now = new Date()
  for (const tag of tags) {
    const found = await db.collection('user_tags')
      .where({ owner_openid: openid, name: tag })
      .limit(1)
      .get()
    if (found.data.length > 0) {
      await db.collection('user_tags').doc(found.data[0]._id).update({
        data: { updated_at: now }
      })
    } else {
      await db.collection('user_tags').add({
        data: {
          owner_openid: openid,
          name: tag,
          use_count: 1,
          created_at: now,
          updated_at: now
        }
      })
    }
  }
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
  return ingredients
    .filter((item) => item && item.name)
    .map((item) => ({
      name: String(item.name).trim(),
      amount: String(item.amount || '').trim()
    }))
}

function normalizeSteps(steps) {
  if (!Array.isArray(steps)) return []
  return steps
    .filter((item) => item && item.text)
    .map((item, index) => ({
      order: Number(item.order || index + 1),
      text: String(item.text).trim()
    }))
    .sort((a, b) => a.order - b.order)
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
  return {
    ok: false,
    code,
    message
  }
}
