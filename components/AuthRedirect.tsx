'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { isLoggedIn } from '@/lib/auth'

const PUBLIC_PATHS = ['/login', '/signup', '/verify-otp']

export default function AuthRedirect() {
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return
    if (!isLoggedIn()) {
      router.replace('/login')
    }
  }, [pathname, router])

  return null
}
