'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type ConvPreview = {
  count: number
  lastMessage: string
  lastDate: string
}

export default function ChatNotification() {
  const [preview, setPreview] = useState<ConvPreview | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetch('/api/chat-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'get-preview',
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          return null
        }

        return res.json()
      })
      .then((data) => {
        if (data?.conversation) {
          const lastConv = data.conversation
          const lastMsg = lastConv.messages[lastConv.messages.length - 1]?.content || ''
          const date = new Date(lastConv.updated_at || lastConv.created_at)
          const now = new Date()
          const diffHours = Math.floor((now.getTime() - date.getTime()) / 3600000)
          
          let timeStr = ''
          if (diffHours < 1) timeStr = 'just now'
          else if (diffHours < 24) timeStr = `${diffHours}h ago`
          else if (diffHours < 168) timeStr = `${Math.floor(diffHours / 24)}d ago`
          else timeStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

          setPreview({
            count: data.count ?? 1,
            lastMessage: lastMsg.slice(0, 60) + (lastMsg.length > 60 ? '…' : ''),
            lastDate: timeStr,
          })
        }
      })
      .catch(() => {})
  }, [])

  if (!preview || dismissed) return null

  return (
    <Link
      href="/chat-history"
      onClick={() => setDismissed(false)}
      className="fixed right-4 sm:right-5 z-[9000] bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-lg p-3 max-w-xs hover:shadow-xl transition hover:scale-105 duration-200 border border-white/20 top-24 sm:top-auto sm:bottom-[88px]"
    >
      <div className="flex items-start gap-2">
        <span className="text-lg mt-0.5 shrink-0">💬</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm">You have {preview.count} chat{preview.count !== 1 ? 's' : ''}</p>
          <p className="text-xs text-blue-100 line-clamp-1">{preview.lastMessage}</p>
          <p className="text-xs text-blue-200 mt-0.5">{preview.lastDate}</p>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault()
            setDismissed(true)
          }}
          className="ml-2 shrink-0 text-blue-100 hover:text-white transition"
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      </div>
    </Link>
  )
}
