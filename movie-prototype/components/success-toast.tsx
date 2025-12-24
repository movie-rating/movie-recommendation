'use client'

import { useEffect } from 'react'

export function SuccessToast({ 
  message, 
  show, 
  onClose 
}: { 
  message: string
  show: boolean
  onClose: () => void
}) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 2500)
      return () => clearTimeout(timer)
    }
  }, [show, onClose])

  if (!show) return null

  return (
    <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
      <div className="bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
        <span className="text-lg">✓</span>
        <span className="font-medium">{message}</span>
      </div>
    </div>
  )
}

