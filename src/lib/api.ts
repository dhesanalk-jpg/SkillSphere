const configuredUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
export const apiEnabled = Boolean(configuredUrl)
const API_BASE = (configuredUrl || '').replace(/\/$/, '')

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`SkillSphere API ${response.status}: ${detail || response.statusText}`)
  }
  return response.json() as Promise<T>
}

export type AppState = {
  me: Record<string, any>
  people: Record<string, any>[]
  bookings: Record<string, any>[]
  reviews: Record<string, any>[]
}

export const getRemoteState = () => request<AppState>('/api/state')
export const saveRemoteState = (state: AppState) => request<AppState>('/api/state', {
  method: 'PUT', body: JSON.stringify(state),
})
export const getApiHealth = () => request<{ status: string }>('/api/health')
