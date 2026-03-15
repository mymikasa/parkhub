import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string | string[]
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const location = useLocation()
  const { isAuthenticated, user } = useAuthStore()

  // 未登录，重定向到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 检查角色权限
  if (requiredRole && user) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]

    // 角色权限级别：platform_admin > tenant_admin > operator
    const roleLevel: Record<string, number> = {
      platform_admin: 100,
      tenant_admin: 50,
      operator: 10,
    }

    const userLevel = roleLevel[user.role] || 0
    const hasRequiredRole = roles.some((role) => {
      const requiredLevel = roleLevel[role] || 0
      return userLevel >= requiredLevel
    })

    if (!hasRequiredRole) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">403</h1>
            <p className="text-gray-600 mb-6">您没有权限访问此页面</p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              返回上一页
            </button>
          </div>
        </div>
      )
    }
  }

  return <>{children}</>
}
