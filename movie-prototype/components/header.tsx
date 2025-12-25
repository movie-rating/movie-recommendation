'use client'

import { ThemeSwitcher } from './theme-switcher'

interface HeaderProps {
  showActions?: boolean
  transparent?: boolean
}

export function Header({ showActions = true, transparent = false }: HeaderProps) {
  return (
    <header className={`sticky top-0 z-50 transition-colors duration-300 ${
      transparent 
        ? 'bg-transparent border-transparent' 
        : 'border-b bg-card/80 backdrop-blur-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎬</span>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold leading-tight">TasteMatch</h1>
            <span className="text-xs text-muted-foreground hidden sm:block">AI-Powered Movie Discovery</span>
          </div>
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



