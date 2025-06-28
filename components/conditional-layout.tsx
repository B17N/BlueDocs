'use client'

import { usePathname } from 'next/navigation'
import type React from 'react'
import { WalletProvider } from '@/hooks/use-wallet'

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // 如果是 /test 路径或其子路径，不使用布局和钱包
  if (pathname?.startsWith('/test')) {
    return <>{children}</>
  }
  
  // 普通页面：包裹 WalletProvider，但不添加额外布局
  return (
    <WalletProvider>
      {children}
    </WalletProvider>
  )
} 