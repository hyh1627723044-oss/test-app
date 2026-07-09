const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const DEFAULT_API_BASE_URL = 'https://tokenhub.tencentmaas.com/v1'
const DEFAULT_TEXT_MODEL = 'hy3'
const DEFAULT_VISION_MODEL = 'hy-vision-2.0-instruct'

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
        { meal_slot: 'breakfast', recipe_id: 'id from existing_recipes', title: 'string in Simplified Chinese', reason: 'string in Simplified Chinese' },
        { meal_slot: 'lunch', recipe_id: 'id from existing_recipes', title: 'string in Simplified Chinese', reason: 'string in Simplified Chinese' },
        { meal_slot: 'dinner', recipe_id: 'id from existing_recipes', title: 'string in Simplified Chinese', reason: 'string in Simplified Chinese' }
      ]
    },
    systemPrompt: [
      'You are a home meal planning assistant.',
      'Generate a one-day meal plan using only recipes supplied in existing_recipes.',
      'Every slot must preserve the exact recipe id from existing_recipes. Never invent recipe ids.',
      'Respond naturally to the latest user message before presenting the plan.',
      'All user-facing strings in the JSON must be Simplified Chinese.',
      'Return strict JSON only. No Markdown.'
    ].join(' '),
    userPrompt(payload) {
      return [
        'Generate a one-day meal plan using only existing_recipes.',
        'The JSON shape must be:',
        JSON.stringify(this.responseShape),
        'User conditions:',
        JSON.stringify({
          user_message: String(payload.user_message || ''),
          conversation_history: normalizeHistory(payload.history),
          plan_date: payload.plan_date || '',
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
      ingredients: ['string in Simplified Chinese'],
      tags: ['string in Simplified Chinese'],
      confidence: 'low|medium|high'
    },
    systemPrompt: [
      'You are a dish and ingredient image recognition assistant.',
      'Identify possible dish title, ingredients, and tags from the image.',
      'If uncertain, lower confidence and do not invent detailed cooking steps.',
      'All user-facing strings in the JSON must be Simplified Chinese.',
      'Return strict JSON only. No Markdown.'
    ].join(' '),
    userPrompt(payload) {
      return [
        { type: 'text', text: [
          'Recognize this food or ingredient image and return JSON.',
          'The JSON shape must be:',
          JSON.stringify(this.responseShape),
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
  const aiResult = await callChatCompletion({ apiUrl, apiKey, model, messages })
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
  return file && file.tempFileURL ? file.tempFileURL : value
}

function callChatCompletion({ apiUrl, apiKey, model, messages }) {
  const url = new URL(apiUrl)
  const body = JSON.stringify({
    model,
    messages,
    temperature: 0.7,
    response_format: { type: 'json_object' }
  })

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

function fail(code, message) {
  return { ok: false, code, message }
}
