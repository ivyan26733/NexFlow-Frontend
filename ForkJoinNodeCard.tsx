'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NODE_META, CATEGORY_META } from '@/lib/nodeConfig'
import { NodeIcon } from '@/components/studio/nodeIcons'
import { StatusBadge, nodeVars } from '@/FlowNodeCard'
import type { ForkJoinNodeData, BranchStatus, ForkNodeConfig } from '@/types'

const LANE_WIDTH = 96

const BRANCH_TEXT: Record<BranchStatus, string> = {
  PENDING:   'waiting',
  RUNNING:   'running',
  SUCCESS:   'done',
  FAILURE:   'failed',
  TIMEOUT:   'timed out',
  CANCELLED: 'cancelled',
}

/**
 * FORK — one input, one output *per branch*. Each branch is a lane; the lane's handle sits
 * directly under its name, so it is obvious which wire belongs to which branch.
 * JOIN — many inputs merge into one handle; shows how many branches have finished.
 * Amber = "runs at the same time".
 */
export default function ForkJoinNodeCard({ data, selected }: NodeProps) {
  const d        = data as unknown as ForkJoinNodeData
  const isFork   = d.nodeType === 'FORK'
  const meta     = isFork ? NODE_META.FORK : NODE_META.JOIN
  const branches = isFork ? ((d.config as ForkNodeConfig).branches ?? []) : []
  const statuses = d.branchStatuses ?? {}

  const joinTotal = Object.keys(statuses).length
  const joinDone  = Object.values(statuses).filter(s => s === 'SUCCESS' || s === 'FAILURE' || s === 'TIMEOUT').length
  const width     = isFork ? Math.max(248, branches.length * LANE_WIDTH) : 248

  return (
    <div
      className={`nf-node nf-node--parallel${selected ? ' is-selected' : ''}`}
      data-status={d.liveStatus ?? undefined}
      style={{ ...nodeVars(meta.color, meta.bgColor, d.liveStatus), width, maxWidth: 'none' }}
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
        <StatusBadge status={d.liveStatus} />
      </div>

      {isFork ? (
        branches.length > 0 ? (
          <div className="nf-lanes">
            {branches.map(name => {
              const s = statuses[name] ?? 'PENDING'
              return (
                <div key={name} className="nf-lane" data-status={s} title={`${name}: ${BRANCH_TEXT[s]}`}>
                  <span className="nf-lane__name">{name}</span>
                  {d.liveStatus && <span className="nf-lane__status">{BRANCH_TEXT[s]}</span>}
                  <span className="nf-lane__arrow" aria-hidden>↓</span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="nf-node__body"><span className="nf-node__empty">Add branches — click to configure</span></div>
        )
      ) : (
        <div className="nf-node__body">
          {joinTotal > 0 ? (
            <div className="nf-progress" title={`${joinDone} of ${joinTotal} branches finished`}>
              <div className="nf-progress__bar"><span style={{ width: `${(joinDone / joinTotal) * 100}%` }} /></div>
              <span className="nf-progress__text">{joinDone}/{joinTotal} branches finished</span>
            </div>
          ) : (
            <code className="nf-node__preview">merges branch results</code>
          )}
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
