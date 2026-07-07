const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const itemId = String(event.item_id || event.id || '').trim()

  if (!itemId) {
    return fail('ITEM_ID_REQUIRED', 'item_id is required')
  }

  const result = await db.collection('meal_plan_items').doc(itemId).get().catch(() => null)
  if (!result || !result.data) {
    return fail('ITEM_NOT_FOUND', 'meal plan item not found')
  }

  if (result.data.owner_openid !== wxContext.OPENID) {
    return fail('ITEM_FORBIDDEN', 'meal plan item is not yours')
  }

  await db.collection('meal_plan_items').doc(itemId).remove()
  return { ok: true, item_id: itemId }
}

function fail(code, message) {
  return { ok: false, code, message }
}
