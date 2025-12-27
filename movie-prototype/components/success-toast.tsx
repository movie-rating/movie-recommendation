'use client'

import { useEffect } from 'react'
import { cn } from '@/lib/utils'

type ToastVariant = 'success' | 'error'

interface ToastProps {
  message: string
  show: boolean
  onClose: () => void
  variant?: ToastVariant
}

export function SuccessToast({
  message,
  show,
  onClose,
  variant = 'success'
}: ToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 2500)
      return () => clearTimeout(timer)
    }
  }, [show, onClose])

  if (!show) return null

  const isError = variant === 'error'

  return (
    <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
      <div className={cn(
        'text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2',
        isError ? 'bg-red-600' : 'bg-green-600'
      )}>
        <span className="text-lg">{isError ? '✕' : '✓'}</span>
        <span className="font-medium">{message}</span>
      </div>
    </div>
  )
}
