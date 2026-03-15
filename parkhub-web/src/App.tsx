import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import Login from '@/features/auth/Login'
import ProtectedRoute from '@/components/ProtectedRoute'

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Routes>
        {/* 公开路由 */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
        />

        {/* 受保护路由 */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* 默认重定向 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  )
}

// 临时仪表板组件
function Dashboard() {
  const { user, logout } = useAuthStore()

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">ParkHub 管理后台</h1>
          <p className="text-gray-600 mb-4">
            欢迎回来，{user?.real_name || user?.username}！
          </p>
          <div className="flex gap-4">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {user?.role === 'platform_admin' ? '平台管理员' :
               user?.role === 'tenant_admin' ? '租户管理员' : '操作员'}
            </span>
          </div>
          <button
            onClick={logout}
            className="mt-6 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            退出登录
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
