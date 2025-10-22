'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Menu,
  X,
  LayoutPanelLeft,
  Folder,
  FileText,
  PenTool,
  BarChart3,
  Settings,
  BookOpen,
  Users,
  Globe,
  TrendingUp,
  PieChart,
  Target,
  User,
  CreditCard,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type NavItem = {
  label: string
  href: string
  icon: React.ElementType
}

type NavGroup = {
  label: string
  icon: React.ElementType
  items: NavItem[]
}

type Route = NavItem | NavGroup

function isNavGroup(route: Route): route is NavGroup {
  return 'items' in route
}

const routes: Route[] = [
  {
    label: 'Overview',
    href: '/dashboard',
    icon: LayoutPanelLeft,
  },
  {
    label: 'Projects',
    href: '/dashboard/projects',
    icon: Folder,
  },
  {
    label: 'Documents',
    href: '/dashboard/documents',
    icon: FileText,
  },
  {
    label: 'Editor Tools',
    icon: PenTool,
    items: [
      {
        label: 'Outlines',
        href: '/dashboard/outlines',
        icon: BookOpen,
      },
      {
        label: 'Characters',
        href: '/dashboard/characters',
        icon: Users,
      },
      {
        label: 'World Building',
        href: '/dashboard/world-building',
        icon: Globe,
      },
    ],
  },
  {
    label: 'Analytics',
    icon: BarChart3,
    items: [
      {
        label: 'Writing Stats',
        href: '/dashboard/analytics',
        icon: TrendingUp,
      },
      {
        label: 'AI Usage',
        href: '/dashboard/account/usage',
        icon: PieChart,
      },
      {
        label: 'Goals',
        href: '/dashboard/goals',
        icon: Target,
      },
    ],
  },
  {
    label: 'Settings',
    icon: Settings,
    items: [
      {
        label: 'Profile',
        href: '/dashboard/settings',
        icon: User,
      },
      {
        label: 'Account',
        href: '/dashboard/account',
        icon: CreditCard,
      },
    ],
  },
]

export function DashboardNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    // Auto-expand groups that contain the current page
    return routes
      .filter(isNavGroup)
      .filter(group => group.items.some(item => pathname.startsWith(item.href)))
      .map(group => group.label)
  })

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    )
  }

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
            {routes.map((route) => {
              if (isNavGroup(route)) {
                const isExpanded = expandedGroups.includes(route.label)
                const hasActiveChild = route.items.some(item =>
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                )

                return (
                  <li key={route.label}>
                    <button
                      onClick={() => toggleGroup(route.label)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary/60 hover:text-foreground',
                        hasActiveChild && 'bg-secondary/40 text-foreground'
                      )}
                      aria-expanded={isExpanded}
                    >
                      <route.icon className="h-4 w-4" />
                      <span className="flex-1 text-left">{route.label}</span>
                      <ChevronRight
                        className={cn(
                          'h-4 w-4 transition-transform',
                          isExpanded && 'rotate-90'
                        )}
                      />
                    </button>
                    {isExpanded && (
                      <ul className="ml-4 mt-1 space-y-1 border-l border-border/40 pl-3">
                        {route.items.map((item) => {
                          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                          return (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                onClick={() => setOpen(false)}
                                className={cn(
                                  'flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-secondary/60 hover:text-foreground',
                                  active && 'bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground'
                                )}
                              >
                                <item.icon className="h-3.5 w-3.5" />
                                {item.label}
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </li>
                )
              } else {
                const active = pathname === route.href || pathname.startsWith(`${route.href}/`)
                return (
                  <li key={route.href}>
                    <Link
                      href={route.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary/60 hover:text-foreground',
                        active && 'bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground'
                      )}
                    >
                      <route.icon className="h-4 w-4" />
                      {route.label}
                    </Link>
                  </li>
                )
              }
            })}
          </ul>
        </div>
      </nav>
    </>
  )
}
