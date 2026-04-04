import type { UserRole } from '@/lib/user/types';

// Avatar gradient colors by first character hash
export const AVATAR_GRADIENTS = [
  'from-blue-500 to-blue-600',
  'from-emerald-500 to-emerald-600',
  'from-amber-500 to-amber-600',
  'from-violet-500 to-violet-600',
  'from-rose-500 to-rose-600',
  'from-cyan-500 to-cyan-600',
  'from-orange-500 to-orange-600',
  'from-indigo-500 to-indigo-600',
];

export function getAvatarGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

export const ROLE_DISPLAY: Record<UserRole, string> = {
  platform_admin: '平台管理员',
  tenant_admin: '租户管理员',
  operator: '操作员',
};

export const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  platform_admin: 'bg-purple-50 text-purple-700',
  tenant_admin: 'bg-blue-50 text-blue-700',
  operator: 'bg-gray-100 text-gray-700',
};
