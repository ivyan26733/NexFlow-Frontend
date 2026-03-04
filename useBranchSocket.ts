'use client'

import { useEffect, useRef } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import type { BranchExecutionEvent } from '@/types'

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ??
  (process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/ws`
    : null) ??
  'http://localhost:8090/ws'

interface UseBranchSocketProps {
  executionId:    string | null
  onBranchEvent:  (event: BranchExecutionEvent) => void
}

export function useBranchSocket({ executionId, onBranchEvent }: UseBranchSocketProps) {
  const clientRef  = useRef<Client | null>(null)
  const onEventRef = useRef(onBranchEvent)
  onEventRef.current = onBranchEvent

  useEffect(() => {
    if (!executionId) return

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),

      onConnect: () => {
        const destination = `/queue/branch.${executionId}`
        // eslint-disable-next-line no-console
        console.info('[useBranchSocket] subscribing to', destination)

        client.subscribe(destination, (msg) => {
          try {
            const event = JSON.parse(msg.body) as BranchExecutionEvent
            if ((event as any).type && (event as any).type !== 'BRANCH_EVENT') return
            onEventRef.current(event)
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error('[useBranchSocket] failed to parse message', e, msg.body)
          }
        })
      },

      onStompError: (frame) => {
        // eslint-disable-next-line no-console
        console.error('[useBranchSocket] STOMP error', frame.headers, frame.body)
      },

      onDisconnect: () => {
        // eslint-disable-next-line no-console
        console.info('[useBranchSocket] disconnected')
        clientRef.current = null
      },
    })

    // eslint-disable-next-line no-console
    console.info('[useBranchSocket] Activating STOMP client...')
    client.activate()
    clientRef.current = client

    return () => {
      // eslint-disable-next-line no-console
      console.info('[useBranchSocket] deactivating for executionId', executionId)
      clientRef.current?.deactivate()
      clientRef.current = null
    }
  }, [executionId])
}

