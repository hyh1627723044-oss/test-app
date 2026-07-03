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

  if (!result || !result.data) {
    return fail('RECIPE_NOT_FOUND', 'recipe not found')
  }

  const recipe = result.data
  if (!recipe.is_public && recipe.owner_openid !== wxContext.OPENID) {
    return fail('RECIPE_FORBIDDEN', 'recipe is not accessible')
  }

  return {
    ok: true,
    recipe
  }
}

function fail(code, message) {
  return {
    ok: false,
    code,
    message
  }
}
