const TOKEN_KEY = 'dawacheck_token'

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export const setToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    }
  } catch {
    // ignore storage failures
  }
}

export const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore failure
  }
}

export const isAuthenticated = () => Boolean(getToken())
