# 123213

微信小程序原生菜谱菜单 demo，包含菜谱浏览、菜品详情、添加菜品和饮食计划页面。

## 项目结构

```text
pages/      微信小程序页面
cloudfunctions/ 云开发函数
docs/       设计文档
backend/    FastAPI 后端 API
```

## 预览

使用微信开发者工具导入项目根目录即可预览。

如果没有正式 AppID，可以先使用测试号或游客模式导入。

## 云开发

当前 demo 主线使用微信云开发：

```text
recipes
meal_plans
meal_plan_items
favorites
user_tags
ai_recommendations
users
```

图片上传到云存储，菜谱集合保存 `primary_cover_file_id` 和 `cover_images`。详细字段见 `docs/cloud-database.md`。

接入微信云开发测试步骤见 `docs/wechat-cloud-test.md`。

如果你的微信开发者工具里有多个云环境，可以在 `app.js` 的 `wx.cloud.init` 里显式指定 `env`。

已放入云函数：

```text
listRecipes
getRecipe
createRecipe
updateRecipe
deleteRecipe
addMealPlanItem
updateMealPlanItem
deleteMealPlanItem
getMealPlan
toggleFavorite
listFavorites
listTags
upsertTag
deleteTag
askAi
```

AI 云函数默认使用混元 OpenAI 兼容接口，密钥不写入代码。开通后在云函数环境变量里配置：

```text
HUNYUAN_API_KEY
HUNYUAN_API_URL=https://api.hunyuan.cloud.tencent.com/v1/chat/completions
HUNYUAN_TEXT_MODEL=hunyuan-turbos-latest
HUNYUAN_VISION_MODEL=hunyuan-vision
```

本地单元测试：

```bash
npm run test:cloudfunctions
```

## 后端开发

`backend/` 是后续自建 API 的备选方案，demo 阶段可以先不启用。

```bash
docker compose up --build
```

启动后访问：

```text
http://127.0.0.1:8000/docs
```

如果你确实想本地直接跑 Python：

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
