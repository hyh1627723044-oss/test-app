# 接入微信云开发测试

这份文档用于把当前 MVP 小程序接到微信云开发，完成真实的菜品上传、图片上传、菜谱读取和饮食计划测试。

## 目标

完成后可以测试这些流程：

```text
添加菜品 -> 上传多张封面图 -> 写入 recipes 集合
菜单首页 -> 读取 recipes 集合
菜品详情 -> 读取单个菜品
加入计划 -> 写入 meal_plans / meal_plan_items
计划页 -> 读取当天饮食计划
```

## 1. 导入项目

用微信开发者工具导入项目根目录。

如果还没有正式 AppID，可以先用测试号/游客模式看页面；但要测试云开发，建议使用你自己的小程序 AppID。

## 2. 开通或选择云环境

在微信开发者工具顶部进入：

```text
云开发
```

创建一个云环境，或者选择已有云环境。

如果只有一个云环境，当前 `app.js` 可以不写 `env`。如果有多个云环境，建议显式指定：

```js
wx.cloud.init({
  env: '你的云环境ID',
  traceUser: true
})
```

云环境 ID 可以在云开发控制台里看到。

## 3. 创建数据库集合

在云开发控制台的数据库里创建这些集合：

```text
recipes
meal_plans
meal_plan_items
users
favorites
ai_recommendations
```

MVP 必须先创建：

```text
recipes
meal_plans
meal_plan_items
```

其余集合可以后续功能接入时再使用。

## 4. 上传云函数

项目里已经有这些云函数目录：

```text
cloudfunctions/listRecipes
cloudfunctions/getRecipe
cloudfunctions/createRecipe
cloudfunctions/addMealPlanItem
cloudfunctions/getMealPlan
```

在微信开发者工具里，对每个云函数目录右键：

```text
上传并部署：云端安装依赖
```

上传完成后，可以在云开发控制台的云函数列表里确认它们已存在。

## 5. 数据库权限建议

当前小程序主要通过云函数读写数据库，所以 demo 阶段建议：

```text
小程序端不要直接写数据库
数据库写入走云函数
```

开发测试时，如果读取遇到权限问题，可以先检查：

```text
集合是否存在
云函数是否部署成功
云函数日志是否报错
app.js 是否选中了正确云环境
```

不要长期使用过于开放的数据库权限。等 MVP 流程跑通后，再逐步收紧权限。

## 6. 测试添加菜品

在小程序里进入：

```text
菜单 -> 添加菜品
```

填写菜名、简介、分类、难度、耗时、份量、餐次、标签、食材和做法步骤。

选择多张封面图后点击保存。

预期结果：

```text
图片上传到云存储
createRecipe 云函数创建 recipes 文档
recipes.primary_cover_file_id 保存第一张封面 fileID
recipes.cover_images 保存多张封面 fileID 列表
```

## 7. 测试菜单和详情

回到菜单首页。

预期结果：

```text
listRecipes 云函数返回菜谱列表
点击菜品进入详情页
getRecipe 云函数返回菜品详情
详情页顶部展示封面轮播
```

如果列表没有刷新，可以手动重新编译，或者返回首页重新进入。

## 8. 测试加入计划

在菜品详情页：

```text
选择日期
选择早餐/午餐/下午茶/晚餐/夜宵
点击加入这一天
```

预期结果：

```text
addMealPlanItem 云函数创建或复用当天 meal_plans
addMealPlanItem 写入 meal_plan_items
```

然后进入计划页。

预期结果：

```text
getMealPlan 云函数读取当天计划
计划页按餐次展示菜品
点击计划里的菜可以回到详情页
```

## 9. 本地云函数单元测试

不依赖微信云环境，可以在本地跑：

```bash
npm.cmd run test:cloudfunctions
```

或者：

```bash
node scripts/test-cloudfunctions.js
```

PowerShell 里如果 `npm run ...` 被执行策略拦截，用 `npm.cmd run ...`。

## 10. 常见问题

### wx.cloud 不存在

确认项目使用的是微信小程序环境，并且不是普通浏览器预览。

### 云函数 not found

确认对应云函数已经上传部署，并且 `project.config.json` 里有：

```json
{
  "cloudfunctionRoot": "cloudfunctions/"
}
```

### 上传图片失败

检查：

```text
云开发环境是否开通
云存储是否可用
是否选择了真实图片
开发者工具控制台是否有权限错误
```

### 数据写入了但列表看不到

检查 `recipes` 文档里的：

```text
is_public
owner_openid
updated_at
```

`listRecipes` 会读取公开菜谱和当前用户自己的菜谱。
