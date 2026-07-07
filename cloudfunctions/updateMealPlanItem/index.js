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

  const item = result.data
  if (item.owner_openid !== wxContext.OPENID) {
    return fail('ITEM_FORBIDDEN', 'meal plan item is not yours')
  }

  const data = { updated_at: new Date() }
  if (event.meal_slot !== undefined) data.meal_slot = String(event.meal_slot || '').trim()
  if (event.sort_order !== undefined) data.sort_order = Number(event.sort_order || 1)
  if (event.note !== undefined) data.note = String(event.note || '').trim()
  if (event.remind_at !== undefined) data.remind_at = String(event.remind_at || '').trim()
  if (event.reminder_enabled !== undefined) data.reminder_enabled = Boolean(event.reminder_enabled)

  await db.collection('meal_plan_items').doc(itemId).update({ data })
  return { ok: true, item_id: itemId }
}

function fail(code, message) {
  return { ok: false, code, message }
}
