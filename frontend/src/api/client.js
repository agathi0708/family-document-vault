
const API_BASE_URL = 'http://127.0.0.1:8000'

// ==============================
// Authentication token
// ==============================

export function setToken(token) {
  localStorage.setItem('token', token)
}

export function getToken() {
  return localStorage.getItem('token')
}

export function clearToken() {
  localStorage.removeItem('token')
}

// ==============================
// Common API request
// ==============================

async function request(path, options = {}) {
  const token = getToken()

  const headers = {
    ...(options.body instanceof FormData
      ? {}
      : { 'Content-Type': 'application/json' }),
    ...(token
      ? { Authorization: 'Bearer ' + token }
      : {}),
    ...options.headers,
  }

  const response = await fetch(API_BASE_URL + path, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    let message = errorData.detail || errorData.message

    if (Array.isArray(message)) {
      message = message
        .map((item) => {
          if (item && typeof item === 'object') {
            const field = Array.isArray(item.loc)
              ? item.loc.join('.')
              : 'Field'

            return field + ': ' + (item.msg || 'Invalid value')
          }

          return String(item)
        })
        .join(', ')
    } else if (message && typeof message === 'object') {
      message = JSON.stringify(message)
    }

    throw new Error(
      typeof message === 'string' && message
        ? message
        : 'Request failed (' + response.status + ')'
    )
  }

  if (response.status === 204) {
    return null
  }

  const responseText = await response.text()

  if (!responseText) {
    return null
  }

  try {
    return JSON.parse(responseText)
  } catch {
    return responseText
  }
}

// ==============================
// Register
// ==============================

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

// ==============================
// Login
// ==============================

export async function login(email, password) {
  const formData = new URLSearchParams()

  formData.set('username', email)
  formData.set('password', password)

  const data = await request('/auth/login', {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

  const accessToken = data && (data.access_token || data.token)

  if (!accessToken) {
    throw new Error(
      'Login response did not contain an access token.'
    )
  }

  setToken(accessToken)

  return data
}

// ==============================
// User profile
// ==============================

export function getProfile() {
  return request('/auth/me')
}

// ==============================
// Family workspace
// ==============================

export function getFamilies() {
  return request('/families/')
}

export function createFamily(name) {
  return request('/families/', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

// ==============================
// Documents
// ==============================

export function getDocuments(familyId) {
  return request('/documents/' + familyId)
}

export function uploadDocument(familyId, file) {
  const formData = new FormData()
  formData.append('file', file)

  return request('/documents/' + familyId + '/upload', {
    method: 'POST',
    body: formData,
  })
}

export function getDocumentOCR(familyId, documentId) {
  return request(
    '/documents/' + familyId + '/' + documentId + '/ocr'
  )
}

export function deleteDocument(familyId, documentId) {
  return request(
    '/documents/' + familyId + '/' + documentId,
    {
      method: 'DELETE',
    }
  )
}

// ==============================
// Download document
// ==============================

export async function downloadDocument(familyId, documentId) {
  const token = getToken()

  const headers = token
    ? { Authorization: 'Bearer ' + token }
    : {}

  const response = await fetch(
    API_BASE_URL +
      '/documents/' +
      familyId +
      '/' +
      documentId +
      '/download',
    { headers }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const message = errorData.detail || errorData.message

    throw new Error(
      typeof message === 'string' && message
        ? message
        : 'Download failed (' + response.status + ')'
    )
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = 'document-' + documentId

  document.body.appendChild(link)
  link.click()
  link.remove()

  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ==============================
// Family members
// ==============================

export function getFamilyMembers(familyId) {
  return request('/families/' + familyId + '/members')
}

export function addFamilyMember(
  familyId,
  email,
  role = 'member'
) {
  return request('/families/' + familyId + '/members', {
    method: 'POST',
    body: JSON.stringify({
      email,
      role,
    }),
  })
}
