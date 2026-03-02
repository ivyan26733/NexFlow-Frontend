'use client'

import { useEffect, useRef } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import type { NodeExecutionEvent } from './index'

// SockJS expects an HTTP(S) URL (it negotiates WebSocket/XHR itself).
// Strategy:
// 1) If NEXT_PUBLIC_WS_URL is set, use it as-is (e.g. https://api.example.com/ws)
// 2) Else if NEXT_PUBLIC_API_URL is set, append /ws to that base (http or https)
// 3) Else fall back to local dev backend: http://localhost:8090/ws
const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ??
  (process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/ws`
    : null) ??
  'http://localhost:8090/ws'

interface Options {
  executionId: string | null
  onEvent: (event: NodeExecutionEvent) => void
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
        const topic = `/topic/execution/${executionId}`
        client.subscribe(topic, (msg) => {
          const event: NodeExecutionEvent = JSON.parse(msg.body)
          onEventRef.current(event)
        })
      },
      onStompError: () => {},
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
