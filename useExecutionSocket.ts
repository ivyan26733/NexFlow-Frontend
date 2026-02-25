'use client'

import { useEffect, useRef, useCallback } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import type { NodeExecutionEvent } from './index'

// Derive from API URL when not set — ensures production uses correct backend (Vercel only needs NEXT_PUBLIC_API_URL)
const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ??
  (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/ws` : null) ??
  'http://localhost:8090/ws'

interface Options {
  executionId: string | null
  onEvent:     (event: NodeExecutionEvent) => void
}

export function useExecutionSocket({ executionId, onEvent }: Options) {
  const clientRef = useRef<Client | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    if (!executionId) return

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      onConnect: () => {
        client.subscribe(`/topic/execution/${executionId}`, (msg) => {
          const event: NodeExecutionEvent = JSON.parse(msg.body)
          onEventRef.current(event)
        })
      },
      onDisconnect: () => { clientRef.current = null },
    })

    client.activate()
    clientRef.current = client
    return () => {
      clientRef.current?.deactivate()
      clientRef.current = null
    }
  }, [executionId])
}
