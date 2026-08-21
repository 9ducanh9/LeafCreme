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
  // Optional defensively: older/mismatched backend responses (e.g. a dev
  // server that hasn't picked up a schema change yet) may omit this field.
  evidence?: string[]
  recommended_action: RecommendedAction | null
}

export type AgentActionClassification = 'read' | 'draft' | 'execute'

export interface AgentAction {
  action_id: number
  loai_hanh_dong: string
  tham_so: Record<string, unknown>
  ly_do: string | null
  nguon: 'agent' | 'nhan_vien'
  phan_loai: AgentActionClassification
  muc_do_uu_tien: 'low' | 'medium' | 'high' | null
  trang_thai: 'de_xuat' | 'dang_xu_ly' | 'hoan_thanh' | 'tu_choi' | 'that_bai'
  dieu_kien_tien_quyet: Record<string, unknown> | null
  ket_qua: Record<string, unknown> | null
  loi: string | null
  nguoidung_de_xuat_id: number | null
  nguoidung_duyet_id: number | null
  ngay_tao: string
  ngay_bat_dau_xu_ly: string | null
  ngay_xu_ly: string | null
  nguoidung_reset_id: number | null
  ngay_reset: string | null
  is_stale: boolean
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
  classification: AgentActionClassification
  risk_level: 'low' | 'medium' | 'high'
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

export async function resetAction(actionId: number): Promise<AgentAction> {
  return await apiClient.post<AgentAction>(`/agent/actions/${actionId}/reset`)
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

export function getClassificationLabel(classification: AgentActionClassification): string {
  const labels: Record<AgentActionClassification, string> = {
    read: 'Chỉ đọc',
    draft: 'Đề xuất ghi chú',
    execute: 'Thay đổi dữ liệu',
  }
  return labels[classification] || classification
}

export function getClassificationColor(classification: AgentActionClassification): 'default' | 'info' | 'error' {
  if (classification === 'execute') return 'error'
  if (classification === 'draft') return 'info'
  return 'default'
}
