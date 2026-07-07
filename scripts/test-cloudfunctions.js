const assert = require('node:assert/strict')
const Module = require('node:module')
const path = require('node:path')

const collections = {
  recipes: [],
  meal_plans: [],
  meal_plan_items: [],
  favorites: [],
  user_tags: []
}

let currentOpenid = 'openid-user-1'
let idCounter = 1
let deletedFiles = []

const command = {
  or(conditions) {
    return { __op: 'or', conditions }
  },
  and(conditions) {
    return { __op: 'and', conditions }
  }
}

const cloudMock = {
  DYNAMIC_CURRENT_ENV: 'test-env',
  init() {},
  database() {
    return dbMock
  },
  getWXContext() {
    return { OPENID: currentOpenid }
  },
  async deleteFile({ fileList }) {
    deletedFiles = deletedFiles.concat(fileList || [])
    return { fileList: fileList || [] }
  }
}

const dbMock = {
  command,
  collection(name) {
    if (!collections[name]) {
      collections[name] = []
    }
    return new Query(name)
  }
}

class Query {
  constructor(name) {
    this.name = name
    this.filters = []
    this.order = null
    this.limitCount = null
  }

  where(condition) {
    this.filters.push(condition)
    return this
  }

  orderBy(field, direction) {
    this.order = { field, direction }
    return this
  }

  limit(count) {
    this.limitCount = count
    return this
  }

  doc(id) {
    return {
      get: async () => {
        const item = collections[this.name].find((record) => record._id === id)
        if (!item) throw new Error('document not found')
        return { data: clone(item) }
      },
      update: async ({ data }) => {
        const index = collections[this.name].findIndex((record) => record._id === id)
        if (index < 0) throw new Error('document not found')
        collections[this.name][index] = { ...collections[this.name][index], ...clone(data) }
        return { stats: { updated: 1 } }
      },
      remove: async () => {
        const index = collections[this.name].findIndex((record) => record._id === id)
        if (index < 0) throw new Error('document not found')
        collections[this.name].splice(index, 1)
        return { stats: { removed: 1 } }
      }
    }
  }

  async add({ data }) {
    const _id = this.name + '_' + idCounter++
    collections[this.name].push({ _id, ...clone(data) })
    return { _id }
  }

  async get() {
    let data = collections[this.name].filter((record) => {
      return this.filters.every((condition) => matches(record, condition))
    })

    if (this.order) {
      const { field, direction } = this.order
      data = data.slice().sort((a, b) => {
        const left = a[field]
        const right = b[field]
        if (left === right) return 0
        const result = left > right ? 1 : -1
        return direction === 'desc' ? -result : result
      })
    }

    if (typeof this.limitCount === 'number') {
      data = data.slice(0, this.limitCount)
    }

    return { data: clone(data) }
  }
}

const originalLoad = Module._load
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'wx-server-sdk') {
    return cloudMock
  }
  return originalLoad.call(this, request, parent, isMain)
}

async function main() {
  resetDb()

  const createRecipe = loadCloudFunction('createRecipe')
  const updateRecipe = loadCloudFunction('updateRecipe')
  const deleteRecipe = loadCloudFunction('deleteRecipe')
  const getRecipe = loadCloudFunction('getRecipe')
  const listRecipes = loadCloudFunction('listRecipes')
  const addMealPlanItem = loadCloudFunction('addMealPlanItem')
  const updateMealPlanItem = loadCloudFunction('updateMealPlanItem')
  const deleteMealPlanItem = loadCloudFunction('deleteMealPlanItem')
  const getMealPlan = loadCloudFunction('getMealPlan')
  const toggleFavorite = loadCloudFunction('toggleFavorite')
  const listFavorites = loadCloudFunction('listFavorites')
  const listTags = loadCloudFunction('listTags')
  const upsertTag = loadCloudFunction('upsertTag')
  const deleteTag = loadCloudFunction('deleteTag')

  const invalidRecipe = await createRecipe.main({})
  assert.equal(invalidRecipe.ok, false)
  assert.equal(invalidRecipe.code, 'TITLE_REQUIRED')

  const created = await createRecipe.main({
    title: 'Tomato Egg',
    description: 'quick recipe',
    cover_images: [
      { file_id: 'cloud://cover-2.jpg', sort_order: 2, width: 800, height: 600 },
      { file_id: 'cloud://cover-1.jpg', sort_order: 1, width: 1200, height: 900 }
    ],
    category: 'home_cooking',
    meal_types: ['lunch', 'dinner'],
    tags: ['quick', 'family', 'quick'],
    ingredients: [{ name: 'Bad', amount: '2?' }],
    steps: [{ order: 1, text: 'Bad' }],
    is_public: true
  })

  assert.equal(created.ok, true)
  const recipeId = created.id
  const storedRecipe = collections.recipes.find((recipe) => recipe._id === recipeId)
  assert.equal(storedRecipe.primary_cover_file_id, 'cloud://cover-1.jpg')
  assert.equal(storedRecipe.cover_images[0].file_id, 'cloud://cover-1.jpg')
  assert.equal(storedRecipe.owner_openid, 'openid-user-1')
  assert.deepEqual(storedRecipe.tags, ['quick', 'family'])
  assert.equal(collections.user_tags.length, 2)

  const tagCreated = await upsertTag.main({ name: 'Tomato Egg' })
  assert.equal(tagCreated.ok, true)
  const tags = await listTags.main({})
  assert.equal(tags.ok, true)
  assert.equal(tags.tags.includes('Tomato Egg'), true)
  const tagDeleted = await deleteTag.main({ name: 'Tomato Egg' })
  assert.equal(tagDeleted.ok, true)

  const detail = await getRecipe.main({ id: recipeId })
  assert.equal(detail.ok, true)
  assert.equal(detail.recipe.title, 'Tomato Egg')
  assert.equal(detail.can_edit, true)
  assert.equal(detail.is_favorited, false)

  const listed = await listRecipes.main({ meal_type: 'lunch', keyword: 'Tomato' })
  assert.equal(listed.recipes.length, 1)
  assert.equal(listed.recipes[0]._id, recipeId)

  const listedByTag = await listRecipes.main({ keyword: 'family' })
  assert.equal(listedByTag.recipes.length, 1)
  assert.equal(listedByTag.recipes[0]._id, recipeId)

  const favorited = await toggleFavorite.main({ recipe_id: recipeId })
  assert.equal(favorited.ok, true)
  assert.equal(favorited.favorited, true)
  const favoriteDetail = await getRecipe.main({ id: recipeId })
  assert.equal(favoriteDetail.is_favorited, true)
  const favorites = await listFavorites.main({})
  assert.equal(favorites.favorites.length, 1)
  const unfavorited = await toggleFavorite.main({ recipe_id: recipeId })
  assert.equal(unfavorited.favorited, false)
  assert.equal(collections.favorites.length, 0)

  const addedPlanItem = await addMealPlanItem.main({
    recipe_id: recipeId,
    plan_date: '2026-07-03',
    meal_slot: 'lunch',
    reminder_enabled: true
  })
  assert.equal(addedPlanItem.ok, true)
  assert.equal(collections.meal_plans.length, 1)
  assert.equal(collections.meal_plan_items.length, 1)
  assert.equal(collections.meal_plan_items[0].recipe_title, 'Tomato Egg')

  const plan = await getMealPlan.main({ plan_date: '2026-07-03' })
  assert.equal(plan.ok, true)
  const lunch = plan.slots.find((slot) => slot.id === 'lunch')
  assert.equal(lunch.items.length, 1)
  assert.equal(lunch.items[0].recipe_id, recipeId)

  const updatedPlanItem = await updateMealPlanItem.main({
    item_id: addedPlanItem.item_id,
    meal_slot: 'dinner',
    note: 'Bad'
  })
  assert.equal(updatedPlanItem.ok, true)
  assert.equal(collections.meal_plan_items[0].meal_slot, 'dinner')
  assert.equal(collections.meal_plan_items[0].note, 'Bad')

  const removedPlanItem = await deleteMealPlanItem.main({ item_id: addedPlanItem.item_id })
  assert.equal(removedPlanItem.ok, true)
  assert.equal(collections.meal_plan_items.length, 0)

  const updatedRecipe = await updateRecipe.main({
    id: recipeId,
    title: 'Tomato Egg Noodle',
    cover_images: [{ file_id: 'cloud://cover-1.jpg', sort_order: 1 }],
    tags: ['noodle'],
    is_public: true
  })
  assert.equal(updatedRecipe.ok, true)
  assert.equal(collections.recipes[0].title, 'Tomato Egg Noodle')
  assert.equal(deletedFiles.includes('cloud://cover-2.jpg'), true)

  const privateRecipe = await createRecipe.main({
    title: 'Soup',
    is_public: false
  })
  assert.equal(privateRecipe.ok, true)

  currentOpenid = 'openid-user-2'
  const forbidden = await getRecipe.main({ id: privateRecipe.id })
  assert.equal(forbidden.ok, false)
  assert.equal(forbidden.code, 'RECIPE_FORBIDDEN')
  const forbiddenUpdate = await updateRecipe.main({ id: recipeId, title: 'Bad' })
  assert.equal(forbiddenUpdate.ok, false)
  assert.equal(forbiddenUpdate.code, 'RECIPE_FORBIDDEN')

  currentOpenid = 'openid-user-1'
  const deletedRecipe = await deleteRecipe.main({ id: recipeId })
  assert.equal(deletedRecipe.ok, true)
  assert.equal(collections.recipes[0].is_deleted, true)
  const afterDeleteList = await listRecipes.main({ keyword: '' })
  assert.equal(afterDeleteList.recipes.some((recipe) => recipe._id === recipeId), false)

  console.log('cloud function unit tests passed')
}

function loadCloudFunction(name) {
  const file = path.resolve(__dirname, '..', 'cloudfunctions', name, 'index.js')
  delete require.cache[file]
  return require(file)
}

function resetDb() {
  Object.keys(collections).forEach((key) => {
    collections[key] = []
  })
  currentOpenid = 'openid-user-1'
  idCounter = 1
  deletedFiles = []
}

function matches(record, condition) {
  if (!condition || Object.keys(condition).length === 0) return true

  if (condition.__op === 'or') {
    return condition.conditions.some((child) => matches(record, child))
  }
  if (condition.__op === 'and') {
    return condition.conditions.every((child) => matches(record, child))
  }

  return Object.entries(condition).every(([field, expected]) => {
    const actual = record[field]
    if (Array.isArray(actual)) {
      return actual.includes(expected)
    }
    return actual === expected
  })
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
