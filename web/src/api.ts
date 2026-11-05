/**
 * Talks to the Smart Pod backend. Every screen uses these functions; none of them
 * calls fetch() directly. If the backend address changes, edit web/.env.
 */
import type {
  AdherenceSummary,
  AiReport,
  AuditView,
  CareTeamMember,
  CatalogItem,
  DemoAccount,
  DoseView,
  InventoryView,
  Item,
  ItemInput,
  Notification,
  PatientSummary,
  User,
} from '@smartpod/shared';

export const API_URL: string = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';

const TOKEN_KEY = 'smartpod.token';
let token: string | null = localStorage.getItem(TOKEN_KEY);

export function setToken(value: string | null) {
  token = value;
  if (value) localStorage.setItem(TOKEN_KEY, value);
  else localStorage.removeItem(TOKEN_KEY);
}
export const hasToken = () => !!token;

export class ApiError extends Error {
  constructor(public status: number, message: string, public body: any) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, `Cannot reach the backend at ${API_URL}. Is it running?`, null);
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`, data);
  return data as T;
}

const p = (id: string) => `/api/patients/${encodeURIComponent(id)}`;

export const api = {
  health: () => request<{ ok: boolean; ai: string; mode: string }>('GET', '/api/health'),
  accounts: () => request<DemoAccount[]>('GET', '/api/demo/accounts'),
  resetDemo: () => request<{ ok: boolean }>('POST', '/api/demo/reset'),
  login: (userId: string) => request<{ token: string; user: User }>('POST', '/api/auth/login', { userId }),
  me: () => request<User>('GET', '/api/me'),
  catalog: () => request<{ items: CatalogItem[] }>('GET', '/api/catalog'),

  patients: () => request<PatientSummary[]>('GET', '/api/patients'),
  patient: (id: string) => request<PatientSummary>('GET', p(id)),

  items: (id: string) => request<Item[]>('GET', `${p(id)}/items`),
  addItem: (id: string, input: ItemInput) => request<{ item: Item; report: AiReport }>('POST', `${p(id)}/items`, input),
  updateItem: (id: string, itemId: string, input: ItemInput) =>
    request<{ item: Item; report: AiReport }>('PATCH', `${p(id)}/items/${itemId}`, input),
  stopItem: (id: string, itemId: string) => request<{ item: Item }>('POST', `${p(id)}/items/${itemId}/stop`),

  report: (id: string) => request<AiReport>('GET', `${p(id)}/ai/report`),
  check: (id: string, input: ItemInput & { replacesItemId?: string }) => request<AiReport>('POST', `${p(id)}/ai/check`, input),

  doses: (id: string, date?: string) => request<DoseView[]>('GET', `${p(id)}/doses${date ? `?date=${date}` : ''}`),
  adherence: (id: string, days = 7) => request<AdherenceSummary>('GET', `${p(id)}/adherence?days=${days}`),
  take: (doseId: string) => request('POST', `/api/doses/${doseId}/take`),
  skip: (doseId: string) => request('POST', `/api/doses/${doseId}/skip`),

  inventory: (id: string) => request<InventoryView[]>('GET', `${p(id)}/inventory`),
  refill: (id: string, itemId: string, add: number) => request('POST', `${p(id)}/inventory/${itemId}/refill`, { add }),

  careTeam: (id: string) => request<CareTeamMember[]>('GET', `${p(id)}/care-team`),
  audit: (id: string) => request<AuditView[]>('GET', `${p(id)}/audit`),

  notifications: () => request<Notification[]>('GET', '/api/notifications'),
  readAll: () => request('POST', '/api/notifications/read-all'),
};
