import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/useAuthStore'

// 创建 Axios 实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器 - 添加 Token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState()
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 处理 Token 刷新和错误
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // 401 错误处理
    if (error.response?.status === 401 && !originalRequest._retry) {
      const { refreshToken, setTokens, logout } = useAuthStore.getState()

      // 如果有 refresh token，尝试刷新
      if (refreshToken) {
        originalRequest._retry = true

        try {
          const response = await axios.post('/api/v1/auth/refresh', {
            refresh_token: refreshToken,
          })

          const { access_token, refresh_token } = response.data
          setTokens(access_token, refresh_token)

          // 重试原始请求
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`
          }
          return api(originalRequest)
        } catch (refreshError) {
          // 刷新失败，登出
          logout()
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      } else {
        // 没有 refresh token，直接登出
        logout()
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api
