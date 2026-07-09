const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  try {
    return await toggleFavorite(event)
  } catch (error) {
    console.error('[toggleFavorite] unexpected error', error)
    return fail(resolveDatabaseErrorCode(error), error.message || 'toggle favorite failed')
  }
}

async function toggleFavorite(event) {
  const wxContext = cloud.getWXContext()
  const recipeId = String(event.recipe_id || event.id || '').trim()
  const action = String(event.action || 'toggle')

  if (!recipeId) {
    return fail('RECIPE_ID_REQUIRED', 'recipe_id is required')
  }

  const recipeResult = await db.collection('recipes').doc(recipeId).get().catch(() => null)
  if (!recipeResult || !recipeResult.data || recipeResult.data.is_deleted) {
    return fail('RECIPE_NOT_FOUND', 'recipe not found')
  }

  const recipe = recipeResult.data
  if (!recipe.is_public && recipe.owner_openid !== wxContext.OPENID) {
    return fail('RECIPE_FORBIDDEN', 'recipe is not accessible')
  }

  const found = await db.collection('favorites').where({ owner_openid: wxContext.OPENID, recipe_id: recipeId }).limit(1).get()
  const exists = found.data.length > 0

  if (action === 'remove' || (action === 'toggle' && exists)) {
    if (exists) {
      await db.collection('favorites').doc(found.data[0]._id).remove()
    }
    return { ok: true, favorited: false }
  }

  if (!exists) {
    await db.collection('favorites').add({
      data: {
        owner_openid: wxContext.OPENID,
        recipe_id: recipeId,
        recipe_title: recipe.title || '',
        recipe_primary_cover_file_id: recipe.primary_cover_file_id || '',
        created_at: new Date()
      }
    })
  }

  return { ok: true, favorited: true }
}

function resolveDatabaseErrorCode(error) {
  const message = String(error && error.message || '')
  if (/collection|not exist|not found|DATABASE_COLLECTION_NOT_EXIST/i.test(message)) {
    return 'COLLECTION_NOT_FOUND'
  }
  return 'DATABASE_ERROR'
}

function fail(code, message) {
  return { ok: false, code, message }
}
