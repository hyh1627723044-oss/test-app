# Go Backend

这是菜谱 / 饮食计划 App 的 Go 练手后端。原来的 `backend` FastAPI 版本保留，这个目录是新的独立实现。

## 技术选择

- Go standard `net/http`
- PostgreSQL
- `database/sql` + `pgx`
- HMAC bearer token
- Docker / Docker Compose
- Tencent MaaS AI proxy

## 本地启动

```bash
cd go_backend
cp .env.example .env
docker compose up --build
```

服务默认监听：

```text
http://localhost:8080
```

健康检查：

```bash
curl http://localhost:8080/api/health
```

## 开发登录

```bash
curl -X POST http://localhost:8080/api/auth/dev-login \
  -H "Content-Type: application/json" \
  -d '{"openid":"dev-user","nickname":"测试用户","avatar_url":""}'
```

返回的 `access_token` 用于后续请求：

```text
Authorization: Bearer <access_token>
```

## 已有接口

- `GET /api/health`
- `POST /api/auth/dev-login`
- `GET /api/recipes`
- `POST /api/recipes`
- `GET /api/recipes/{id}`
- `PATCH /api/recipes/{id}`
- `DELETE /api/recipes/{id}`
- `GET /api/tags`
- `POST /api/tags`
- `DELETE /api/tags/{id}`
- `GET /api/plans?date=2026-07-14`
- `POST /api/plans/{date}/items`
- `PATCH /api/plans/items/{id}`
- `DELETE /api/plans/items/{id}`
- `GET /api/favorites`
- `PUT /api/favorites/{id}`
- `DELETE /api/favorites/{id}`
- `POST /api/ai/recommend-today`
- `POST /api/ai/recognize-recipe`

## 当前边界

- 这是第一版 Go 骨架，接口形状尽量贴近 FastAPI 版本。
- 数据库迁移现在是启动时 `CREATE TABLE IF NOT EXISTS`，后续可以换成 goose / atlas。
- 图片上传还没有接对象存储，菜谱里先保存 `image_urls` 列表。
- AI key 只放在服务端环境变量 `TENCENT_MAAS_API_KEY`，不要放进 App。
