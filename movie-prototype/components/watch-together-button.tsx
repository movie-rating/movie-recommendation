'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'
import { WatchTogetherModal } from './watch-together-modal'

interface WatchTogetherButtonProps {
  sessionId: string
}

export function WatchTogetherButton({ sessionId }: WatchTogetherButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
      >
        <Users className="w-4 h-4 mr-2" />
        Watch Together
      </Button>

      <WatchTogetherModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        sessionId={sessionId}
      />
    </>
  )
}
