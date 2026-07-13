import json
import re
from typing import Any

import httpx
from fastapi import HTTPException, status

from app.core.config import settings


def _chat_completion(model: str, messages: list[dict[str, Any]]) -> str:
    if not settings.tencent_maas_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is not configured",
        )
    url = f"{settings.tencent_maas_base_url.rstrip('/')}/chat/completions"
    try:
        response = httpx.post(
            url,
            headers={"Authorization": f"Bearer {settings.tencent_maas_api_key}"},
            json={"model": model, "messages": messages, "stream": False, "temperature": 0.7},
            timeout=45,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
    except (httpx.HTTPError, KeyError, IndexError, TypeError) as error:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI service request failed") from error
    return content.strip()


def _json_object(text: str) -> dict[str, Any]:
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return {}
    try:
        value = json.loads(match.group())
    except json.JSONDecodeError:
        return {}
    return value if isinstance(value, dict) else {}


def recommend_today(message: str, recipes: list[dict[str, Any]]) -> tuple[str, list[int]]:
    recipe_context = json.dumps(recipes, ensure_ascii=False)
    prompt = (
        "你是温暖、实用的家庭饮食助手。根据用户需求，只从候选菜谱中推荐菜品。"
        "先用中文简要说明推荐理由，然后在最后单独输出一行 JSON："
        '{"recipe_ids":[1,2]}。如果没有合适菜谱，recipe_ids 为空数组。\n'
        f"用户需求：{message}\n候选菜谱：{recipe_context}"
    )
    reply = _chat_completion(settings.tencent_maas_text_model, [{"role": "user", "content": prompt}])
    parsed = _json_object(reply)
    recipe_ids = [recipe_id for recipe_id in parsed.get("recipe_ids", []) if isinstance(recipe_id, int)]
    visible_reply = re.sub(r"\n?\{\s*\"recipe_ids\"[\s\S]*?\}\s*$", "", reply).strip()
    return visible_reply or reply, recipe_ids


def recognize_recipe_image(image_url: str) -> dict[str, Any]:
    prompt = (
        "识别这张食物图片，推测适合录入菜谱的信息。只输出 JSON，不要 Markdown。"
        '格式：{"title":"","description":"","ingredients":[""],"suggested_tags":[""],"cook_time_minutes":0}'
    )
    content = [
        {"type": "text", "text": prompt},
        {"type": "image_url", "image_url": {"url": image_url}},
    ]
    raw_reply = _chat_completion(settings.tencent_maas_vision_model, [{"role": "user", "content": content}])
    data = _json_object(raw_reply)
    return {
        "title": str(data.get("title", ""))[:128],
        "description": str(data.get("description", "")),
        "ingredients": [str(item) for item in data.get("ingredients", []) if isinstance(item, str)],
        "suggested_tags": [str(item) for item in data.get("suggested_tags", []) if isinstance(item, str)],
        "cook_time_minutes": max(0, int(data.get("cook_time_minutes", 0) or 0)),
        "raw_reply": raw_reply,
    }
