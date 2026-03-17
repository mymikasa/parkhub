'use client';

import { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  Mail,
  Phone,
  Lock,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuthContext } from '@/lib/auth/store';
import { useUpdateProfile, useChangePassword, useMyLoginLogs } from '@/lib/user/hooks';
import type { UpdateProfileRequest, ChangePasswordRequest } from '@/lib/user/types';

const ROLE_DISPLAY: Record<string, string> = {
  platform_admin: '平台管理员',
  tenant_admin: '租户管理员',
  operator: '操作员',
};

const ROLE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  platform_admin: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  tenant_admin: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  operator: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
};

const AVATAR_GRADIENTS = [
  'from-blue-500 to-blue-600',
  'from-emerald-500 to-emerald-600',
  'from-amber-500 to-amber-600',
  'from-violet-500 to-violet-600',
  'from-rose-500 to-rose-600',
  'from-cyan-500 to-cyan-600',
  'from-orange-500 to-orange-600',
  'from-indigo-500 to-indigo-600',
];

function getAvatarGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function getPasswordStrength(password: string): { level: number; label: string; color: string } {
  if (!password) return { level: 0, label: '', color: '' };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score++;

  if (score <= 1) return { level: 1, label: '弱', color: 'bg-red-500' };
  if (score <= 2) return { level: 2, label: '较弱', color: 'bg-orange-500' };
  if (score <= 3) return { level: 3, label: '中等', color: 'bg-amber-500' };
  if (score <= 4) return { level: 4, label: '强', color: 'bg-emerald-500' };
  return { level: 5, label: '非常强', color: 'bg-emerald-600' };
}

function parseUserAgent(ua: string): string {
  if (!ua) return '未知设备';

  let browser = '未知浏览器';
  if (ua.includes('Chrome') && !ua.includes('Edge')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';

  let os = '未知系统';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return `${browser} / ${os}`;
}

export default function ProfilePage() {
  const { user } = useAuthContext();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  // Profile form state
  const [profileForm, setProfileForm] = useState<UpdateProfileRequest>({
    real_name: '',
    email: '',
    phone: '',
  });
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password form state
  const [passwordForm, setPasswordForm] = useState<ChangePasswordRequest & { confirm_password: string }>({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Login logs
  const [logsPage, setLogsPage] = useState(1);
  const LOGS_PAGE_SIZE = 10;
  const { data: logsData, isLoading: logsLoading } = useMyLoginLogs(logsPage, LOGS_PAGE_SIZE);
  const logs = logsData?.items || [];
  const logsTotal = logsData?.total || 0;
  const logsTotalPages = Math.max(1, Math.ceil(logsTotal / LOGS_PAGE_SIZE));

  // Populate profile form from user data
  useEffect(() => {
    if (user) {
      setProfileForm({
        real_name: user.real_name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Auto-dismiss messages
  useEffect(() => {
    if (profileMessage) {
      const timer = setTimeout(() => setProfileMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [profileMessage]);

  useEffect(() => {
    if (passwordMessage) {
      const timer = setTimeout(() => setPasswordMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [passwordMessage]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);

    try {
      await updateProfile.mutate(profileForm, () => {
        setProfileMessage({ type: 'success', text: '个人资料已更新' });
      });
    } catch {
      setProfileMessage({ type: 'error', text: updateProfile.error?.message || '更新资料失败，请稍后重试' });
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordMessage({ type: 'error', text: '两次输入的新密码不一致' });
      return;
    }

    if (passwordForm.new_password.length < 8) {
      setPasswordMessage({ type: 'error', text: '新密码至少需要8个字符' });
      return;
    }

    try {
      await changePassword.mutate(
        { old_password: passwordForm.old_password, new_password: passwordForm.new_password },
        () => {
          setPasswordMessage({ type: 'success', text: '密码已成功修改' });
          setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
          setShowOldPassword(false);
          setShowNewPassword(false);
          setShowConfirmPassword(false);
        },
      );
    } catch {
      setPasswordMessage({ type: 'error', text: changePassword.error?.message || '密码修改失败，请检查原密码是否正确' });
    }
  };

  const passwordStrength = getPasswordStrength(passwordForm.new_password);
  const roleStyle = ROLE_COLORS[user?.role || ''] || ROLE_COLORS.operator;

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-surface-border sticky top-0 z-10">
        <div className="flex items-center justify-between px-8 py-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">个人中心</h1>
            <p className="text-sm text-gray-500 mt-0.5">管理您的个人资料和安全设置</p>
          </div>
        </div>
      </header>

      <div className="px-8 py-6 space-y-6">
        {/* ─── Section 1: 个人资料 ─── */}
        <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-600 rounded-full" />
              <span className="text-sm font-medium text-gray-900">个人资料</span>
            </div>
          </div>

          <div className="p-6">
            {/* User info card */}
            <div className="flex items-center gap-5 mb-8 p-5 bg-gray-50/60 rounded-xl border border-gray-100">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getAvatarGradient(user?.real_name || 'U')} flex items-center justify-center text-white text-2xl font-semibold shrink-0 shadow-lg shadow-blue-500/20`}>
                {(user?.real_name || 'U')[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">{user?.real_name || '未设置姓名'}</h2>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${roleStyle.bg} ${roleStyle.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${roleStyle.dot}`} />
                    {ROLE_DISPLAY[user?.role || ''] || '未知角色'}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {user?.username || '-'}
                  </span>
                  {user?.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      {user.email}
                    </span>
                  )}
                  {user?.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      {user.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Edit form */}
            <form onSubmit={handleProfileSubmit}>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="block text-sm font-medium text-gray-700">
                    姓名 <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      value={profileForm.real_name}
                      onChange={(e) => setProfileForm({ ...profileForm, real_name: e.target.value })}
                      placeholder="请输入真实姓名"
                      className="h-11 pl-10 pr-4 rounded-lg border-gray-200 text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="block text-sm font-medium text-gray-700">
                    邮箱
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      placeholder="请输入邮箱地址"
                      className="h-11 pl-10 pr-4 rounded-lg border-gray-200 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="block text-sm font-medium text-gray-700">
                    手机号
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      placeholder="请输入手机号码"
                      className="h-11 pl-10 pr-4 rounded-lg border-gray-200 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Message + Submit */}
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
                <div>
                  {profileMessage && (
                    <div className={`flex items-center gap-2 text-sm ${profileMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {profileMessage.type === 'success'
                        ? <CheckCircle2 className="w-4 h-4" />
                        : <XCircle className="w-4 h-4" />
                      }
                      {profileMessage.text}
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={updateProfile.isPending || !profileForm.real_name?.trim()}
                  className="btn-primary h-10 px-6 rounded-lg text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {updateProfile.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      保存中...
                    </span>
                  ) : (
                    '保存修改'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ─── Section 2: 安全设置 ─── */}
        <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-emerald-500 rounded-full" />
              <span className="text-sm font-medium text-gray-900">安全设置</span>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-3 mb-6 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <Shield className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-700">
                为了账户安全，建议定期修改密码。密码需包含大小写字母、数字和特殊字符，且不少于8位。
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div className="space-y-5 max-w-lg">
                <div className="space-y-2">
                  <Label className="block text-sm font-medium text-gray-700">
                    当前密码 <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type={showOldPassword ? 'text' : 'password'}
                      value={passwordForm.old_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                      placeholder="请输入当前密码"
                      className="h-11 pl-10 pr-11 rounded-lg border-gray-200 text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="block text-sm font-medium text-gray-700">
                    新密码 <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                      placeholder="请输入新密码（至少8个字符）"
                      className="h-11 pl-10 pr-11 rounded-lg border-gray-200 text-sm"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password strength indicator */}
                  {passwordForm.new_password && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${
                              i <= passwordStrength.level ? passwordStrength.color : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-xs ${
                        passwordStrength.level <= 2 ? 'text-red-500' : passwordStrength.level <= 3 ? 'text-amber-500' : 'text-emerald-600'
                      }`}>
                        密码强度：{passwordStrength.label}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="block text-sm font-medium text-gray-700">
                    确认新密码 <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                      placeholder="请再次输入新密码"
                      className="h-11 pl-10 pr-11 rounded-lg border-gray-200 text-sm"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordForm.confirm_password && passwordForm.new_password !== passwordForm.confirm_password && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                      <XCircle className="w-3.5 h-3.5" />
                      两次输入的密码不一致
                    </p>
                  )}
                  {passwordForm.confirm_password && passwordForm.new_password === passwordForm.confirm_password && passwordForm.confirm_password.length >= 8 && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      密码一致
                    </p>
                  )}
                </div>
              </div>

              {/* Message + Submit */}
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
                <div>
                  {passwordMessage && (
                    <div className={`flex items-center gap-2 text-sm ${passwordMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {passwordMessage.type === 'success'
                        ? <CheckCircle2 className="w-4 h-4" />
                        : <XCircle className="w-4 h-4" />
                      }
                      {passwordMessage.text}
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={
                    changePassword.isPending
                    || !passwordForm.old_password
                    || !passwordForm.new_password
                    || !passwordForm.confirm_password
                    || passwordForm.new_password !== passwordForm.confirm_password
                    || passwordForm.new_password.length < 8
                  }
                  className="btn-primary h-10 px-6 rounded-lg text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {changePassword.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      修改中...
                    </span>
                  ) : (
                    '修改密码'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ─── Section 3: 登录记录 ─── */}
        <div className="bg-white rounded-xl border border-surface-border overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-violet-500 rounded-full" />
              <span className="text-sm font-medium text-gray-900">登录记录</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              <span>共 {logsTotal} 条记录</span>
            </div>
          </div>

          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">IP地址</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">设备信息</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logsLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 w-28 bg-gray-200 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-36 bg-gray-200 rounded" /></td>
                    <td className="px-6 py-4 text-center"><div className="w-14 h-6 bg-gray-200 rounded-full mx-auto" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-32 bg-gray-200 rounded" /></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-gray-500 text-sm">暂无登录记录</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 font-mono">{log.ip || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{parseUserAgent(log.user_agent)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {log.status === 'success' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" />
                          成功
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                          <XCircle className="w-3 h-3" />
                          失败
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">
                        {new Date(log.created_at).toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {logsTotal > 0 && (
            <div className="px-6 py-4 border-t border-surface-border flex items-center justify-between">
              <div className="text-sm text-gray-500">
                显示 {(logsPage - 1) * LOGS_PAGE_SIZE + 1}-{Math.min(logsPage * LOGS_PAGE_SIZE, logsTotal)} 条，共 {logsTotal} 条
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                  disabled={logsPage === 1}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: logsTotalPages }, (_, i) => i + 1)
                  .filter(p => {
                    if (logsTotalPages <= 5) return true;
                    if (p === 1 || p === logsTotalPages) return true;
                    return Math.abs(p - logsPage) <= 1;
                  })
                  .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === '...' ? (
                      <span key={`ellipsis-${i}`} className="px-2 text-gray-400">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setLogsPage(p)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          logsPage === p
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setLogsPage(p => Math.min(logsTotalPages, p + 1))}
                  disabled={logsPage === logsTotalPages}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
