const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const DEFAULT_API_BASE_URL = 'https://tokenhub.tencentmaas.com/v1'
const DEFAULT_TEXT_MODEL = 'hy3'
const DEFAULT_VISION_MODEL = 'hy-vision-2.0-instruct'
const AI_REQUEST_TIMEOUT_MS = 50000

const INTENTS = {
  recommend_today: {
    modelType: 'text',
    responseShape: {
      assistant_message: 'string in Simplified Chinese',
      recommendations: [
        {
          title: 'string in Simplified Chinese',
          reason: 'string in Simplified Chinese',
          tags: ['string in Simplified Chinese'],
          meal_slot: 'breakfast|lunch|afternoon_tea|dinner|night_snack',
          cook_time_minutes: 'number',
          difficulty: 'easy|normal|hard'
        }
      ]
    },
    systemPrompt: [
      'You are a warm and practical home cooking menu assistant.',
      'Recommend simple everyday dishes based on meal slot, taste, available ingredients, avoid list, and people count.',
      'Respond naturally to the latest user message and use prior conversation context when provided.',
      'Do not provide medical or therapeutic nutrition advice.',
      'All user-facing strings in the JSON must be Simplified Chinese.',
      'Return strict JSON only. No Markdown. No extra explanation.'
    ].join(' '),
    userPrompt(payload) {
      return [
        'Respond to the user and recommend up to 3 suitable dishes.',
        'The JSON shape must be:',
        JSON.stringify(this.responseShape),
        'User conditions:',
        JSON.stringify({
          user_message: String(payload.user_message || ''),
          conversation_history: normalizeHistory(payload.history),
          meal_slot: payload.meal_slot || 'dinner',
          taste: payload.taste || '',
          ingredients: normalizeStringList(payload.ingredients || []),
          avoid: normalizeStringList(payload.avoid || []),
          people_count: Number(payload.people_count || 1),
          preferred_tags: normalizeStringList(payload.preferred_tags || []),
          existing_recipe_titles: normalizeStringList(payload.existing_recipe_titles || [])
        })
      ].join('\n')
    }
  },
  generate_plan: {
    modelType: 'text',
    responseShape: {
      assistant_message: 'string in Simplified Chinese',
      plan_date: 'YYYY-MM-DD',
      slots: [
        { meal_slot: 'breakfast|lunch|afternoon_tea|dinner|night_snack', recipe_id: 'id from existing_recipes', title: 'string in Simplified Chinese', reason: 'string in Simplified Chinese' }
      ]
    },
    systemPrompt: [
      'You are a home meal planning assistant.',
      'Generate recommendations only for requested_meal_slots when that list is not empty.',
      'If requested_meal_slots contains only dinner, return dinner only. Never add breakfast or lunch to make a full-day plan.',
      'Only generate a full-day plan when the user explicitly asks for a whole day, or when requested_meal_slots is empty.',
      'Use only recipes supplied in existing_recipes.',
      'Every slot must preserve the exact recipe id from existing_recipes. Never invent recipe ids.',
      'Respond naturally to the latest user message before presenting the plan.',
      'All user-facing strings in the JSON must be Simplified Chinese.',
      'Return strict JSON only. No Markdown.'
    ].join(' '),
    userPrompt(payload) {
      return [
        'Generate meal recommendations using only existing_recipes.',
        'The JSON shape must be:',
        JSON.stringify(this.responseShape),
        'User conditions:',
        JSON.stringify({
          user_message: String(payload.user_message || ''),
          conversation_history: normalizeHistory(payload.history),
          plan_date: payload.plan_date || '',
          requested_meal_slots: detectRequestedMealSlots(payload.user_message),
          taste: payload.taste || '',
          avoid: normalizeStringList(payload.avoid || []),
          existing_recipes: Array.isArray(payload.existing_recipes) ? payload.existing_recipes.slice(0, 30) : []
        })
      ].join('\n')
    }
  },
  recognize_recipe_image: {
    modelType: 'vision',
    responseShape: {
      title: 'string in Simplified Chinese',
      description: 'string in Simplified Chinese',
      category: 'home_cooking|breakfast|drink|dessert|light_meal',
      difficulty: 'easy|normal|hard',
      cook_time_minutes: 'positive integer estimate',
      servings: 'positive integer estimate',
      meal_types: ['breakfast|lunch|afternoon_tea|dinner|night_snack'],
      tags: ['string in Simplified Chinese'],
      calories: 'non-negative integer kcal estimate per serving',
      ingredients: [{ name: 'string in Simplified Chinese', amount: 'string in Simplified Chinese' }],
      steps: ['short cooking step in Simplified Chinese'],
      confidence: 'low|medium|high'
    },
    systemPrompt: [
      'You are a dish and ingredient image recognition assistant.',
      'Fill a recipe form from the image: title, description, category, difficulty, cooking time, servings, suitable meal types, tags, calories, ingredients, and steps.',
      'Use only the enum values provided in the requested JSON shape.',
      'Cooking time, servings, calories, ingredient amounts, and steps are estimates. Keep them conservative and practical.',
      'If the dish is uncertain, lower confidence and avoid overly specific claims.',
      'Do not provide medical or therapeutic nutrition advice.',
      'All user-facing strings in the JSON must be Simplified Chinese.',
      'Return strict JSON only. No Markdown.'
    ].join(' '),
    userPrompt(payload) {
      return [
        { type: 'text', text: [
          'Recognize this food image and fill every field in the recipe form.',
          'The JSON shape must be:',
          JSON.stringify(this.responseShape),
          'Prefer concise steps and common Chinese home-cooking measurements.',
          'User note: ' + String(payload.note || '')
        ].join('\n') },
        { type: 'image_url', image_url: { url: String(payload.image_url || '') } }
      ]
    }
  }
}

exports.main = async (event) => {
  try {
    return await askAi(event)
  } catch (error) {
    console.error('[askAi] unexpected error', error)
    return fail('AI_REQUEST_FAILED', error.message || 'AI request failed')
  }
}

async function askAi(event) {
  const wxContext = cloud.getWXContext()
  const intent = String(event.intent || '').trim()
  const payload = event.payload && typeof event.payload === 'object' ? event.payload : {}
  const config = INTENTS[intent]

  if (!config) {
    return fail('AI_INTENT_UNSUPPORTED', 'unsupported ai intent')
  }

  if (config.modelType === 'vision' && !payload.image_url) {
    return fail('AI_IMAGE_URL_REQUIRED', 'image_url is required for vision intent')
  }

  const apiKey = process.env.TENCENT_MAAS_API_KEY || process.env.HUNYUAN_API_KEY || process.env.AI_API_KEY || ''
  if (!apiKey) {
    return fail('AI_NOT_CONFIGURED', 'TENCENT_MAAS_API_KEY is not configured')
  }

  if (config.modelType === 'vision') {
    payload.image_url = await resolveImageUrl(payload.image_url)
  }

  const apiUrl = resolveApiUrl()
  const model = selectModel(config.modelType)
  const messages = buildMessages(config, payload)

  const startedAt = new Date()
  const aiResult = await callChatCompletion({
    apiUrl,
    apiKey,
    model,
    messages,
    forceJsonResponse: config.modelType !== 'vision'
  })
  const parsed = parseJsonContent(aiResult.content)

  await saveAiRecord({
    owner_openid: wxContext.OPENID,
    intent,
    payload,
    model,
    result: parsed,
    raw_content: aiResult.content,
    usage: aiResult.usage,
    created_at: startedAt
  })

  return {
    ok: true,
    intent,
    model,
    result: parsed,
    raw_content: aiResult.content,
    usage: aiResult.usage || null
  }
}

function selectModel(modelType) {
  if (modelType === 'vision') {
    return process.env.TENCENT_MAAS_VISION_MODEL || process.env.HUNYUAN_VISION_MODEL || process.env.AI_VISION_MODEL || DEFAULT_VISION_MODEL
  }
  return process.env.TENCENT_MAAS_TEXT_MODEL || process.env.HUNYUAN_TEXT_MODEL || process.env.AI_TEXT_MODEL || DEFAULT_TEXT_MODEL
}

function resolveApiUrl() {
  const configuredUrl = process.env.TENCENT_MAAS_BASE_URL ||
    process.env.HUNYUAN_API_URL ||
    process.env.AI_API_URL ||
    DEFAULT_API_BASE_URL
  const normalizedUrl = configuredUrl.replace(/\/+$/, '')
  return normalizedUrl.endsWith('/chat/completions')
    ? normalizedUrl
    : normalizedUrl + '/chat/completions'
}

function buildMessages(config, payload) {
  return [
    { role: 'system', content: config.systemPrompt },
    { role: 'user', content: config.userPrompt(payload) }
  ]
}

async function resolveImageUrl(imageUrl) {
  const value = String(imageUrl || '')
  if (!value.startsWith('cloud://')) return value
  const result = await cloud.getTempFileURL({ fileList: [value] })
  const file = result.fileList && result.fileList[0]
  if (!file || !file.tempFileURL) {
    throw new Error('failed to resolve cloud image url')
  }
  return file.tempFileURL
}

function callChatCompletion({ apiUrl, apiKey, model, messages, forceJsonResponse }) {
  const url = new URL(apiUrl)
  const payload = {
    model,
    messages,
    temperature: 0.7
  }

  if (forceJsonResponse) {
    payload.response_format = { type: 'json_object' }
  }

  const body = JSON.stringify(payload)

  const options = {
    method: 'POST',
    hostname: url.hostname,
    path: url.pathname + url.search,
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error('AI request failed: ' + res.statusCode + ' ' + data))
          return
        }
        try {
          const json = JSON.parse(data)
          const content = json.choices && json.choices[0] && json.choices[0].message
            ? json.choices[0].message.content
            : ''
          resolve({ content, usage: json.usage || null })
        } catch (error) {
          reject(error)
        }
      })
    })

    req.on('error', reject)
    req.setTimeout(AI_REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error('AI_UPSTREAM_TIMEOUT'))
    })
    req.write(body)
    req.end()
  })
}

function parseJsonContent(content) {
  const text = String(content || '').trim()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch (error) {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return { text }
    try {
      return JSON.parse(match[0])
    } catch (innerError) {
      return { text }
    }
  }
}

async function saveAiRecord(record) {
  await db.collection('ai_recommendations').add({ data: record }).catch(() => null)
}

function normalizeStringList(list) {
  if (!Array.isArray(list)) return []
  return list.map((item) => String(item).trim()).filter(Boolean)
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return []
  return history.slice(-10).map((item) => ({
    role: item && item.role === 'assistant' ? 'assistant' : 'user',
    content: String(item && item.content || '').slice(0, 500)
  })).filter((item) => item.content)
}

function detectRequestedMealSlots(message) {
  const text = String(message || '').toLowerCase()
  if (/全天|一整天|一天的|整日|full day|whole day/.test(text)) return []
  const slots = []
  if (/早餐|早饭|早晨|breakfast/.test(text)) slots.push('breakfast')
  if (/午餐|午饭|中午|lunch/.test(text)) slots.push('lunch')
  if (/下午茶|茶点|afternoon tea/.test(text)) slots.push('afternoon_tea')
  if (/晚餐|晚饭|晚上|dinner|supper/.test(text)) slots.push('dinner')
  if (/夜宵|宵夜|夜间加餐|night snack/.test(text)) slots.push('night_snack')
  return slots
}

function fail(code, message) {
  return { ok: false, code, message }
}
