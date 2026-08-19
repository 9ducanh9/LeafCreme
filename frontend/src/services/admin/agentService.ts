// Operations Agent Service — business-state snapshot, proactive insights,
// chat, and the propose -> approve/reject governed-action lifecycle.
import { apiClient } from '../api'

export interface RecommendedAction {
  tool: string
  params: Record<string, unknown>
  rationale: string | null
}

export interface Insight {
  id: string
  title: string
  severity: 'cao' | 'binh_thuong' | 'thap'
  category: string
  description: string
  recommended_action: RecommendedAction | null
}

export interface AgentAction {
  action_id: number
  loai_hanh_dong: string
  tham_so: Record<string, unknown>
  ly_do: string | null
  nguon: 'agent' | 'nhan_vien'
  muc_do_rui_ro: 'doc' | 'thay_doi'
  trang_thai: 'de_xuat' | 'dang_xu_ly' | 'hoan_thanh' | 'tu_choi' | 'that_bai'
  ket_qua: Record<string, unknown> | null
  loi: string | null
  nguoidung_de_xuat_id: number | null
  nguoidung_duyet_id: number | null
  ngay_tao: string
  ngay_xu_ly: string | null
}

export interface AgentActionPage {
  items: AgentAction[]
  total: number
  skip: number
  limit: number
}

export interface ToolDescriptor {
  name: string
  description: string
  risk: 'doc' | 'thay_doi'
  required_params: string[]
  optional_params: string[]
}

export interface ToolCallTrace {
  tool: string
  input: Record<string, unknown>
  outcome: 'executed' | 'proposed'
  action_id?: number
}

export interface ChatReply {
  reply: string
  used_llm: boolean
  insights: Insight[]
  proposed_actions: AgentAction[]
  tool_calls: ToolCallTrace[]
}

export async function getInsights(): Promise<Insight[]> {
  const data = await apiClient.get<{ insights: Insight[] }>('/agent/insights')
  return data.insights
}

export async function getState(): Promise<Record<string, unknown>> {
  return await apiClient.get('/agent/state')
}

export async function getTools(): Promise<ToolDescriptor[]> {
  const data = await apiClient.get<{ tools: ToolDescriptor[] }>('/agent/tools')
  return data.tools
}

export async function postChat(message: string, history?: Array<{ role: string; content: string }>): Promise<ChatReply> {
  return await apiClient.post<ChatReply>('/agent/chat', { message, history })
}

export async function proposeAction(
  loai_hanh_dong: string,
  tham_so: Record<string, unknown> = {},
  ly_do?: string
): Promise<{ executed: boolean; pending: boolean; result?: unknown; action?: AgentAction }> {
  return await apiClient.post('/agent/actions', { loai_hanh_dong, tham_so, ly_do })
}

export async function listActions(trang_thai?: string, skip = 0, limit = 25): Promise<AgentActionPage> {
  const params: Record<string, string | number> = { skip, limit }
  if (trang_thai) params.trang_thai = trang_thai
  return await apiClient.get<AgentActionPage>('/agent/actions', params)
}

export async function approveAction(actionId: number): Promise<AgentAction> {
  return await apiClient.post<AgentAction>(`/agent/actions/${actionId}/approve`)
}

export async function rejectAction(actionId: number, note?: string): Promise<AgentAction> {
  return await apiClient.post<AgentAction>(`/agent/actions/${actionId}/reject`, { note })
}

export function getSeverityColor(severity: Insight['severity']): 'error' | 'warning' | 'success' {
  if (severity === 'cao') return 'error'
  if (severity === 'binh_thuong') return 'warning'
  return 'success'
}

export function getActionStatusLabel(status: AgentAction['trang_thai']): string {
  const labels: Record<AgentAction['trang_thai'], string> = {
    de_xuat: 'Chờ duyệt',
    dang_xu_ly: 'Đang xử lý',
    hoan_thanh: 'Đã thực thi',
    tu_choi: 'Đã từ chối',
    that_bai: 'Thất bại',
  }
  return labels[status] || status
}
