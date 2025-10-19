'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X, LayoutPanelLeft, Pen, Settings, BookOpenText, BarChart3, PieChart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const routes = [
  {
    label: 'Overview',
    href: '/dashboard',
    icon: LayoutPanelLeft,
  },
  {
    label: 'Projects',
    href: '/dashboard/projects',
    icon: Pen,
  },
  {
    label: 'Documents',
    href: '/dashboard/documents',
    icon: BookOpenText,
  },
  {
    label: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
  },
  {
    label: 'Usage',
    href: '/dashboard/account/usage',
    icon: PieChart,
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
]

export function DashboardNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="lg:hidden"
        aria-label="Toggle navigation menu"
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>
      <nav
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 translate-x-[-100%] border-r bg-background/95 px-6 py-8 shadow-lg transition-transform lg:static lg:block lg:w-72 lg:translate-x-0 lg:bg-transparent lg:shadow-none',
          open && 'translate-x-0'
        )}
      >
        <div className="flex h-full flex-col gap-8">
          <div className="flex items-center justify-between">
            <span className="text-xl font-semibold">Ottowrite</span>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Close navigation menu"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <ul className="flex flex-1 flex-col gap-1">
            {routes.map(({ label, href, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`)
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary/60 hover:text-foreground',
                      active && 'bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>
    </>
  )
}
