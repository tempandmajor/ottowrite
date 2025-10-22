import Link from 'next/link'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem as BreadcrumbItemUI,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export interface BreadcrumbNavItem {
  label: string
  href?: string
}

interface BreadcrumbNavProps {
  items: BreadcrumbNavItem[]
  className?: string
}

function truncateText(text: string, maxLength: number = 30): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

export function BreadcrumbNav({ items, className }: BreadcrumbNavProps) {
  if (items.length === 0) return null

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const truncatedLabel = truncateText(item.label)

          return (
            <div key={index} className="inline-flex items-center gap-1.5">
              <BreadcrumbItemUI>
                {isLast ? (
                  <BreadcrumbPage title={item.label}>
                    {truncatedLabel}
                  </BreadcrumbPage>
                ) : item.href ? (
                  <BreadcrumbLink asChild>
                    <Link href={item.href} title={item.label}>
                      {truncatedLabel}
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <span className="text-muted-foreground" title={item.label}>
                    {truncatedLabel}
                  </span>
                )}
              </BreadcrumbItemUI>
              {!isLast && <BreadcrumbSeparator />}
            </div>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
