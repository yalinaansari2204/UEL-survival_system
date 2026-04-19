const TOKEN_KEY = 'uel_survival_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY) || ''
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

const request = async (path, options = {}) => {
  const token = getToken()
  const headers = { ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  if (!headers['Content-Type'] && options.body !== undefined && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json'
  }
  const response = await fetch(path, { ...options, headers })
  if (response.status === 204) return null
  const contentType = response.headers.get('content-type') || ''
  const body = contentType.includes('application/json') ? await response.json() : null
  if (!response.ok) {
    throw new Error(body?.error || 'Request failed')
  }
  return body
}

export const fetchWeekMaterialPdf = async (id) => {
  const token = getToken()
  const response = await fetch(`/api/week-materials/${id}/file`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) throw new Error('Failed to load PDF')
  return response.blob()
}

export const uploadWeekMaterialPdf = async (moduleId, week, file) => {
  const token = getToken()
  const form = new FormData()
  form.append('file', file)
  const response = await fetch(
    `/api/week-materials?moduleId=${encodeURIComponent(moduleId)}&week=${encodeURIComponent(week)}`,
    {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    },
  )
  const contentType = response.headers.get('content-type') || ''
  const body = contentType.includes('application/json') ? await response.json() : null
  if (!response.ok) throw new Error(body?.error || 'Upload failed')
  return body
}

export const api = {
  request,
  get: (path) => request(path),
  post: (path, data = {}) => request(path, { method: 'POST', body: JSON.stringify(data) }),
  put: (path, data = {}) => request(path, { method: 'PUT', body: JSON.stringify(data) }),
}
