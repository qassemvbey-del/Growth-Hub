'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'

interface AvatarProps {
  name?: string | null
  avatarUrl?: string | null
  size?: number
  className?: string
  borderClass?: string
  title?: string
}

const BG_PALETTE = [
  'bg-teal-600',
  'bg-amber-600',
  'bg-purple-600',
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-rose-600',
  'bg-cyan-600',
  'bg-orange-600',
]

function getInitials(name?: string | null): string {
  if (!name) return 'OP'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

function getColorForName(name?: string | null): string {
  if (!name) return BG_PALETTE[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const idx = Math.abs(hash) % BG_PALETTE.length
  return BG_PALETTE[idx]
}

export default function Avatar({
  name,
  avatarUrl,
  size = 22,
  className,
  borderClass,
  title,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false)
  const initials = getInitials(name)
  const bgClass = getColorForName(name)

  const showImage = Boolean(avatarUrl) && !imgError

  return (
    <div
      title={title || name || 'User'}
      className={cn(
        "rounded-full flex items-center justify-center relative overflow-hidden shrink-0 font-body font-semibold text-white select-none",
        borderClass,
        !showImage && bgClass,
        className
      )}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${Math.max(7, Math.floor(size * 0.4))}px`,
      }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl!}
          alt={name || 'Avatar'}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  )
}
