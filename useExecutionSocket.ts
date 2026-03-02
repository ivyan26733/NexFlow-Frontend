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

if (typeof window !== 'undefined') {
  // Basic runtime logger so we can see which WS URL the client is using in prod/dev.
  // NOTE: For SockJS this MUST be http(s), not ws(s).
  // If you see a ws:// or wss:// value here, fix NEXT_PUBLIC_WS_URL / NEXT_PUBLIC_API_URL.
  // eslint-disable-next-line no-console
  console.info('[useExecutionSocket] WS_URL resolved to', WS_URL)
}

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
        // eslint-disable-next-line no-console
        console.info('[useExecutionSocket] STOMP connected, subscribing to', topic)
        client.subscribe(topic, (msg) => {
          try {
            const event: NodeExecutionEvent = JSON.parse(msg.body)
            onEventRef.current(event)
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error('[useExecutionSocket] Failed to parse WS event', e, msg.body)
          }
        })
      },
      onStompError: (frame) => {
        // eslint-disable-next-line no-console
        console.error('[useExecutionSocket] STOMP error', frame.headers, frame.body)
      },
      onDisconnect: () => {
        // eslint-disable-next-line no-console
        console.info('[useExecutionSocket] STOMP disconnected')
        clientRef.current = null
      },
    })

    // eslint-disable-next-line no-console
    console.info('[useExecutionSocket] Activating STOMP client...')
    client.activate()
    clientRef.current = client
    return () => {
      // eslint-disable-next-line no-console
      console.info('[useExecutionSocket] Deactivating STOMP client...')
      clientRef.current?.deactivate()
      clientRef.current = null
    }
  }, [executionId])
}
