import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../utils/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) { setLoading(false); return }
      const { data } = await api.get('/auth/me')
      setUser(data.user)
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.clear()
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMe() }, [fetchMe])

  // Standard email/password login
  const login = (userData, accessToken, refreshToken) => {
    localStorage.setItem('accessToken',  accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    setUser(userData)
  }

  // OAuth login — called from useOAuth hook after Firebase success
  const oauthLogin = useCallback(async (profile) => {
    const { data } = await api.post('/auth/oauth', profile)
    localStorage.setItem('accessToken',  data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    setUser(data.user)
    return data.user
  }, [])

  const logout = async () => {
    try { await api.post('/auth/logout') } catch {}
    localStorage.clear()
    setUser(null)
  }

  const updateUser = (updates) => setUser(prev => ({ ...prev, ...updates }))

  return (
    <AuthContext.Provider value={{ user, loading, login, oauthLogin, logout, updateUser, fetchMe }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
