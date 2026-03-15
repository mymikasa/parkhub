import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

type TabType = 'account' | 'phone'

export default function Login() {
  const { login, isLoginLoading, loginError, smsLogin, isSmsLoginLoading, smsLoginError, sendSmsCode, isSendSmsCodeLoading } = useAuth()

  const [activeTab, setActiveTab] = useState<TabType>('account')
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [remember, setRemember] = useState(false)

  // 倒计时逻辑
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleSendCode = async () => {
    if (!phone || phone.length !== 11) return
    try {
      await sendSmsCode({ phone, purpose: 'login' })
      setCountdown(60)
    } catch (e) {
      console.error(e)
    }
  }

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account || !password) return
    await login({ account, password, remember })
  }

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone || !code) return
    await smsLogin({ phone, code })
  }

  return (
    <div className="flex min-h-screen">
      {/* 左侧品牌区域 */}
      <div
        className="hidden lg:flex lg:w-[55%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)' }}
      >
        {/* 背景装饰 */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3"></div>
        <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-white/[0.02] rounded-full -translate-x-1/2 -translate-y-1/2"></div>

        {/* 顶部 Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <i className="fa-solid fa-square-parking text-white text-lg"></i>
            </div>
            <span className="text-white text-xl font-semibold tracking-tight">ParkHub</span>
          </div>
        </div>

        {/* 中部主视觉 */}
        <div className="flex-1 flex flex-col justify-center relative z-10 px-8">
          {/* 品牌标题 */}
          <div className="mb-10">
            <h1 className="text-white text-4xl xl:text-5xl font-bold leading-tight mb-4">
              智慧停车<br />管理平台
            </h1>
            <p className="text-blue-200/80 text-lg max-w-md leading-relaxed">
              为物业公司与商业综合体打造的一站式停车管理解决方案，涵盖车辆出入管理、智能计费、设备联动与数据分析。
            </p>
          </div>

          {/* 数据卡片 */}
          <div className="flex gap-4">
            {/* 今日通行 */}
            <div className="stat-card rounded-2xl p-5 float-animation">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-emerald-400/20 rounded-lg flex items-center justify-center">
                  <i className="fa-solid fa-car text-emerald-400 text-sm"></i>
                </div>
                <span className="text-blue-200/60 text-sm">今日通行</span>
              </div>
              <div className="text-white text-2xl font-bold">12,847</div>
              <div className="text-emerald-400 text-xs mt-1">
                <i className="fa-solid fa-arrow-up text-[10px]"></i> 较昨日 +8.3%
              </div>
            </div>

            {/* 接入车场 */}
            <div className="stat-card rounded-2xl p-5 float-animation-delay">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-amber-400/20 rounded-lg flex items-center justify-center">
                  <i className="fa-solid fa-building text-amber-400 text-sm"></i>
                </div>
                <span className="text-blue-200/60 text-sm">接入车场</span>
              </div>
              <div className="text-white text-2xl font-bold">326</div>
              <div className="text-amber-400 text-xs mt-1">
                <i className="fa-solid fa-arrow-up text-[10px]"></i> 本月新增 12 家
              </div>
            </div>

            {/* 在线设备 */}
            <div className="stat-card rounded-2xl p-5 float-animation" style={{ animationDelay: '2s' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-violet-400/20 rounded-lg flex items-center justify-center">
                  <i className="fa-solid fa-microchip text-violet-400 text-sm"></i>
                </div>
                <span className="text-blue-200/60 text-sm">在线设备</span>
              </div>
              <div className="text-white text-2xl font-bold">1,204</div>
              <div className="text-emerald-400 text-xs mt-1">
                <i className="fa-solid fa-circle text-[8px]"></i> 在线率 99.6%
              </div>
            </div>
          </div>
        </div>

        {/* 底部版权 */}
        <div className="relative z-10">
          <p className="text-blue-200/40 text-sm">© 2026 ParkHub. 让每一次停车都更智能。</p>
        </div>
      </div>

      {/* 右侧登录区域 */}
      <div className="w-full lg:w-[45%] flex flex-col bg-white">
        {/* 移动端顶部 Logo */}
        <div className="lg:hidden flex items-center gap-3 p-6">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <i className="fa-solid fa-square-parking text-white text-base"></i>
          </div>
          <span className="text-gray-900 text-lg font-semibold">ParkHub</span>
        </div>

        {/* 登录表单 */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-12 lg:px-16 xl:px-24">
          <div className="w-full max-w-[400px]">
            {/* 标题 */}
            <div className="mb-8">
              <h2 className="text-gray-900 text-2xl font-bold mb-2">欢迎回来</h2>
              <p className="text-gray-500 text-sm">登录您的账号以继续管理停车场</p>
            </div>

            {/* 登录方式切换 */}
            <div className="flex bg-gray-100 rounded-lg p-1 mb-8">
              <button
                onClick={() => setActiveTab('account')}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'account'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className="fa-solid fa-user mr-1.5 text-xs"></i>账号登录
              </button>
              <button
                onClick={() => setActiveTab('phone')}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'phone'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className="fa-solid fa-mobile-screen mr-1.5 text-xs"></i>手机号登录
              </button>
            </div>

            {/* 账号密码表单 */}
            {activeTab === 'account' && (
              <form onSubmit={handleAccountSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">账号</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <i className="fa-regular fa-user text-gray-400"></i>
                    </div>
                    <input
                      type="text"
                      value={account}
                      onChange={(e) => setAccount(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder:text-gray-400"
                      placeholder="请输入用户名或邮箱"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <i className="fa-regular fa-lock text-gray-400"></i>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-11 pr-12 py-3 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder:text-gray-400"
                      placeholder="请输入密码"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    >
                      <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-gray-400 hover:text-gray-600 transition-colors`}></i>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-600">记住登录状态</span>
                  </label>
                </div>

                {loginError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600 flex items-center">
                      <i className="fa-solid fa-circle-exclamation mr-2"></i>
                      {(loginError as Error).message || '登录失败，请检查账号密码'}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoginLoading}
                  className="w-full py-3 px-4 text-white font-medium rounded-lg transition-all disabled:opacity-50 btn-primary"
                >
                  {isLoginLoading ? (
                    <span className="flex items-center justify-center">
                      <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                      登录中...
                    </span>
                  ) : (
                    '登录'
                  )}
                </button>
              </form>
            )}

            {/* 验证码表单 */}
            {activeTab === 'phone' && (
              <form onSubmit={handlePhoneSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">手机号</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <i className="fa-regular fa-mobile-screen text-gray-400"></i>
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder:text-gray-400"
                      placeholder="请输入手机号"
                      maxLength={11}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">验证码</label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <i className="fa-regular fa-comment-dots text-gray-400"></i>
                      </div>
                      <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                        className="block w-full pl-11 pr-4 py-3 rounded-lg border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder:text-gray-400"
                        placeholder="请输入验证码"
                        maxLength={6}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={countdown > 0 || isSendSmsCodeLoading}
                      className={`h-12 px-4 rounded-lg border text-sm font-medium whitespace-nowrap transition-all ${
                        countdown > 0 || isSendSmsCodeLoading
                          ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                          : 'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                    >
                      {isSendSmsCodeLoading ? (
                        <span className="flex items-center">
                          <i className="fa-solid fa-spinner fa-spin mr-1"></i>
                          发送中
                        </span>
                      ) : countdown > 0 ? (
                        `${countdown}s`
                      ) : (
                        '获取验证码'
                      )}
                    </button>
                  </div>
                </div>

                {smsLoginError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600 flex items-center">
                      <i className="fa-solid fa-circle-exclamation mr-2"></i>
                      {(smsLoginError as Error).message || '登录失败，请检查验证码'}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSmsLoginLoading}
                  className="w-full py-3 px-4 text-white font-medium rounded-lg transition-all disabled:opacity-50 btn-primary"
                >
                  {isSmsLoginLoading ? (
                    <span className="flex items-center justify-center">
                      <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                      登录中...
                    </span>
                  ) : (
                    '登录'
                  )}
                </button>

                <p className="text-xs text-gray-400 text-center">
                  MVP阶段验证码固定为 <span className="font-mono font-semibold text-gray-500">123456</span>
                </p>
              </form>
            )}
          </div>
        </div>

        {/* 底部版权 - 桌面端 */}
        <div className="hidden lg:block p-6 text-center border-t border-gray-100">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} ParkHub. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
