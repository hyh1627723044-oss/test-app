# 123213

微信小程序原生页面示例，包含一个手绘风格底部导航的点单首页。

## 项目结构

```text
pages/      微信小程序页面
backend/    FastAPI 后端 API
```

## 预览

使用微信开发者工具导入项目根目录即可预览。

如果没有正式 AppID，可以先使用测试号或游客模式导入。

## 后端开发

后端默认用 Docker 部署，避免在本机安装 Python 依赖。

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
