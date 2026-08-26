import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Divider, Stack, Typography } from '@mui/material'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import {
  approveAction,
  getInsights,
  getSeverityColor,
  getSeverityLabel,
  listActions,
  listProactiveInsights,
  rejectAction,
  updateProactiveInsightStatus,
  type AgentAction,
  type Insight,
  type ProactiveInsight,
} from '../../../services/admin/agentService'
import { cleanOperationalText, formatProactiveEvidence, presentAction } from '../../../utils/admin/operationsPresentation'

interface OperationsData {
  insights: Insight[]
  proactive: ProactiveInsight[]
  actions: AgentAction[]
}

const EMPTY_DATA: OperationsData = { insights: [], proactive: [], actions: [] }

export default function OperationsAttentionWidget() {
  const { can } = useAuth()
  const canRead = can('agent.chat')
  const canApprove = can('agent.action.execute')
  const [data, setData] = useState<OperationsData>(EMPTY_DATA)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!canRead) return
    setLoading(true)
    setError(false)
    try {
      const [insights, proactivePage, actionPage] = await Promise.all([
        getInsights(),
        listProactiveInsights(undefined, 0, 10),
        listActions(undefined, 0, 25),
      ])
      setData({ insights, proactive: proactivePage.items, actions: actionPage.items })
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [canRead])

  useEffect(() => { void load() }, [load])

  const openProactive = useMemo(
    () => data.proactive.filter((item) => item.status === 'unread' || item.status === 'read'),
    [data.proactive],
  )
  const proactiveAlertIds = useMemo(
    () => new Set(openProactive.map((item) => `alert:${item.source_alert_id}`)),
    [openProactive],
  )
  const currentIssues = useMemo(
    () => data.insights.filter((item) => item.id !== 'all_clear' && !proactiveAlertIds.has(item.id)),
    [data.insights, proactiveAlertIds],
  )
  const pendingActions = useMemo(
    () => data.actions.filter((item) => item.trang_thai === 'de_xuat' && item.execution_mode === 'human_approval'),
    [data.actions],
  )
  const latestAutomaticAction = useMemo(
    () => data.actions.find((item) => item.execution_mode === 'automatic' && item.trang_thai === 'hoan_thanh') ?? null,
    [data.actions],
  )
  const attentionCount = openProactive.length + currentIssues.length + pendingActions.length

  const updateInsight = async (insight: ProactiveInsight, status: 'read' | 'resolved') => {
    setBusyId(`insight-${insight.insight_id}`)
    setError(false)
    try {
      await updateProactiveInsightStatus(insight.insight_id, status)
      await load()
    } catch {
      setError(true)
    } finally {
      setBusyId(null)
    }
  }

  const decideAction = async (action: AgentAction, decision: 'approve' | 'reject') => {
    setBusyId(`action-${action.action_id}`)
    setError(false)
    try {
      if (decision === 'approve') await approveAction(action.action_id)
      else await rejectAction(action.action_id)
      await load()
    } catch {
      setError(true)
    } finally {
      setBusyId(null)
    }
  }

  if (!canRead) return null

  return (
    <Card variant="outlined" sx={{ mb: 3, borderColor: attentionCount > 0 ? 'warning.main' : 'divider' }}>
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} sx={{ mb: 1.5 }}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <FactCheckIcon color={attentionCount > 0 ? 'warning' : 'success'} />
              <Typography variant="h6">Cần chú ý</Typography>
              {attentionCount > 0 ? <Chip size="small" color="warning" label={`${attentionCount} việc`} /> : null}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Hệ thống tự theo dõi tồn kho, hạn dùng và đơn hàng. Thay đổi quan trọng luôn chờ admin xác nhận.
            </Typography>
          </Box>
          <Button size="small" onClick={() => void load()} disabled={loading}>Làm mới</Button>
        </Stack>

        {loading && data === EMPTY_DATA ? <CircularProgress size={24} aria-label="Đang tải việc cần chú ý" /> : null}
        {error ? <Alert severity="error" action={<Button color="inherit" onClick={() => void load()}>Thử lại</Button>}>Không tải được thông tin vận hành.</Alert> : null}

        {!error && !loading && attentionCount === 0 ? (
          <Alert severity="success">Chưa có vấn đề hoặc đề xuất nào cần admin xử lý.</Alert>
        ) : null}

        <Stack divider={<Divider flexItem />} spacing={1.5}>
          {openProactive.map((insight) => {
            const evidence = formatProactiveEvidence(insight)
            const id = `insight-${insight.insight_id}`
            return (
              <Box key={id} sx={{ py: 0.5 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1.5}>
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Chip size="small" color={getSeverityColor(insight.severity)} label={getSeverityLabel(insight.severity)} />
                      <Typography fontWeight={600}>{cleanOperationalText(insight.title)}</Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>{cleanOperationalText(insight.recommendation)}</Typography>
                    {evidence.length > 0 ? <Typography variant="caption" color="text.secondary">{evidence.join(' · ')}</Typography> : null}
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                    {insight.status === 'unread' ? (
                      <Button size="small" startIcon={<VisibilityIcon />} disabled={busyId === id} onClick={() => void updateInsight(insight, 'read')}>Đã xem</Button>
                    ) : null}
                    <Button size="small" variant="outlined" startIcon={<TaskAltIcon />} disabled={busyId === id} onClick={() => void updateInsight(insight, 'resolved')}>Đã xử lý</Button>
                    <Button size="small" component={Link} to="/admin/alerts">Mở cảnh báo</Button>
                  </Stack>
                </Stack>
              </Box>
            )
          })}

          {currentIssues.map((insight) => (
            <Box key={insight.id} sx={{ py: 0.5 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1.5}>
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Chip size="small" color={getSeverityColor(insight.severity)} label={getSeverityLabel(insight.severity)} />
                    <Typography fontWeight={600}>{cleanOperationalText(insight.title)}</Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>{cleanOperationalText(insight.description)}</Typography>
                  {(insight.evidence ?? []).length > 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      {(insight.evidence ?? []).map(cleanOperationalText).join(' · ')}
                    </Typography>
                  ) : null}
                </Box>
                <Button size="small" component={Link} to={insight.category === 'orders' ? '/admin/orders' : '/admin/alerts'} sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}>
                  Kiểm tra
                </Button>
              </Stack>
            </Box>
          ))}

          {pendingActions.map((action) => {
            const presentation = presentAction(action)
            const id = `action-${action.action_id}`
            return (
              <Box key={id} sx={{ py: 0.5 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1.5}>
                  <Box>
                    <Chip size="small" color="warning" label="Cần admin xác nhận" sx={{ mb: 0.75 }} />
                    <Typography fontWeight={600}>{presentation.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{presentation.description}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                    <Button size="small" component={Link} to={presentation.destination}>Xem liên quan</Button>
                    {canApprove ? <Button size="small" color="inherit" disabled={busyId === id} onClick={() => void decideAction(action, 'reject')}>Không duyệt</Button> : null}
                    {canApprove ? <Button size="small" variant="contained" disabled={busyId === id} onClick={() => void decideAction(action, 'approve')}>Duyệt</Button> : null}
                  </Stack>
                </Stack>
              </Box>
            )
          })}
        </Stack>

        {latestAutomaticAction ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            Tự động gần nhất: {presentAction(latestAutomaticAction).title.toLocaleLowerCase('vi-VN')} lúc {new Date(latestAutomaticAction.ngay_xu_ly || latestAutomaticAction.ngay_tao).toLocaleString('vi-VN')}.
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  )
}
