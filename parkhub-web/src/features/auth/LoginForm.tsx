import { useState } from 'react'
import { Eye, EyeOff, User, Lock } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { LoginRequest } from '@/lib/auth'

interface LoginFormProps {
  onSuccess?: () => void
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const { login, isLoginLoading, loginError } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState<LoginRequest>({
    account: '',
    password: '',
    remember: false,
  })
  const [errors, setErrors] = useState<Partial<LoginRequest>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginRequest> = {}

    if (!formData.account.trim()) {
      newErrors.account = '请输入账号'
    }

    if (!formData.password) {
      newErrors.password = '请输入密码'
    } else if (formData.password.length < 6) {
      newErrors.password = '密码至少6位'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      await login(formData)
      onSuccess?.()
    } catch {
      // Error is handled by the hook
    }
  }

  const handleChange = (field: keyof LoginRequest, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 账号输入 */}
      <div>
        <label htmlFor="account" className="block text-sm font-medium text-gray-700 mb-1">
          账号
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <User className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="account"
            type="text"
            value={formData.account}
            onChange={(e) => handleChange('account', e.target.value)}
            className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.account ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="请输入用户名或邮箱"
          />
        </div>
        {errors.account && (
          <p className="mt-1 text-sm text-red-500">{errors.account}</p>
        )}
      </div>

      {/* 密码输入 */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          密码
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            className={`block w-full pl-10 pr-10 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.password ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="请输入密码"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-sm text-red-500">{errors.password}</p>
        )}
      </div>

      {/* 记住登录 */}
      <div className="flex items-center">
        <input
          id="remember"
          type="checkbox"
          checked={formData.remember}
          onChange={(e) => handleChange('remember', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
          记住登录状态
        </label>
      </div>

      {/* 错误提示 */}
      {loginError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">
            {(loginError as Error).message || '登录失败，请检查账号密码'}
          </p>
        </div>
      )}

      {/* 登录按钮 */}
      <button
        type="submit"
        disabled={isLoginLoading}
        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
      >
        {isLoginLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            登录中...
          </>
        ) : (
          '登录'
        )}
      </button>
    </form>
  )
}
