import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert as MuiAlert, Box, Button, Card, CardContent, Chip, IconButton, Paper, Stack, TextField, Typography,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import RefreshIcon from '@mui/icons-material/Refresh'
import SendIcon from '@mui/icons-material/Send'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import AdminPage from '../../components/admin/ui/admin-page'
import DataTable, { type Column } from '../../components/admin/ui/data-table'
import DataTableToolbar from '../../components/admin/ui/data-table-toolbar'
import { useDataTableState } from '../../hooks/admin/useDataTableState'
import {
  approveAction, getActionStatusLabel, getClassificationColor, getClassificationLabel, getInsights, getSeverityColor, getSeverityLabel,
  listActions, listProactiveInsights, postChat, proposeAction, rejectAction, resetAction, updateProactiveInsightStatus,
  type AgentAction, type ChatReply, type Insight, type ProactiveInsight, type ToolCallTrace,
} from '../../services/admin/agentService'
import { useAuth } from '../../contexts/AuthContext'

interface ChatEntry {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCallTrace[]
  usedLlm?: boolean
}

// Chat history sent to the backend is capped server-side at 40 entries
// (see app/routers/agent.py ChatRequest.history) — mirror that limit
// client-side so a long-running conversation gets a clean local trim
// instead of a 422 from the API once it crosses the cap.
const MAX_CHAT_HISTORY = 40

const actionColumns: Column<AgentAction>[] = [
  { id: 'ngay_tao', label: 'Thời gian', sortable: true, render: (row) => new Date(row.ngay_tao).toLocaleString('vi-VN') },
  { id: 'loai_hanh_dong', label: 'Hành động', render: (row) => row.loai_hanh_dong },
  { id: 'tham_so', label: 'Tham số', render: (row) => <Typography variant="body2" sx={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{JSON.stringify(row.tham_so)}</Typography> },
  { id: 'nguon', label: 'Nguồn', render: (row) => row.nguon === 'agent' ? 'Agent' : 'Nhân viên' },
  { id: 'phan_loai', label: 'Loại', render: (row) => <Chip size="small" variant="outlined" label={getClassificationLabel(row.phan_loai)} color={getClassificationColor(row.phan_loai)} /> },
  { id: 'nguoidung_de_xuat_id', label: 'Đề xuất bởi', render: (row) => row.nguoidung_de_xuat_id ?? '-' },
  { id: 'nguoidung_duyet_id', label: 'Duyệt/từ chối bởi', render: (row) => row.nguoidung_duyet_id ?? '-' },
  { id: 'trang_thai', label: 'Trạng thái', render: (row) => <Chip size="small" label={getActionStatusLabel(row.trang_thai)} color={row.trang_thai === 'hoan_thanh' ? 'success' : row.trang_thai === 'that_bai' ? 'error' : row.trang_thai === 'tu_choi' ? 'default' : 'warning'} /> },
  { id: 'is_stale', label: 'Stale', render: (row) => row.is_stale ? <Chip size="small" color="error" label="Kẹt quá ngưỡng" /> : '-' },
  { id: 'loi', label: 'Ghi chú', render: (row) => row.loi || '-' },
]

export default function AdminAgentPage() {
  const table = useDataTableState({ key: 'agent_actions', defaultSortBy: 'ngay_tao', defaultSortDir: 'desc', defaultPageSize: 25, filterKeys: ['trang_thai'] })
  const { can } = useAuth()
  const [insights, setInsights] = useState<Insight[]>([])
  const [proactiveInsights, setProactiveInsights] = useState<ProactiveInsight[]>([])
  const [actionRows, setActionRows] = useState<AgentAction[]>([])
  const [actionTotal, setActionTotal] = useState(0)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [busyInsightId, setBusyInsightId] = useState<string | null>(null)
  const [busyProactiveInsightId, setBusyProactiveInsightId] = useState<number | null>(null)
  const [busyActionId, setBusyActionId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Set<string | number>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const filtersKey = JSON.stringify(table.filters)
  useEffect(() => { setSelected(new Set()) }, [table.sortBy, table.sortDir, filtersKey])

  const [chatMessage, setChatMessage] = useState('')
  const [chatLog, setChatLog] = useState<ChatEntry[]>([])
  const [chatBusy, setChatBusy] = useState(false)
  const [chatSessionId] = useState(() => `admin-agent-${crypto.randomUUID()}`)
  const chatEndRef = useRef<HTMLDivElement>(null)
  // Cuộn xuống cuối mỗi khi có tin nhắn mới — không thì tin nhắn mới nằm
  // dưới vùng nhìn thấy của khung chat 280px, người dùng phải tự cuộn.
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [chatLog])

  const load = useCallback(async () => {
    setStatus('loading'); setError(null)
    try {
      const [nextInsights, nextActionPage, nextProactivePage] = await Promise.all([
        getInsights(),
        listActions(table.filters.trang_thai || undefined, table.skip, table.pageSize),
        listProactiveInsights(undefined, 0, 10),
      ])
      setInsights(nextInsights); setActionRows(nextActionPage.items); setActionTotal(nextActionPage.total); setProactiveInsights(nextProactivePage.items); setStatus('idle')
    } catch { setError('Không thể tải dữ liệu Operations Agent'); setStatus('error') }
  }, [table.filters.trang_thai, table.skip, table.pageSize])
  useEffect(() => { void load() }, [load])

  const acceptRecommendation = async (insight: Insight) => {
    if (!insight.recommended_action) return
    setBusyInsightId(insight.id)
    try {
      await proposeAction(insight.recommended_action.tool, insight.recommended_action.params, insight.recommended_action.rationale ?? undefined)
      await load()
    } catch { setError('Không thể tạo đề xuất hành động') } finally { setBusyInsightId(null) }
  }

  const updateProactiveStatus = async (insight: ProactiveInsight, nextStatus: 'read' | 'resolved') => {
    setBusyProactiveInsightId(insight.insight_id)
    try {
      await updateProactiveInsightStatus(insight.insight_id, nextStatus)
      await load()
    } catch { setError('Không thể cập nhật trạng thái proactive insight') } finally { setBusyProactiveInsightId(null) }
  }

  const approve = async (row: AgentAction) => {
    setBusyActionId(row.action_id)
    try { await approveAction(row.action_id); await load() } catch { setError('Không thể duyệt hành động') } finally { setBusyActionId(null) }
  }

  const reject = async (row: AgentAction) => {
    setBusyActionId(row.action_id)
    try { await rejectAction(row.action_id); await load() } catch { setError('Không thể từ chối hành động') } finally { setBusyActionId(null) }
  }

  const reset = async (row: AgentAction) => {
    setBusyActionId(row.action_id)
    try { await resetAction(row.action_id); await load() } catch { setError('Không thể reset hành động') } finally { setBusyActionId(null) }
  }

  // Bulk approve/reject dùng lại đúng endpoint từng-dòng (approveAction/rejectAction) —
  // không có endpoint bulk riêng, chỉ gọi tuần tự thay cho việc bấm từng dòng.
  const bulkDecide = async (decide: (id: number) => Promise<unknown>, label: string) => {
    const targets = actionRows.filter((row) => selected.has(row.action_id) && row.trang_thai === 'de_xuat')
    if (targets.length === 0) return
    setBulkBusy(true)
    try {
      const results = await Promise.allSettled(targets.map((row) => decide(row.action_id)))
      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed > 0) setError(`${label}: ${failed}/${targets.length} hành động thất bại`)
      setSelected(new Set())
      await load()
    } finally {
      setBulkBusy(false)
    }
  }
  const bulkApprove = () => bulkDecide(approveAction, 'Duyệt hàng loạt')
  const bulkReject = () => bulkDecide(rejectAction, 'Từ chối hàng loạt')
  const hasApprovableSelection = actionRows.some((row) => selected.has(row.action_id) && row.trang_thai === 'de_xuat')

  const sendChat = async () => {
    const message = chatMessage.trim()
    if (!message || chatBusy) return
    setChatBusy(true)
    const history = chatLog.slice(-MAX_CHAT_HISTORY).map(({ role, content }) => ({ role, content }))
    setChatLog((log) => [...log, { role: 'user', content: message }])
    setChatMessage('')
    try {
      const reply: ChatReply = await postChat(message, history, chatSessionId)
      setChatLog((log) => [...log, { role: 'assistant', content: reply.reply, toolCalls: reply.tool_calls, usedLlm: reply.used_llm }])
      if ((reply.proposed_actions ?? []).length > 0) await load()
    } catch {
      setChatLog((log) => [...log, { role: 'assistant', content: 'Xin lỗi, đã có lỗi khi hỏi Operations Agent.' }])
    } finally {
      setChatBusy(false)
    }
  }

  return (
    <AdminPage title="Operations Agent" breadcrumb={[{ label: 'Operations Agent' }]}>
      {error && <MuiAlert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</MuiAlert>}

      <DataTableToolbar title="Operations Brief" actions={<Button startIcon={<RefreshIcon />} onClick={() => void load()}>Làm mới</Button>}>
        <Box />
      </DataTableToolbar>

      {proactiveInsights.length > 0 && (
        <Stack spacing={1.5} sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600}>Khuyến nghị chủ động</Typography>
          {proactiveInsights.map((insight) => {
            const evidence = insight.evidence
            const batch = evidence.batch_code ? String(evidence.batch_code) : null
            const expiry = evidence.expires_at ? new Date(String(evidence.expires_at)).toLocaleString('vi-VN') : null
            const units = evidence.units_on_hand
            return (
              <Card key={insight.insight_id} variant="outlined" sx={{ opacity: insight.status === 'superseded' ? 0.62 : 1 }}>
                <CardContent sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ minWidth: 0, flex: '1 1 320px' }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <Chip size="small" label={getSeverityLabel(insight.severity)} color={getSeverityColor(insight.severity)} />
                      <Chip size="small" variant="outlined" label={{ unread: 'Chưa đọc', read: 'Đã đọc', resolved: 'Đã xử lý', superseded: 'Đã thay thế' }[insight.status]} />
                      <Typography variant="subtitle1" fontWeight={600}>{insight.title}</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">{insight.recommendation}</Typography>
                    {(batch || expiry || units !== undefined) && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                      {[batch && `Lô ${batch}`, expiry && `Hạn dùng ${expiry}`, units !== undefined && `Tồn ${String(units)}`].filter(Boolean).join(' • ')}
                    </Typography>}
                  </Box>
                  {(insight.status === 'unread' || insight.status === 'read') && (
                    <Stack direction="row" spacing={1}>
                      {insight.status === 'unread' && <Button size="small" disabled={busyProactiveInsightId === insight.insight_id} onClick={() => void updateProactiveStatus(insight, 'read')}>Đã đọc</Button>}
                      <Button size="small" variant="outlined" disabled={busyProactiveInsightId === insight.insight_id} onClick={() => void updateProactiveStatus(insight, 'resolved')}>Đã xử lý</Button>
                    </Stack>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </Stack>
      )}

      <Stack spacing={1.5} sx={{ mb: 3 }}>
        {insights.map((insight) => (
          <Card key={insight.id} variant="outlined">
            <CardContent sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ minWidth: 0, flex: '1 1 240px' }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Chip size="small" label={getSeverityLabel(insight.severity)} color={getSeverityColor(insight.severity)} />
                  <Typography variant="subtitle1" fontWeight={600}>{insight.title}</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">{insight.description}</Typography>
                {(insight.evidence ?? []).length > 0 && (
                  <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2.5, color: 'text.secondary' }}>
                    {(insight.evidence ?? []).map((point, index) => (
                      <Typography key={index} component="li" variant="caption" sx={{ display: 'list-item' }}>{point}</Typography>
                    ))}
                  </Box>
                )}
              </Box>
              {insight.recommended_action && (
                <Button
                  variant="outlined"
                  size="small"
                  disabled={busyInsightId === insight.id}
                  onClick={() => void acceptRecommendation(insight)}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  Đề xuất: {insight.recommended_action.tool}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>

      <DataTable
        caption="Pending Actions — hàng đợi chờ duyệt"
        columns={actionColumns}
        rows={actionRows}
        getRowId={(row) => row.action_id}
        getRowLabel={(row) => `${row.loai_hanh_dong} #${row.action_id}`}
        total={actionTotal}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={(page) => table.patch({ page })}
        onPageSizeChange={(pageSize) => table.patch({ pageSize })}
        sortBy={table.sortBy}
        sortDir={table.sortDir}
        onSortChange={(sortBy, sortDir) => table.patch({ sortBy, sortDir })}
        status={status}
        error={error}
        onRetry={() => void load()}
        hasActiveFilters={Object.keys(table.filters).length > 0}
        onClearFilters={() => table.patch({ filters: {} })}
        selectedIds={can('agent.action.execute') ? selected : undefined}
        onSelectionChange={can('agent.action.execute') ? setSelected : undefined}
        bulkActions={<>
          <Button size="small" color="success" disabled={bulkBusy || !hasApprovableSelection} onClick={() => void bulkApprove()}>Duyệt đã chọn</Button>
          <Button size="small" color="error" disabled={bulkBusy || !hasApprovableSelection} onClick={() => void bulkReject()}>Từ chối đã chọn</Button>
        </>}
        rowActions={(row) => row.is_stale && can('agent.action.execute') ? <IconButton aria-label="Reset hành động kẹt" disabled={busyActionId === row.action_id} onClick={() => void reset(row)}><RefreshIcon fontSize="small" color="error" /></IconButton> : row.trang_thai === 'de_xuat' && can('agent.action.execute') ? (
          <>
            <IconButton aria-label="Duyệt" disabled={busyActionId === row.action_id} onClick={() => void approve(row)}><CheckCircleIcon fontSize="small" color="success" /></IconButton>
            <IconButton aria-label="Từ chối" disabled={busyActionId === row.action_id} onClick={() => void reject(row)}><CancelIcon fontSize="small" color="error" /></IconButton>
          </>
        ) : null}
      />

      <Paper variant="outlined" sx={{ mt: 3, p: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <SmartToyIcon fontSize="small" />
          <Typography variant="subtitle1" fontWeight={600}>Ask Operations Agent</Typography>
        </Stack>
        <Stack spacing={1} sx={{ maxHeight: 280, overflowY: 'auto', mb: 1.5 }}>
          {chatLog.length === 0 && <Typography variant="body2" color="text.secondary">Hỏi về tình trạng vận hành, ví dụ: "hôm nay có vấn đề gì không?"</Typography>}
          {chatLog.map((entry, index) => (
            <Box key={index} sx={{ alignSelf: entry.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              {entry.toolCalls && entry.toolCalls.length > 0 && (
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 0.5 }}>
                  {entry.toolCalls.map((call, callIndex) => (
                    <Chip
                      key={callIndex}
                      size="small"
                      variant="outlined"
                      icon={<SmartToyIcon fontSize="small" />}
                      color={call.outcome === 'proposed' ? 'warning' : 'default'}
                      label={call.outcome === 'proposed' ? `${call.tool} → chờ duyệt #${call.action_id}` : call.tool}
                    />
                  ))}
                </Stack>
              )}
              <Box sx={{ bgcolor: entry.role === 'user' ? 'primary.main' : 'grey.100', color: entry.role === 'user' ? 'primary.contrastText' : 'text.primary', borderRadius: 2, px: 1.5, py: 1, whiteSpace: 'pre-wrap' }}>
                <Typography variant="body2">{entry.content}</Typography>
              </Box>
            </Box>
          ))}
          <div ref={chatEndRef} />
        </Stack>
        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth size="small" placeholder="Nhập câu hỏi..." value={chatMessage}
            onChange={(event) => setChatMessage(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendChat() } }}
            disabled={chatBusy}
          />
          <Button variant="contained" endIcon={<SendIcon />} disabled={chatBusy || !chatMessage.trim()} onClick={() => void sendChat()}>Gửi</Button>
        </Stack>
      </Paper>
    </AdminPage>
  )
}
