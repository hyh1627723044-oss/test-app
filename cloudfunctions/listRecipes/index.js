const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const limit = clamp(Number(event.limit || 30), 1, 50)
  const keyword = String(event.keyword || '').trim()
  const category = String(event.category || '').trim()
  const mealType = String(event.meal_type || '').trim()

  const where = _.or([
    { is_public: true },
    { owner_openid: cloud.getWXContext().OPENID }
  ])

  const filters = [where]
  if (category) {
    filters.push({ category })
  }
  if (mealType) {
    filters.push({ meal_types: mealType })
  }

  const result = await db
    .collection('recipes')
    .where(filters.length === 1 ? filters[0] : _.and(filters))
    .orderBy('updated_at', 'desc')
    .limit(limit)
    .get()

  const recipes = keyword
    ? result.data.filter((recipe) => {
      const title = recipe.title || ''
      const description = recipe.description || ''
      const tags = Array.isArray(recipe.tags) ? recipe.tags.join(' ') : ''
      return (title + ' ' + description + ' ' + tags).indexOf(keyword) >= 0
    })
    : result.data

  return {
    recipes
  }
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min
  return Math.max(min, Math.min(max, value))
}
