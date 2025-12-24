'use client'

import { ThemeSwitcher } from './theme-switcher'

interface HeaderProps {
  showActions?: boolean
}

export function Header({ showActions = true }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎬</span>
          <h1 className="text-xl font-bold">TasteMatch</h1>
        </div>
        
        {showActions && (
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
          </div>
        )}
      </div>
    </header>
  )
}

