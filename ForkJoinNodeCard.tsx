'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NODE_META, CATEGORY_META } from '@/lib/nodeConfig'
import { NodeIcon } from '@/components/studio/nodeIcons'
import { nodeVars } from '@/FlowNodeCard'
import type { ForkJoinNodeData, ForkNodeConfig } from '@/types'

const LANE_WIDTH = 96

/**
 * FORK — one input, one output *per branch*. Each branch is a lane; the lane's handle sits
 * directly under its name, so it is obvious which wire belongs to which branch.
 * JOIN — many inputs merge into one handle; the run continues from here once the branches finish.
 * Amber = "runs at the same time".
 */
export default function ForkJoinNodeCard({ data, selected }: NodeProps) {
  const d        = data as unknown as ForkJoinNodeData
  const isFork   = d.nodeType === 'FORK'
  const meta     = isFork ? NODE_META.FORK : NODE_META.JOIN
  const branches = isFork ? ((d.config as ForkNodeConfig).branches ?? []) : []
  const width     = isFork ? Math.max(248, branches.length * LANE_WIDTH) : 248

  return (
    <div
      className={`nf-node nf-node--parallel${selected ? ' is-selected' : ''}`}
      style={{ ...nodeVars(meta.color, meta.bgColor), width, maxWidth: 'none' }}
      title={meta.description}
    >
      <Handle type="target" position={Position.Top} className="nf-handle nf-handle--in" />

      <div className="nf-node__head">
        <span className="nf-node__icon"><NodeIcon type={d.nodeType} size={16} /></span>
        <div className="nf-node__titles">
          <div className="nf-node__title">{d.label || meta.label}</div>
          <div className="nf-node__caption">
            {CATEGORY_META.PARALLEL.label} · {isFork
              ? `${branches.length} branch${branches.length === 1 ? '' : 'es'}`
              : 'waits for all branches'}
          </div>
        </div>
      </div>

      {isFork ? (
        branches.length > 0 ? (
          <div className="nf-lanes">
            {branches.map(name => (
              <div key={name} className="nf-lane" title={`Branch: ${name}`}>
                <span className="nf-lane__name">{name}</span>
                <span className="nf-lane__arrow" aria-hidden>↓</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="nf-node__body"><span className="nf-node__empty">Add branches — click to configure</span></div>
        )
      ) : (
        <div className="nf-node__body">
          <code className="nf-node__preview">merges branch results</code>
        </div>
      )}

      {isFork && branches.length > 0 ? (
        branches.map((name, i) => (
          <Handle
            key={name}
            id={name}
            type="source"
            position={Position.Bottom}
            className="nf-handle nf-handle--branch"
            style={{ left: `${((i + 0.5) / branches.length) * 100}%` }}
            title={`Branch: ${name}`}
          />
        ))
      ) : (
        <Handle type="source" position={Position.Bottom} className="nf-handle nf-handle--out" />
      )}
    </div>
  )
}
