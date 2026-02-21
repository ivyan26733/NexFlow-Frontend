'use client'

import { useEffect, useRef, useCallback } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import type { NodeExecutionEvent } from './index'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:8090/ws'

interface Options {
  executionId: string | null
  onEvent:     (event: NodeExecutionEvent) => void
}

export function useExecutionSocket({ executionId, onEvent }: Options) {
  const clientRef = useRef<Client | null>(null)

  const connect = useCallback(() => {
    if (!executionId) return

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      onConnect: () => {
        // Subscribe to events for this specific execution
        client.subscribe(`/topic/execution/${executionId}`, (msg) => {
          const event: NodeExecutionEvent = JSON.parse(msg.body)
          onEvent(event)
        })
      },
      onDisconnect: () => clientRef.current = null,
    })

    client.activate()
    clientRef.current = client
  }, [executionId, onEvent])

  useEffect(() => {
    connect()
    return () => { clientRef.current?.deactivate() }
  }, [connect])
}
