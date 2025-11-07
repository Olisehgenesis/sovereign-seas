'use client'

import { useEffect, useRef, useState } from 'react'
import { Banner, Popup, Sidebar } from 'sovads-sdk'
import { getSovAdsClient } from '@/lib/sovads-client'

type SharedAdProps = {
  consumerId?: string
  className?: string
  placeholder?: React.ReactNode
}

const generateSlotId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`

export function BannerAd({ consumerId, className, placeholder }: SharedAdProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [slotId] = useState(() => generateSlotId('sovads-banner'))
  const [hasRendered, setHasRendered] = useState(false)

  useEffect(() => {
    const client = getSovAdsClient()
    const container = containerRef.current

    if (!client || !container) {
      return
    }

    container.id = slotId
    const banner = new Banner(client, slotId)

    let isMounted = true

    banner
      .render(consumerId)
      .then(() => {
        if (isMounted) {
          setHasRendered(true)
        }
      })
      .catch((error) => {
        console.error('Failed to render banner ad', error)
      })

    return () => {
      isMounted = false
      client.removeComponent(slotId)
      container.replaceChildren()
    }
  }, [consumerId, slotId])

  return (
    <div
      ref={containerRef}
      className={[
        'sovads-banner-slot w-full',
        !hasRendered ? 'flex items-center justify-center' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {!hasRendered && (placeholder ?? <span className="text-sm text-foreground/60">Loading ad…</span>)}
    </div>
  )
}

export function SidebarAd({ consumerId, className, placeholder }: SharedAdProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [slotId] = useState(() => generateSlotId('sovads-sidebar'))
  const [hasRendered, setHasRendered] = useState(false)

  useEffect(() => {
    const client = getSovAdsClient()
    const container = containerRef.current

    if (!client || !container) {
      return
    }

    container.id = slotId
    const sidebar = new Sidebar(client, slotId)
    let isMounted = true

    sidebar
      .render(consumerId)
      .then(() => {
        if (isMounted) {
          setHasRendered(true)
        }
      })
      .catch((error) => {
        console.error('Failed to render sidebar ad', error)
      })

    return () => {
      isMounted = false
      client.removeComponent(slotId)
      container.replaceChildren()
    }
  }, [consumerId, slotId])

  return (
    <div
      ref={containerRef}
      className={[
        'sovads-sidebar-slot',
        !hasRendered ? 'flex items-center justify-center' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {!hasRendered && (placeholder ?? <span className="text-sm text-foreground/60">Loading ad…</span>)}
    </div>
  )
}

type PopupAdProps = {
  consumerId?: string
  delay?: number
  enabled?: boolean
}

export function PopupAd({ consumerId, delay = 3000, enabled = true }: PopupAdProps) {
  useEffect(() => {
    if (!enabled) {
      return
    }

    const client = getSovAdsClient()

    if (!client) {
      return
    }

    const popup = new Popup(client)

    popup
      .show(consumerId, delay)
      .catch((error) => {
        console.error('Failed to show popup ad', error)
      })

    return () => {
      popup.hide()
    }
  }, [consumerId, delay, enabled])

  return null
}

