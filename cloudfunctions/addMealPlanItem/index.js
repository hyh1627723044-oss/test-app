const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const now = new Date()
  const planDate = String(event.plan_date || '').trim()
  const mealSlot = String(event.meal_slot || '').trim()
  const recipeId = String(event.recipe_id || '').trim()

  if (!planDate) {
    return fail('PLAN_DATE_REQUIRED', 'plan_date is required')
  }
  if (!mealSlot) {
    return fail('MEAL_SLOT_REQUIRED', 'meal_slot is required')
  }
  if (!recipeId) {
    return fail('RECIPE_ID_REQUIRED', 'recipe_id is required')
  }

  const recipeResult = await db
    .collection('recipes')
    .doc(recipeId)
    .get()
    .catch(() => null)

  if (!recipeResult || !recipeResult.data || recipeResult.data.is_deleted) {
    return fail('RECIPE_NOT_FOUND', 'recipe not found')
  }

  const recipe = recipeResult.data
  if (!recipe.is_public && recipe.owner_openid !== wxContext.OPENID) {
    return fail('RECIPE_FORBIDDEN', 'recipe is not accessible')
  }

  const planResult = await db
    .collection('meal_plans')
    .where({
      owner_openid: wxContext.OPENID,
      plan_date: planDate
    })
    .limit(1)
    .get()

  let mealPlanId = ''
  if (planResult.data.length > 0) {
    mealPlanId = planResult.data[0]._id
  } else {
    const created = await db.collection('meal_plans').add({
      data: {
        owner_openid: wxContext.OPENID,
        plan_date: planDate,
        created_at: now,
        updated_at: now
      }
    })
    mealPlanId = created._id
  }

  const item = await db.collection('meal_plan_items').add({
    data: {
      owner_openid: wxContext.OPENID,
      meal_plan_id: mealPlanId,
      recipe_id: recipeId,
      recipe_title: recipe.title || '',
      recipe_primary_cover_file_id: recipe.primary_cover_file_id || '',
      meal_slot: mealSlot,
      sort_order: Number(event.sort_order || 1),
      note: event.note || '',
      remind_at: event.remind_at || '',
      reminder_enabled: Boolean(event.reminder_enabled),
      created_at: now,
      updated_at: now
    }
  })

  return {
    ok: true,
    meal_plan_id: mealPlanId,
    item_id: item._id
  }
}

function fail(code, message) {
  return {
    ok: false,
    code,
    message
  }
}
