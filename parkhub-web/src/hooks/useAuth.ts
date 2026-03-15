import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import {
  login as loginApi,
  logout as logoutApi,
  getCurrentUser,
  sendSmsCode as sendSmsCodeApi,
  smsLogin as smsLoginApi,
  type LoginRequest,
  type SmsLoginRequest,
  type SendSmsCodeRequest,
} from '@/lib/auth'

export function useAuth() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const {
    accessToken,
    refreshToken,
    user,
    isAuthenticated,
    login: setLoginState,
    logout: clearAuthState,
  } = useAuthStore()

  // 获取当前用户信息
  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    enabled: !!accessToken && !user,
    retry: false,
  })

  // 更新用户状态
  if (currentUser && !user) {
    setLoginState(accessToken!, refreshToken!, {
      id: currentUser.id,
      username: currentUser.username,
      email: currentUser.email,
      phone: currentUser.phone,
      real_name: currentUser.real_name,
      role: currentUser.role,
      tenant_id: currentUser.tenant_id,
    })
  }

  // 账号密码登录
  const loginMutation = useMutation({
    mutationFn: loginApi,
    onSuccess: (data) => {
      setLoginState(data.access_token, data.refresh_token, data.user)
      navigate('/')
    },
  })

  // 发送短信验证码
  const sendSmsCodeMutation = useMutation({
    mutationFn: sendSmsCodeApi,
  })

  // 短信登录
  const smsLoginMutation = useMutation({
    mutationFn: smsLoginApi,
    onSuccess: (data) => {
      setLoginState(data.access_token, data.refresh_token, data.user)
      navigate('/')
    },
  })

  // 登出
  const logoutMutation = useMutation({
    mutationFn: () => logoutApi(refreshToken || undefined),
    onSuccess: () => {
      clearAuthState()
      queryClient.clear()
      navigate('/login')
    },
    onError: () => {
      // 即使 API 调用失败，也清除本地状态
      clearAuthState()
      queryClient.clear()
      navigate('/login')
    },
  })

  return {
    // State
    user,
    isAuthenticated,
    isLoadingUser,

    // Actions
    login: (data: LoginRequest) => loginMutation.mutate(data),
    loginAsync: loginMutation.mutateAsync,
    loginError: loginMutation.error,
    isLoginLoading: loginMutation.isPending,

    sendSmsCode: (data: SendSmsCodeRequest) => sendSmsCodeMutation.mutate(data),
    sendSmsCodeAsync: sendSmsCodeMutation.mutateAsync,
    isSendSmsCodeLoading: sendSmsCodeMutation.isPending,

    smsLogin: (data: SmsLoginRequest) => smsLoginMutation.mutate(data),
    smsLoginAsync: smsLoginMutation.mutateAsync,
    smsLoginError: smsLoginMutation.error,
    isSmsLoginLoading: smsLoginMutation.isPending,

    logout: () => logoutMutation.mutate(),
    isLogoutLoading: logoutMutation.isPending,
  }
}
