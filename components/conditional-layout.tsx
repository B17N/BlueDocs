'use client'

import { usePathname } from 'next/navigation'
import type React from 'react'
import { WalletProvider } from '@/components/wallet-provider'

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // 如果是 /test 路径或其子路径，或者是 /view 路径，不使用布局和钱包
  if (pathname?.startsWith('/test') || pathname?.startsWith('/view')) {
    return <>{children}</>
  }
  
  // 普通页面：包裹 WalletProvider，但不添加额外布局
  return (
    <WalletProvider>
      {children}
    </WalletProvider>
  )
} 