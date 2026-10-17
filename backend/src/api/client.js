const API_BASE_URL = 'http://127.0.0.1:8000'

export function saveToken(token) {
  localStorage.setItem('familyvault_token', token)
}

export function getToken() {
  return localStorage.getItem('familyvault_token')
}

export function clearToken() {
  localStorage.removeItem('familyvault_token')
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = new Headers(options.headers || {})

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let message = `Request failed (${response.status})`

    try {
      const error = await response.json()
      message = error.detail || message
    } catch {
      // Keep the default error message.
    }

    throw new Error(
      typeof message === 'string' ? message : JSON.stringify(message)
    )
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

export async function login(email, password) {
  const form = new URLSearchParams()
  form.set('username', email)
  form.set('password', password)

  const result = await request('/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  })

  saveToken(result.access_token)
  return result
}

export function getProfile() {
  return request('/auth/me')
}

export function registerUser(fullName, email, password) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      full_name: fullName,
      email,
      password,
    }),
  })
}

export function createFamily(name) {
  return request('/families/', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function getFamilyMembers(familyId) {
  return request(`/families/${familyId}/members`)
}

export function addFamilyMember(familyId, email, role = 'member') {
  return request(`/families/${familyId}/members`, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  })
}

export function getDocuments(familyId) {
  return request(`/documents/${familyId}`)
}

export function uploadDocument(familyId, file) {
  const form = new FormData()
  form.append('file', file)

  return request(`/documents/${familyId}/upload`, {
    method: 'POST',
    body: form,
  })
}

export function getDocumentOCR(familyId, documentId) {
  return request(`/documents/${familyId}/${documentId}/ocr`)
}

export async function downloadDocument(familyId, documentId) {
  const token = getToken()
  const headers = {}

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(
    `${API_BASE_URL}/documents/${familyId}/${documentId}/download`,
    { headers }
  )

  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'family-document'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function deleteDocument(familyId, documentId) {
  return request(`/documents/${familyId}/${documentId}`, {
    method: 'DELETE',
  })
}