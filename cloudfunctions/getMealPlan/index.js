const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const planDate = String(event.plan_date || '').trim()

  if (!planDate) {
    return {
      ok: false,
      code: 'PLAN_DATE_REQUIRED',
      message: 'plan_date is required'
    }
  }

  const planResult = await db
    .collection('meal_plans')
    .where({
      owner_openid: wxContext.OPENID,
      plan_date: planDate
    })
    .limit(1)
    .get()

  if (planResult.data.length === 0) {
    return {
      ok: true,
      plan: null,
      items: [],
      slots: buildSlots([])
    }
  }

  const plan = planResult.data[0]
  const itemsResult = await db
    .collection('meal_plan_items')
    .where({
      meal_plan_id: plan._id,
      owner_openid: wxContext.OPENID
    })
    .orderBy('sort_order', 'asc')
    .get()

  const items = itemsResult.data

  return {
    ok: true,
    plan,
    items,
    slots: buildSlots(items)
  }
}

function buildSlots(items) {
  const slots = [
    { id: 'breakfast', name: '早餐', items: [] },
    { id: 'lunch', name: '午餐', items: [] },
    { id: 'afternoon_tea', name: '下午茶', items: [] },
    { id: 'dinner', name: '晚餐', items: [] },
    { id: 'night_snack', name: '夜宵', items: [] }
  ]
  const slotMap = slots.reduce((map, slot) => {
    map[slot.id] = slot
    return map
  }, {})

  items.forEach((item) => {
    const slot = slotMap[item.meal_slot]
    if (slot) {
      slot.items.push(item)
    }
  })

  return slots
}
