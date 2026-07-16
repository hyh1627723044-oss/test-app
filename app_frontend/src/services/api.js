const DEFAULT_API_BASE_URL = 'http://localhost:8080'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL

function getToken() {
  return uni.getStorageSync('access_token')
}

function setToken(token) {
  uni.setStorageSync('access_token', token)
}

function clearToken() {
  uni.removeStorageSync('access_token')
}

export function request(path, options = {}, retried = false) {
  const token = getToken()
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${path}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.header || {}),
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
          return
        }
        if (res.statusCode === 401 && token && !retried) {
          clearToken()
          devLogin()
            .then(() => request(path, options, true))
            .then(resolve)
            .catch(reject)
          return
        }
        reject(new Error(res.data?.detail || `Request failed: ${res.statusCode}`))
      },
      fail: reject,
    })
  })
}

export async function devLogin() {
  const cached = getToken()
  if (cached) return cached

  const response = await request('/api/auth/dev-login', {
    method: 'POST',
    data: {
      openid: 'app-dev-user',
      nickname: '体验用户',
      avatar_url: '',
    },
  })
  setToken(response.access_token)
  return response.access_token
}

export async function listRecipes(params = {}) {
  await devLogin()
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
  return request(`/api/recipes${query ? `?${query}` : ''}`)
}

export async function getRecipe(id) {
  await devLogin()
  return request(`/api/recipes/${id}`)
}

export async function createRecipe(payload) {
  await devLogin()
  return request('/api/recipes', { method: 'POST', data: payload })
}

export async function updateRecipe(id, payload) {
  await devLogin()
  return request(`/api/recipes/${id}`, { method: 'PATCH', data: payload })
}

export async function listTags() {
  await devLogin()
  return request('/api/tags')
}

export async function addPlanItem(planDate, payload) {
  await devLogin()
  return request(`/api/plans/${planDate}/items`, { method: 'POST', data: payload })
}

export async function getPlan(planDate) {
  await devLogin()
  return request(`/api/plans?date=${encodeURIComponent(planDate)}`)
}

export async function uploadImage(filePath) {
  await devLogin()
  const token = getToken()
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${API_BASE_URL}/api/uploads/images`,
      filePath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(res.data))
          } catch (error) {
            reject(error)
          }
          return
        }
        reject(new Error(res.data || `Upload failed: ${res.statusCode}`))
      },
      fail: reject,
    })
  })
}
