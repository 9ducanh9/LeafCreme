import { useCallback, useEffect, useState } from 'react'
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
  approveAction, getActionStatusLabel, getInsights, getSeverityColor, listActions, postChat, proposeAction,
  rejectAction, type AgentAction, type ChatReply, type Insight, type ToolCallTrace,
} from '../../services/admin/agentService'

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
  { id: 'nguoidung_de_xuat_id', label: 'Đề xuất bởi', render: (row) => row.nguoidung_de_xuat_id ?? '-' },
  { id: 'nguoidung_duyet_id', label: 'Duyệt/từ chối bởi', render: (row) => row.nguoidung_duyet_id ?? '-' },
  { id: 'trang_thai', label: 'Trạng thái', render: (row) => <Chip size="small" label={getActionStatusLabel(row.trang_thai)} color={row.trang_thai === 'hoan_thanh' ? 'success' : row.trang_thai === 'that_bai' ? 'error' : row.trang_thai === 'tu_choi' ? 'default' : 'warning'} /> },
  { id: 'loi', label: 'Ghi chú', render: (row) => row.loi || '-' },
]

export default function AdminAgentPage() {
  const table = useDataTableState({ key: 'agent_actions', defaultSortBy: 'ngay_tao', defaultSortDir: 'desc', defaultPageSize: 25, filterKeys: ['trang_thai'] })
  const [insights, setInsights] = useState<Insight[]>([])
  const [actionRows, setActionRows] = useState<AgentAction[]>([])
  const [actionTotal, setActionTotal] = useState(0)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [busyInsightId, setBusyInsightId] = useState<string | null>(null)
  const [busyActionId, setBusyActionId] = useState<number | null>(null)

  const [chatMessage, setChatMessage] = useState('')
  const [chatLog, setChatLog] = useState<ChatEntry[]>([])
  const [chatBusy, setChatBusy] = useState(false)

  const load = useCallback(async () => {
    setStatus('loading'); setError(null)
    try {
      const [nextInsights, nextActionPage] = await Promise.all([
        getInsights(),
        listActions(table.filters.trang_thai || undefined, table.skip, table.pageSize),
      ])
      setInsights(nextInsights); setActionRows(nextActionPage.items); setActionTotal(nextActionPage.total); setStatus('idle')
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

  const approve = async (row: AgentAction) => {
    setBusyActionId(row.action_id)
    try { await approveAction(row.action_id); await load() } catch { setError('Không thể duyệt hành động') } finally { setBusyActionId(null) }
  }

  const reject = async (row: AgentAction) => {
    setBusyActionId(row.action_id)
    try { await rejectAction(row.action_id); await load() } catch { setError('Không thể từ chối hành động') } finally { setBusyActionId(null) }
  }

  const sendChat = async () => {
    const message = chatMessage.trim()
    if (!message || chatBusy) return
    setChatBusy(true)
    const history = chatLog.slice(-MAX_CHAT_HISTORY).map(({ role, content }) => ({ role, content }))
    setChatLog((log) => [...log, { role: 'user', content: message }])
    setChatMessage('')
    try {
      const reply: ChatReply = await postChat(message, history)
      setChatLog((log) => [...log, { role: 'assistant', content: reply.reply, toolCalls: reply.tool_calls, usedLlm: reply.used_llm }])
      if (reply.proposed_actions.length > 0) await load()
    } catch {
      setChatLog((log) => [...log, { role: 'assistant', content: 'Xin lỗi, đã có lỗi khi hỏi Operations Agent.' }])
    } finally {
      setChatBusy(false)
    }
  }

  return (
    <AdminPage title="Operations Agent" breadcrumb={[{ label: 'Operations Agent' }]}>
      {error && <MuiAlert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</MuiAlert>}

      <DataTableToolbar title="Vấn đề cần xử lý" actions={<Button startIcon={<RefreshIcon />} onClick={() => void load()}>Làm mới</Button>}>
        <Box />
      </DataTableToolbar>

      <Stack spacing={1.5} sx={{ mb: 3 }}>
        {insights.map((insight) => (
          <Card key={insight.id} variant="outlined">
            <CardContent sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, '&:last-child': { pb: 2 } }}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Chip size="small" label={insight.severity} color={getSeverityColor(insight.severity)} />
                  <Typography variant="subtitle1" fontWeight={600}>{insight.title}</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">{insight.description}</Typography>
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
        caption="Hàng đợi hành động của Operations Agent"
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
        rowActions={(row) => row.trang_thai === 'de_xuat' ? (
          <>
            <IconButton aria-label="Duyệt" disabled={busyActionId === row.action_id} onClick={() => void approve(row)}><CheckCircleIcon fontSize="small" color="success" /></IconButton>
            <IconButton aria-label="Từ chối" disabled={busyActionId === row.action_id} onClick={() => void reject(row)}><CancelIcon fontSize="small" color="error" /></IconButton>
          </>
        ) : null}
      />

      <Paper variant="outlined" sx={{ mt: 3, p: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <SmartToyIcon fontSize="small" />
          <Typography variant="subtitle1" fontWeight={600}>Hỏi Operations Agent</Typography>
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
