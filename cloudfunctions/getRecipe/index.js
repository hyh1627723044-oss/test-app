const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  try {
    return await getRecipe(event)
  } catch (error) {
    console.error('[getRecipe] unexpected error', error)
    return fail('DATABASE_ERROR', error.message || 'get recipe failed')
  }
}

async function getRecipe(event) {
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
  const isAdmin = await checkAdmin(wxContext.OPENID)
  const canEdit = recipe.owner_openid === wxContext.OPENID || isAdmin
  if (!recipe.is_public && !canEdit) {
    return fail('RECIPE_FORBIDDEN', 'recipe is not accessible')
  }

  const favoriteResult = await db.collection('favorites')
    .where({
      owner_openid: wxContext.OPENID,
      recipe_id: recipeId
    })
    .limit(1)
    .get()
    .catch((error) => {
      console.error('[getRecipe] favorite lookup failed', error)
      return { data: [] }
    })

  return {
    ok: true,
    recipe: Object.assign({}, recipe, { id: recipe._id || recipeId }),
    can_edit: canEdit,
    can_delete: canEdit,
    is_admin: isAdmin,
    is_favorited: favoriteResult.data.length > 0
  }
}

async function checkAdmin(openid) {
  const result = await db.collection('admins')
    .where({ openid, role: 'admin' })
    .limit(1)
    .get()
    .catch(() => ({ data: [] }))
  return result.data.some((item) => item.is_active !== false)
}

function fail(code, message) {
  return {
    ok: false,
    code,
    message
  }
}
