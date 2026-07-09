# 云开发数据库设计

当前 demo 以云开发为主线，图片放云存储，数据库只保存 `file_id`。

## collections

### users

```json
{
  "_id": "user_id",
  "openid": "微信 openid",
  "nickname": "体验用户",
  "avatar_url": "",
  "created_at": "2026-07-03T10:00:00+08:00",
  "updated_at": "2026-07-03T10:00:00+08:00"
}
```

### recipes

```json
{
  "_id": "recipe_id",
  "owner_user_id": "user_id",
  "title": "番茄炒蛋",
  "description": "十分钟快手家常菜",
  "primary_cover_file_id": "cloud://env/recipes/openid/recipe_id/cover-001.jpg",
  "cover_images": [
    {
      "file_id": "cloud://env/recipes/openid/recipe_id/cover-001.jpg",
      "sort_order": 1,
      "width": 1200,
      "height": 900
    }
  ],
  "category": "家常菜",
  "meal_types": ["午餐", "晚餐"],
  "tags": ["快手", "家常", "下饭"],
  "difficulty": "简单",
  "cook_time_minutes": 10,
  "servings": 2,
  "calories": 320,
  "ingredients": [
    { "name": "番茄", "amount": "2 个" },
    { "name": "鸡蛋", "amount": "3 个" }
  ],
  "steps": [
    { "order": 1, "text": "番茄切块，鸡蛋打散。" }
  ],
  "is_public": true,
  "source": "user",
  "created_at": "2026-07-03T10:00:00+08:00",
  "updated_at": "2026-07-03T10:00:00+08:00"
}
```

### meal_plans

```json
{
  "_id": "plan_id",
  "user_id": "user_id",
  "plan_date": "2026-07-03",
  "created_at": "2026-07-03T10:00:00+08:00",
  "updated_at": "2026-07-03T10:00:00+08:00"
}
```

### meal_plan_items

```json
{
  "_id": "item_id",
  "meal_plan_id": "plan_id",
  "recipe_id": "recipe_id",
  "meal_slot": "lunch",
  "sort_order": 1,
  "note": "少油",
  "remind_at": "2026-07-03T11:30:00+08:00",
  "reminder_enabled": true,
  "created_at": "2026-07-03T10:05:00+08:00"
}
```

### favorites

```json
{
  "_id": "favorite_id",
  "owner_openid": "微信 openid",
  "recipe_id": "recipe_id",
  "recipe_title": "番茄炒蛋",
  "recipe_primary_cover_file_id": "cloud://env/recipes/openid/recipe_id/cover-001.jpg",
  "created_at": "2026-07-03T10:00:00+08:00"
}
```

### user_tags

```json
{
  "_id": "tag_id",
  "owner_openid": "微信 openid",
  "name": "冰箱清库存",
  "use_count": 1,
  "created_at": "2026-07-03T10:00:00+08:00",
  "updated_at": "2026-07-03T10:00:00+08:00"
}
```

### ai_recommendations

```json
{
  "_id": "recommendation_id",
  "owner_openid": "微信 openid",
  "intent": "recommend_today",
  "payload": {
    "meal_slot": "dinner",
    "taste": "清淡",
    "ingredients": ["番茄", "鸡蛋"]
  },
  "model": "hy3",
  "result": {
    "recommendations": []
  },
  "raw_content": "{}",
  "usage": {},
  "created_at": "2026-07-03T10:00:00+08:00"
}
```

## 云存储路径

```text
recipes/{openid}/{recipe_id}/cover-001.jpg
recipes/{openid}/{recipe_id}/cover-002.jpg
```

列表页使用 `primary_cover_file_id`，详情页轮播使用 `cover_images`。

## 云函数

```text
listRecipes       查询公开菜谱和自己的菜谱
getRecipe         查询菜品详情
createRecipe      创建菜品，保存多张封面 file_id
updateRecipe      更新自己的菜品，并清理被移除的旧封面 file_id
deleteRecipe      软删除自己的菜品，并清理封面图
addMealPlanItem   把菜加入某天某餐
updateMealPlanItem 修改某个计划项的餐次、备注、提醒
deleteMealPlanItem 删除某个计划项
getMealPlan       查询某天计划，并按餐次分组
toggleFavorite    收藏或取消收藏菜品
listFavorites     查询我的收藏
listTags          查询系统标签和我的标签
upsertTag         新增或刷新我的标签
deleteTag         删除我的标签
askAi            统一 AI 调用入口，按 intent 选择提示词并调用混元
```

## AI intents

```text
recommend_today          AI 推荐今天吃什么
generate_plan            AI 生成一天饮食计划，后续接入
recognize_recipe_image   AI 根据图片识别菜品/食材，后续接入
```

`askAi` 使用环境变量读取混元配置，不在前端和代码仓库保存 key：

```text
TENCENT_MAAS_API_KEY
TENCENT_MAAS_BASE_URL=https://tokenhub.tencentmaas.com/v1
TENCENT_MAAS_TEXT_MODEL=hy3
TENCENT_MAAS_VISION_MODEL=hy-vision-2.0-instruct
```

云函数会为 `TENCENT_MAAS_BASE_URL` 自动拼接 `/chat/completions`。旧的 `HUNYUAN_*` 和通用 `AI_*` 环境变量仍可兼容使用。
