'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { useIdleTimeout } from '@/hooks/useIdleTimeout'

const TIMEOUT_CONFIG: Record<string, { timeoutMinutes: number; warningMinutes: number }> = {
  admin: { timeoutMinutes: 30, warningMinutes: 2 },
  owner: { timeoutMinutes: 60, warningMinutes: 2 },
}

export default function SessionTimeoutGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setRole(null)
      return
    }
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setRole((data as { role: string } | null)?.role ?? null))
  }, [user])

  const config = role ? (TIMEOUT_CONFIG[role] ?? null) : null
  const enabled = config !== null

  const handleTimeout = async () => {
    await supabase.auth.signOut()
    router.push('/login?reason=timeout')
  }

  const { showWarning, remainingSeconds, resetTimer } = useIdleTimeout({
    timeoutMinutes: config?.timeoutMinutes ?? 60,
    warningMinutes: config?.warningMinutes ?? 2,
    onTimeout: handleTimeout,
    enabled,
  })

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {children}
      {showWarning && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="timeout-dialog-title"
        >
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h2 id="timeout-dialog-title" className="text-lg font-semibold text-gray-900 mb-2">
              まもなく自動ログアウトされます
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              セキュリティのため、まもなく自動的にログアウトされます。
              操作を続けますか？
            </p>
            <p className="text-3xl font-bold text-center text-red-600 mb-6 tabular-nums">
              {remainingSeconds}秒
            </p>
            <div className="flex gap-3">
              <button
                onClick={resetTimer}
                className="flex-1 bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-800 transition-colors"
              >
                ログイン状態を維持
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                今すぐログアウト
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
