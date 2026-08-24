import { useMemo } from 'react'
import {
  Box,
  Checkbox,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material'

export type SortDirection = 'asc' | 'desc'
export type TableStatus = 'idle' | 'loading' | 'error'

export interface Column<T> {
  id: string
  label: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  numeric?: boolean
  hideBelow?: 'sm' | 'md' | 'lg'
}

export interface DataTableProps<T> {
  caption: string
  columns: Column<T>[]
  rows: T[]
  getRowId: (row: T) => string | number
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  sortBy?: string
  sortDir?: SortDirection
  onSortChange?: (sortBy: string, sortDir: SortDirection) => void
  selectedIds?: Set<string | number>
  onSelectionChange?: (ids: Set<string | number>) => void
  bulkActions?: React.ReactNode
  status?: TableStatus
  error?: string | null
  onRetry?: () => void
  hasActiveFilters?: boolean
  onClearFilters?: () => void
  onCreate?: () => void
  onRowClick?: (row: T) => void
  rowActions?: (row: T) => React.ReactNode
  getRowLabel?: (row: T) => string
}

export default function DataTable<T>({
  caption,
  columns,
  rows,
  getRowId,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  sortBy,
  sortDir = 'asc',
  onSortChange,
  selectedIds,
  onSelectionChange,
  bulkActions,
  status = 'idle',
  error,
  onRetry,
  hasActiveFilters = false,
  onClearFilters,
  onCreate,
  onRowClick,
  rowActions,
  getRowLabel = (row) => String(getRowId(row)),
}: DataTableProps<T>) {
  const selectable = Boolean(selectedIds && onSelectionChange)
  const allSelected = selectable && rows.length > 0 && rows.every((row) => selectedIds?.has(getRowId(row)))
  const someSelected = selectable && rows.some((row) => selectedIds?.has(getRowId(row)))
  const loadingRows = useMemo(() => Array.from({ length: Math.min(pageSize, 10) }), [pageSize])

  const toggleRow = (row: T) => {
    if (!selectedIds || !onSelectionChange) return
    const next = new Set(selectedIds)
    const id = getRowId(row)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectionChange(next)
  }

  const togglePage = () => {
    if (!selectedIds || !onSelectionChange) return
    const next = new Set(selectedIds)
    if (allSelected) rows.forEach((row) => next.delete(getRowId(row)))
    else rows.forEach((row) => next.add(getRowId(row)))
    onSelectionChange(next)
  }

  const changeSort = (column: Column<T>) => {
    if (!column.sortable || !onSortChange) return
    onSortChange(column.id, sortBy === column.id && sortDir === 'asc' ? 'desc' : 'asc')
  }

  const cellSx = (column: Column<T>) => ({
    display: { xs: column.hideBelow ? 'none' : 'table-cell', [column.hideBelow || 'xs']: 'table-cell' },
    textAlign: column.numeric ? 'right' : 'left',
  })

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      {bulkActions && selectedIds && selectedIds.size > 0 && (
        <Box role="region" aria-live="polite" sx={{ px: 2, py: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant="body2">Đã chọn {selectedIds.size} dòng</Typography>
          {bulkActions}
        </Box>
      )}
      {error && (
        <Box role="alert" sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography color="error">{error}</Typography>
          {onRetry && <button type="button" onClick={onRetry}>Thử lại</button>}
        </Box>
      )}
      <Box sx={{ display: { xs: 'block', md: 'none' }, p: 1 }}>
        {status === 'loading' && rows.length === 0 && loadingRows.map((_, index) => <Skeleton key={index} height={96} />)}
        {status !== 'loading' && rows.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography>{hasActiveFilters ? 'Không có dòng nào khớp' : 'Chưa có dữ liệu'}</Typography>
            {hasActiveFilters && onClearFilters && <button type="button" onClick={onClearFilters}>Xoá bộ lọc</button>}
            {!hasActiveFilters && onCreate && <button type="button" onClick={onCreate}>Thêm mới</button>}
          </Box>
        )}
        {rows.map((row) => (
          <Box
            key={getRowId(row)}
            component="dl"
            onClick={() => onRowClick?.(row)}
            onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && onRowClick) { event.preventDefault(); onRowClick(row) } }}
            tabIndex={onRowClick ? 0 : undefined}
            sx={{ m: 0, p: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            <Typography component="dt" variant="subtitle2">{getRowLabel(row)}</Typography>
            {columns.slice(0, 4).map((column) => (
              <Box key={column.id} sx={{ display: 'grid', gridTemplateColumns: '42% 58%', gap: 1, mt: 0.5 }}>
                <Typography component="dt" variant="caption" color="text.secondary">{column.label}</Typography>
                <Typography component="dd" variant="body2" sx={{ m: 0 }}>{column.render ? column.render(row) : String((row as Record<string, unknown>)[column.id] ?? '-')}</Typography>
              </Box>
            ))}
            {rowActions && <Box sx={{ mt: 1 }}>{rowActions(row)}</Box>}
          </Box>
        ))}
      </Box>
      <TableContainer sx={{ display: { xs: 'none', md: 'block' }, opacity: status === 'loading' && rows.length > 0 ? 0.55 : 1 }}>
        <Table size="small" aria-label={caption}>
          <caption style={{ textAlign: 'left', padding: 12 }}>{caption}</caption>
          <TableHead>
            <TableRow>
              {selectable && <TableCell padding="checkbox"><Checkbox checked={Boolean(allSelected)} indeterminate={Boolean(someSelected && !allSelected)} onChange={togglePage} inputProps={{ 'aria-label': 'Chọn tất cả dòng trong trang' }} /></TableCell>}
              {columns.map((column) => {
                const active = sortBy === column.id
                return (
                  <TableCell key={column.id} align={column.numeric ? 'right' : 'left'} sx={{ ...cellSx(column), whiteSpace: 'nowrap' }} aria-sort={active ? sortDir === 'asc' ? 'ascending' : 'descending' : undefined}>
                    {column.sortable && onSortChange ? <TableSortLabel active={active} direction={active ? sortDir : 'asc'} onClick={() => changeSort(column)}>{column.label}</TableSortLabel> : column.label}
                  </TableCell>
                )
              })}
              {rowActions && <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>Thao tác</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {status === 'loading' && rows.length === 0 && loadingRows.map((_, index) => <TableRow key={index}>{columns.map((column) => <TableCell key={column.id}><Skeleton /></TableCell>)}</TableRow>)}
            {status !== 'loading' && rows.length === 0 && <TableRow><TableCell colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)} align="center" sx={{ py: 5 }}>{hasActiveFilters ? 'Không có dòng nào khớp bộ lọc' : 'Chưa có dữ liệu'}</TableCell></TableRow>}
            {rows.map((row) => (
              <TableRow
                key={getRowId(row)}
                hover
                onClick={() => onRowClick?.(row)}
                onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && onRowClick) { event.preventDefault(); onRowClick(row) } }}
                tabIndex={onRowClick ? 0 : undefined}
                sx={{ cursor: onRowClick ? 'pointer' : undefined }}
              >
                {selectable && <TableCell padding="checkbox" onClick={(event) => event.stopPropagation()}><Checkbox checked={Boolean(selectedIds?.has(getRowId(row)))} onChange={() => toggleRow(row)} inputProps={{ 'aria-label': `Chọn ${getRowLabel(row)}` }} /></TableCell>}
                {columns.map((column) => <TableCell key={column.id} sx={cellSx(column)} align={column.numeric ? 'right' : 'left'}>{column.render ? column.render(row) : String((row as Record<string, unknown>)[column.id] ?? '-')}</TableCell>)}
                {rowActions && <TableCell align="right" onClick={(event) => event.stopPropagation()}>{rowActions(row)}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={total}
        page={page}
        rowsPerPage={pageSize}
        onPageChange={(_, nextPage) => onPageChange(nextPage)}
        onRowsPerPageChange={(event) => onPageSizeChange(Number(event.target.value))}
        rowsPerPageOptions={[25, 50, 100, 200]}
        labelRowsPerPage="Số dòng"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} của ${count !== -1 ? count.toLocaleString('vi-VN') : 'nhiều hơn'}`}
        getItemAriaLabel={(type) => ({ first: 'Trang đầu', last: 'Trang cuối', next: 'Trang sau', previous: 'Trang trước' }[type])}
      />
    </Paper>
  )
}
