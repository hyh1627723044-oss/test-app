const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const recipeId = String(event.id || '').trim()

  if (!recipeId) {
    return fail('RECIPE_ID_REQUIRED', 'id is required')
  }

  const result = await db
    .collection('recipes')
    .doc(recipeId)
    .get()
    .catch(() => null)

  if (!result || !result.data || result.data.is_deleted) {
    return fail('RECIPE_NOT_FOUND', 'recipe not found')
  }

  const recipe = result.data
  if (!recipe.is_public && recipe.owner_openid !== wxContext.OPENID) {
    return fail('RECIPE_FORBIDDEN', 'recipe is not accessible')
  }

  const favoriteResult = await db.collection('favorites')
    .where({
      owner_openid: wxContext.OPENID,
      recipe_id: recipeId
    })
    .limit(1)
    .get()

  return {
    ok: true,
    recipe,
    can_edit: recipe.owner_openid === wxContext.OPENID,
    is_favorited: favoriteResult.data.length > 0
  }
}

function fail(code, message) {
  return {
    ok: false,
    code,
    message
  }
}
