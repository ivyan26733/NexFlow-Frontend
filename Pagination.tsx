import { useEffect, useMemo, useState } from 'react'

export interface UsePaginationResult<T> {
  pageItems: T[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  canPrev: boolean
  canNext: boolean
  setPage: (page: number) => void
  setPageSize: (size: number) => void
}

export function usePagination<T>(items: T[], initialPageSize = 10): UsePaginationResult<T> {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  useEffect(() => {
    setPage(1)
  }, [items, pageSize])

  const pageItems = useMemo(() => {
    const safePage = Math.min(Math.max(1, page), totalPages)
    const start = (safePage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, page, pageSize, totalPages])

  return {
    pageItems,
    page,
    pageSize,
    totalItems,
    totalPages,
    canPrev: page > 1,
    canNext: page < totalPages,
    setPage,
    setPageSize,
  }
}

interface PaginationControlsProps {
  page: number
  totalPages: number
  totalItems: number
  pageSize: number
  pageSizeOptions?: number[]
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export function PaginationControls({
  page,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  if (totalItems === 0) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(totalItems, page * pageSize)

  return (
    <div className="pagination-bar">
      <div className="pagination-summary">
        <span>Showing</span>
        <strong>{start}</strong>
        <span>–</span>
        <strong>{end}</strong>
        <span>of</span>
        <strong>{totalItems}</strong>
      </div>
      <div className="pagination-controls">
        <div className="pagination-page-size">
          <span>Rows:</span>
          <select
            className="input-base"
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <div className="pagination-buttons">
          <button
            type="button"
            className="pagination-btn"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            Prev
          </button>
          <span className="pagination-page-indicator">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="pagination-btn"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

