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
  const isAdmin = await checkAdmin(wxContext.OPENID)
  if (recipe.owner_openid !== wxContext.OPENID && !isAdmin) {
    return fail('RECIPE_FORBIDDEN', 'recipe cannot be managed')
  }

  await db.collection('recipes').doc(recipeId).update({
    data: {
      is_deleted: true,
      deleted_at: new Date(),
      updated_at: new Date()
    }
  })

  await cleanupRecipeFiles(recipe)

  return { ok: true, id: recipeId }
}

async function checkAdmin(openid) {
  const result = await db.collection('admins')
    .where({ openid, role: 'admin' })
    .limit(1)
    .get()
    .catch(() => ({ data: [] }))
  return result.data.some((item) => item.is_active !== false)
}

async function cleanupRecipeFiles(recipe) {
  if (typeof cloud.deleteFile !== 'function') return
  const fromImages = Array.isArray(recipe.cover_images) ? recipe.cover_images : []
  const fileList = fromImages
    .filter((image) => image && image.file_id)
    .map((image) => image.file_id)
  if (recipe.primary_cover_file_id) {
    fileList.push(recipe.primary_cover_file_id)
  }
  const uniqueFileList = Array.from(new Set(fileList))
  if (uniqueFileList.length === 0) return
  await cloud.deleteFile({ fileList: uniqueFileList }).catch(() => null)
}

function fail(code, message) {
  return { ok: false, code, message }
}
