import { useState } from 'react'
import { User, Smartphone } from 'lucide-react'
import LoginForm from './LoginForm'
import SmsLoginForm from './SmsLoginForm'

type TabType = 'password' | 'sms'

interface Tab {
  id: TabType
  label: string
  icon: React.ReactNode
}

const tabs: Tab[] = [
  { id: 'password', label: '账号密码', icon: <User className="w-4 h-4" /> },
  { id: 'sms', label: '验证码登录', icon: <Smartphone className="w-4 h-4" /> },
]

interface LoginTabsProps {
  onSuccess?: () => void
}

export default function LoginTabs({ onSuccess }: LoginTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('password')

  return (
    <div>
      {/* Tab 切换 */}
      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      <div className="tab-content">
        {activeTab === 'password' && <LoginForm onSuccess={onSuccess} />}
        {activeTab === 'sms' && <SmsLoginForm onSuccess={onSuccess} />}
      </div>
    </div>
  )
}
