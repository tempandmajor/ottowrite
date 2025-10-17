'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

type Section = {
  id: string
  label: string
}

type SectionNavProps = {
  sections: Section[]
  current: string
  onSelect: (id: string) => void
}

export function SectionNav({ sections, current, onSelect }: SectionNavProps) {
  const [indicatorStyle, setIndicatorStyle] = useState<{ top: number; height: number }>({ top: 0, height: 0 })

  useEffect(() => {
    const activeEl = document.querySelector<HTMLButtonElement>(`button[data-section="${current}"]`)
    if (activeEl) {
      setIndicatorStyle({ top: activeEl.offsetTop, height: activeEl.offsetHeight })
    }
  }, [current])

  return (
    <div className="relative flex flex-col gap-1">
      <motion.span
        className="absolute left-0 w-1 rounded-full bg-primary"
        animate={{ top: indicatorStyle.top, height: indicatorStyle.height }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />
      <div className="flex flex-col gap-1 rounded-2xl border bg-card/70 p-3 shadow-sm">
        {sections.map((section) => {
          const active = section.id === current
          return (
            <button
              key={section.id}
              data-section={section.id}
              type="button"
              onClick={() => onSelect(section.id)}
              className={cn(
                'relative z-10 flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:text-primary',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {section.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
