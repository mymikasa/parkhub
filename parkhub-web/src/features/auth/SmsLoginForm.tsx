import { useState, useEffect } from 'react'
import { Phone, MessageSquare } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { SmsLoginRequest } from '@/lib/auth'

interface SmsLoginFormProps {
  onSuccess?: () => void
}

export default function SmsLoginForm({ onSuccess }: SmsLoginFormProps) {
  const { smsLogin, isSmsLoginLoading, smsLoginError, sendSmsCode, isSendSmsCodeLoading } = useAuth()

  const [formData, setFormData] = useState<SmsLoginRequest>({
    phone: '',
    code: '',
  })
  const [errors, setErrors] = useState<Partial<SmsLoginRequest>>({})
  const [countdown, setCountdown] = useState(0)

  // 倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^1[3-9]\d{9}$/
    return phoneRegex.test(phone)
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<SmsLoginRequest> = {}

    if (!formData.phone.trim()) {
      newErrors.phone = '请输入手机号'
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = '请输入正确的手机号'
    }

    if (!formData.code.trim()) {
      newErrors.code = '请输入验证码'
    } else if (formData.code.length !== 6) {
      newErrors.code = '验证码为6位数字'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSendCode = async () => {
    if (!formData.phone.trim()) {
      setErrors({ phone: '请输入手机号' })
      return
    }

    if (!validatePhone(formData.phone)) {
      setErrors({ phone: '请输入正确的手机号' })
      return
    }

    try {
      await sendSmsCode({ phone: formData.phone, purpose: 'login' })
      setCountdown(60)
    } catch {
      // Error is handled by the hook
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      await smsLogin(formData)
      onSuccess?.()
    } catch {
      // Error is handled by the hook
    }
  }

  const handleChange = (field: keyof SmsLoginRequest, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 手机号输入 */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          手机号
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Phone className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.phone ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="请输入手机号"
            maxLength={11}
          />
        </div>
        {errors.phone && (
          <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
        )}
      </div>

      {/* 验证码输入 */}
      <div>
        <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
          验证码
        </label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MessageSquare className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="code"
              type="text"
              value={formData.code}
              onChange={(e) => handleChange('code', e.target.value.replace(/\D/g, ''))}
              className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.code ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="请输入验证码"
              maxLength={6}
            />
          </div>
          <button
            type="button"
            onClick={handleSendCode}
            disabled={countdown > 0 || isSendSmsCodeLoading}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-gray-700 font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            {isSendSmsCodeLoading ? (
              '发送中...'
            ) : countdown > 0 ? (
              `${countdown}s`
            ) : (
              '获取验证码'
            )}
          </button>
        </div>
        {errors.code && (
          <p className="mt-1 text-sm text-red-500">{errors.code}</p>
        )}
      </div>

      {/* 错误提示 */}
      {smsLoginError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">
            {(smsLoginError as Error).message || '登录失败，请检查验证码'}
          </p>
        </div>
      )}

      {/* 登录按钮 */}
      <button
        type="submit"
        disabled={isSmsLoginLoading}
        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
      >
        {isSmsLoginLoading ? (
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

      {/* 提示 */}
      <p className="text-xs text-gray-500 text-center">
        MVP阶段验证码固定为 <span className="font-mono font-bold">123456</span>
      </p>
    </form>
  )
}
