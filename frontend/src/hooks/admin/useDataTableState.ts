import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { SortDirection } from '../../components/admin/ui/data-table'

interface DataTableStateOptions {
  key: string
  defaultSortBy: string
  defaultSortDir?: SortDirection
  defaultPageSize?: number
  filterKeys?: string[]
}

interface TablePatch {
  page?: number
  pageSize?: number
  sortBy?: string
  sortDir?: SortDirection
  filters?: Record<string, string>
}

export function useDataTableState({
  key,
  defaultSortBy,
  defaultSortDir = 'asc',
  defaultPageSize = 50,
  filterKeys = [],
}: DataTableStateOptions) {
  const [searchParams, setSearchParams] = useSearchParams()
  const read = (name: string, fallback: string) => searchParams.get(`${key}_${name}`) || fallback
  const page = Math.max(0, Number(read('page', '0')) || 0)
  const pageSize = Math.min(200, Math.max(25, Number(read('pageSize', String(defaultPageSize))) || defaultPageSize))
  const sortBy = read('sortBy', defaultSortBy)
  const sortDir = (read('sortDir', defaultSortDir) === 'desc' ? 'desc' : 'asc') as SortDirection
  // filterKeys is passed as a fresh array literal by callers on every render
  // (e.g. `filterKeys: ['search', 'trang_thai']`), so its reference changes
  // every render even though its contents don't. Deriving a primitive string
  // key keeps the memo/callback dependencies stable across renders and
  // prevents them from being reconstructed every render, which would
  // otherwise retrigger any effect that depends on `filters` (infinite
  // fetch loop) on the pages that consume this hook.
  const filterKeysDep = filterKeys.join('|')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filters = useMemo(() => Object.fromEntries(filterKeys.map((filterKey) => [filterKey, searchParams.get(`${key}_${filterKey}`) || '']).filter(([, value]) => value)), [filterKeysDep, searchParams, key])

  const patch = useCallback((next: TablePatch) => {
    const params = new URLSearchParams(searchParams)
    const setOrDelete = (name: string, value: string | number | undefined, fallback?: string) => {
      const prefixed = `${key}_${name}`
      if (value === undefined || String(value) === fallback || value === '') params.delete(prefixed)
      else params.set(prefixed, String(value))
    }

    const changingFilters = next.filters !== undefined
    const changingSort = next.sortBy !== undefined || next.sortDir !== undefined
    setOrDelete('page', changingFilters || changingSort ? 0 : next.page, '0')
    setOrDelete('pageSize', next.pageSize, String(defaultPageSize))
    setOrDelete('sortBy', next.sortBy, defaultSortBy)
    setOrDelete('sortDir', next.sortDir, defaultSortDir)
    if (next.filters) {
      filterKeys.forEach((filterKey) => {
        const value = next.filters?.[filterKey] || ''
        setOrDelete(filterKey, value)
      })
    }
    setSearchParams(params, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultPageSize, defaultSortBy, defaultSortDir, filterKeysDep, key, searchParams, setSearchParams])

  return { page, pageSize, skip: page * pageSize, sortBy, sortDir, filters, patch }
}
