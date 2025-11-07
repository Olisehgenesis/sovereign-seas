'use client'

import { PopupAd } from './AdSlots'

type PopupAdClientProps = {
  consumerId?: string
  delay?: number
  enabled?: boolean
}

export default function PopupAdClient(props: PopupAdClientProps) {
  return <PopupAd {...props} />
}

