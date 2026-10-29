'use client'

import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, MarkerType, type Edge, type EdgeProps } from '@xyflow/react'
import { EDGE_STYLE, type EdgeKind } from '@/lib/nodeConfig'

export interface SemanticEdgeData extends Record<string, unknown> {
  conditionType?: string
  kind?: EdgeKind
  label?: string
}

/** Work out what an edge *means* from the handle it leaves and the node it leaves from. */
export function edgeKind(edge: Pick<Edge, 'sourceHandle' | 'data'>, sourceType?: string): { kind: EdgeKind; label: string } {
  const handle = edge.sourceHandle ?? undefined
  const cond   = (edge.data as SemanticEdgeData | undefined)?.conditionType
  if (handle === 'continue' || cond === 'CONTINUE') return { kind: 'continue', label: EDGE_STYLE.continue.label }
  if (handle === 'failure'  || cond === 'FAILURE')  return { kind: 'failure', label: EDGE_STYLE.failure.label }
  if (sourceType === 'FORK' && handle)              return { kind: 'branch', label: handle }
  if (handle === 'exit')                            return { kind: 'success', label: 'exit' }
  // Plain success edges stay unlabelled — the solid green line already says it; labels are kept for the exceptions.
  if (handle === 'success')                         return { kind: 'success', label: '' }
  return { kind: 'default', label: '' }
}

export function edgeMarker(kind: EdgeKind) {
  // userSpaceOnUse keeps the arrowhead the same size no matter how thick the line is drawn.
  return { type: MarkerType.ArrowClosed, color: EDGE_STYLE[kind].color, width: 44, height: 44, markerUnits: 'userSpaceOnUse' }
}

/**
 * Line style carries the meaning even without colour:
 *   solid = happy path · dashed = error path · dotted = loop back · labelled = parallel branch.
 */
export function SemanticEdge({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
  markerEnd, selected, data,
}: EdgeProps<Edge<SemanticEdgeData>>) {
  const kind  = data?.kind ?? 'default'
  const style = EDGE_STYLE[kind]
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
    borderRadius: 14,
    offset: kind === 'continue' ? 36 : 22,
  })

  const cls = [
    'nf-edge',
    `nf-edge--${kind}`,
    selected ? 'is-selected' : '',
  ].filter(Boolean).join(' ')

  return (
    <>
      {selected && <path d={path} className="nf-edge__halo" fill="none" />}
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        className={cls}
        interactionWidth={24}
        style={{ stroke: style.color, strokeDasharray: style.dash }}
      />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            className="nf-edge-label nodrag nopan"
            data-kind={kind}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, ['--ec' as string]: style.color }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
