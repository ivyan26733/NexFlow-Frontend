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

    console.log('[WS-DEBUG] useExecutionSocket: connecting to', WS_URL, 'executionId=', executionId)
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      onConnect: () => {
        const topic = `/topic/execution/${executionId}`
        console.log('[WS-DEBUG] useExecutionSocket: CONNECTED, subscribing to', topic)
        client.subscribe(topic, (msg) => {
          const event: NodeExecutionEvent = JSON.parse(msg.body)
          console.log('[WS-DEBUG] useExecutionSocket: EVENT received', event)
          onEventRef.current(event)
        })
      },
      onStompError: (frame) => {
        console.error('[WS-DEBUG] useExecutionSocket: STOMP error', frame)
      },
      onWebSocketClose: () => {
        console.log('[WS-DEBUG] useExecutionSocket: WebSocket closed')
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
