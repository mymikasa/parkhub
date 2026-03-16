'use client';

import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { Icon } from '@/components/icons/FontAwesome';
import {
  faSquareParking,
  faCar,
  faBuilding,
  faMicrochip,
  faUser,
  faLock,
  faMobileScreen,
  faShieldHalved,
  faEye,
  faEyeSlash,
  faSpinner,
  faArrowUp,
  faCircle,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth/hooks';
import { sendSmsCode } from '@/lib/auth/api';

// ──────────────────────────────────────────────
// Zod schemas
// ──────────────────────────────────────────────

const passwordSchema = z.object({
  account: z.string().min(1, '请输入账号或邮箱'),
  password: z.string().min(1, '请输入密码'),
});

const smsSchema = z.object({
  phone: z
    .string()
    .min(1, '请输入手机号')
    .regex(/^1[3-9]\d{9}$/, '请输入有效的11位手机号'),
  code: z.string().min(1, '请输入验证码').length(6, '验证码为6位数字'),
});

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading, login, smsLogin } = useAuth();

  // ── Password form state ────────────────────
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [pwdErrors, setPwdErrors] = useState<Record<string, string>>({});
  const [loginError, setLoginError] = useState('');
  const [isPwdLoading, setIsPwdLoading] = useState(false);

  // ── SMS form state ─────────────────────────
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [smsFieldErrors, setSmsFieldErrors] = useState<Record<string, string>>({});
  const [smsError, setSmsError] = useState('');
  const [isSmsLoading, setIsSmsLoading] = useState(false);
  const [isSmsLoginLoading, setIsSmsLoginLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Redirect already-logged-in users
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const redirect = searchParams.get('redirect') || '/realtime-monitor';
      router.replace(redirect);
    }
  }, [authLoading, isAuthenticated, router, searchParams]);

  // ── Password login ──────────────────────────
  const onPasswordLogin = async (e: FormEvent) => {
    e.preventDefault();
    const result = passwordSchema.safeParse({ account, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        fieldErrors[key] = issue.message;
      }
      setPwdErrors(fieldErrors);
      return;
    }
    setPwdErrors({});
    setLoginError('');
    setIsPwdLoading(true);
    try {
      await login(account, password, remember);
      const redirect = searchParams.get('redirect') || '/realtime-monitor';
      router.replace(redirect);
    } catch (err) {
      const e = err as Error;
      setLoginError(e.message || '登录失败，请重试');
    } finally {
      setIsPwdLoading(false);
    }
  };

  // ── SMS login ───────────────────────────────
  const onSmsLogin = async (e: FormEvent) => {
    e.preventDefault();
    const result = smsSchema.safeParse({ phone, code });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        fieldErrors[key] = issue.message;
      }
      setSmsFieldErrors(fieldErrors);
      return;
    }
    setSmsFieldErrors({});
    setSmsError('');
    setIsSmsLoginLoading(true);
    try {
      await smsLogin(phone, code);
      const redirect = searchParams.get('redirect') || '/realtime-monitor';
      router.replace(redirect);
    } catch (err) {
      const e = err as Error;
      setSmsError(e.message || '登录失败，请重试');
    } finally {
      setIsSmsLoginLoading(false);
    }
  };

  const handleSendSms = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setSmsFieldErrors((prev) => ({ ...prev, phone: '请先输入有效的11位手机号' }));
      return;
    }
    setSmsError('');
    setIsSmsLoading(true);
    try {
      await sendSmsCode({ phone, purpose: 'login' });
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      const e = err as Error;
      setSmsError(e.message || '发送失败，请重试');
    } finally {
      setIsSmsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Icon icon={faSpinner} spin className="text-3xl text-brand-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* 左侧品牌区域 */}
      <div className="hidden lg:flex lg:w-[55%] login-bg relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3" />
        <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-white/[0.02] rounded-full -translate-x-1/2 -translate-y-1/2" />

        {/* 顶部 Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Icon icon={faSquareParking} className="text-white text-lg" />
            </div>
            <span className="text-white text-xl font-semibold tracking-tight">ParkHub</span>
          </div>
        </div>

        {/* 中部主视觉 */}
        <div className="relative z-10 flex-1 flex flex-col justify-center -mt-8">
          <h1 className="text-white text-4xl xl:text-5xl font-bold leading-tight mb-4">
            智慧停车<br />管理平台
          </h1>
          <p className="text-blue-200/80 text-lg max-w-md leading-relaxed mb-12">
            为物业公司与商业综合体打造的一站式停车管理解决方案，涵盖车辆出入管理、智能计费、设备联动与数据分析。
          </p>

          <div className="flex gap-4">
            <div className="stat-card rounded-2xl p-5 float-animation">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-emerald-400/20 rounded-lg flex items-center justify-center">
                  <Icon icon={faCar} className="text-emerald-400 text-sm" />
                </div>
                <span className="text-blue-200/60 text-sm">今日通行</span>
              </div>
              <div className="text-white text-2xl font-bold">12,847</div>
              <div className="text-emerald-400 text-xs mt-1">
                <Icon icon={faArrowUp} className="text-[10px]" /> 较昨日 +8.3%
              </div>
            </div>
            <div className="stat-card rounded-2xl p-5 float-animation" style={{ animationDelay: '2s' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-amber-400/20 rounded-lg flex items-center justify-center">
                  <Icon icon={faBuilding} className="text-amber-400 text-sm" />
                </div>
                <span className="text-blue-200/60 text-sm">接入车场</span>
              </div>
              <div className="text-white text-2xl font-bold">326</div>
              <div className="text-amber-400 text-xs mt-1">
                <Icon icon={faArrowUp} className="text-[10px]" /> 本月新增 12 家
              </div>
            </div>
            <div className="stat-card rounded-2xl p-5 float-animation">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-violet-400/20 rounded-lg flex items-center justify-center">
                  <Icon icon={faMicrochip} className="text-violet-400 text-sm" />
                </div>
                <span className="text-blue-200/60 text-sm">在线设备</span>
              </div>
              <div className="text-white text-2xl font-bold">1,204</div>
              <div className="text-emerald-400 text-xs mt-1">
                <Icon icon={faCircle} className="text-[8px]" /> 在线率 99.6%
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-blue-200/40 text-sm">&copy; 2026 ParkHub. 让每一次停车都更智能。</p>
        </div>
      </div>

      {/* 右侧登录区域 */}
      <div className="w-full lg:w-[45%] flex flex-col bg-white">
        {/* 移动端顶部 Logo */}
        <div className="lg:hidden flex items-center gap-3 p-6">
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
            <Icon icon={faSquareParking} className="text-white text-base" />
          </div>
          <span className="text-gray-900 text-lg font-semibold">ParkHub</span>
        </div>

        {/* 登录表单 */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-12 lg:px-16 xl:px-24">
          <div className="w-full max-w-[400px]">
            <div className="mb-8">
              <h2 className="text-gray-900 text-2xl font-bold mb-2">欢迎回来</h2>
              <p className="text-gray-500 text-sm">登录您的账号以继续管理停车场</p>
            </div>

            <Tabs defaultValue="account" className="w-full">
              <TabsList className="flex bg-gray-100 rounded-lg p-1 mb-8 w-full">
                <TabsTrigger
                  value="account"
                  className="flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-700"
                  onClick={() => setLoginError('')}
                >
                  <Icon icon={faUser} className="mr-1.5 text-xs" />账号登录
                </TabsTrigger>
                <TabsTrigger
                  value="phone"
                  className="flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-700"
                  onClick={() => setSmsError('')}
                >
                  <Icon icon={faMobileScreen} className="mr-1.5 text-xs" />手机号登录
                </TabsTrigger>
              </TabsList>

              {/* 账号密码表单 */}
              <TabsContent value="account">
                <form onSubmit={onPasswordLogin} noValidate className="space-y-5">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1.5 block">账号</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Icon icon={faUser} className="text-gray-400 text-sm" />
                      </div>
                      <Input
                        type="text"
                        placeholder="请输入账号或邮箱"
                        value={account}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setAccount(e.target.value)}
                        className="h-11 pl-10 rounded-lg border-gray-200 focus:border-brand-500"
                      />
                    </div>
                    {pwdErrors.account && (
                      <p className="mt-1 text-xs text-red-500">{pwdErrors.account}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1.5 block">密码</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Icon icon={faLock} className="text-gray-400 text-sm" />
                      </div>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="请输入密码"
                        value={password}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                        className="h-11 pl-10 pr-11 rounded-lg border-gray-200 focus:border-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center"
                      >
                        <Icon
                          icon={showPassword ? faEye : faEyeSlash}
                          className="text-gray-400 text-sm hover:text-gray-600 transition-colors"
                        />
                      </button>
                    </div>
                    {pwdErrors.password && (
                      <p className="mt-1 text-xs text-red-500">{pwdErrors.password}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                      <span className="text-sm text-gray-600">记住登录状态</span>
                    </label>
                    <a href="#" className="text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors">
                      忘记密码？
                    </a>
                  </div>

                  {loginError && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                      <Icon icon={faTriangleExclamation} className="text-red-500 text-sm flex-shrink-0" />
                      <p className="text-sm text-red-600">{loginError}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isPwdLoading}
                    className="btn-primary w-full h-11 rounded-lg text-white text-sm font-medium"
                  >
                    {isPwdLoading ? (
                      <>
                        <Icon icon={faSpinner} spin className="mr-2" />登录中...
                      </>
                    ) : (
                      '登录'
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* 手机号表单 */}
              <TabsContent value="phone">
                <form onSubmit={onSmsLogin} noValidate className="space-y-5">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1.5 block">手机号</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Icon icon={faMobileScreen} className="text-gray-400 text-sm" />
                      </div>
                      <Input
                        type="tel"
                        placeholder="请输入手机号"
                        value={phone}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                        className="h-11 pl-10 rounded-lg border-gray-200 focus:border-brand-500"
                      />
                    </div>
                    {smsFieldErrors.phone && (
                      <p className="mt-1 text-xs text-red-500">{smsFieldErrors.phone}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1.5 block">验证码</Label>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Icon icon={faShieldHalved} className="text-gray-400 text-sm" />
                        </div>
                        <Input
                          type="text"
                          placeholder="请输入6位验证码"
                          value={code}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
                          maxLength={6}
                          className="h-11 pl-10 rounded-lg border-gray-200 focus:border-brand-500"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleSendSms}
                        disabled={countdown > 0 || isSmsLoading}
                        variant="outline"
                        className="h-11 px-5 rounded-lg border-brand-200 bg-brand-50 text-brand-600 text-sm font-medium hover:bg-brand-100 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSmsLoading ? (
                          <Icon icon={faSpinner} spin />
                        ) : countdown > 0 ? (
                          `${countdown}s 后重发`
                        ) : (
                          '获取验证码'
                        )}
                      </Button>
                    </div>
                    {smsFieldErrors.code && (
                      <p className="mt-1 text-xs text-red-500">{smsFieldErrors.code}</p>
                    )}
                  </div>

                  {smsError && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                      <Icon icon={faTriangleExclamation} className="text-red-500 text-sm flex-shrink-0" />
                      <p className="text-sm text-red-600">{smsError}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isSmsLoginLoading}
                    className="btn-primary w-full h-11 rounded-lg text-white text-sm font-medium mt-3"
                  >
                    {isSmsLoginLoading ? (
                      <>
                        <Icon icon={faSpinner} spin className="mr-2" />登录中...
                      </>
                    ) : (
                      '登录'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="px-6 py-6 text-center lg:hidden">
          <p className="text-gray-400 text-xs">&copy; 2026 ParkHub. 让每一次停车都更智能。</p>
        </div>
      </div>
    </div>
  );
}
