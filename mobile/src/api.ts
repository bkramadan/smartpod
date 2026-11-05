/**
 * Talks to the Smart Pod backend. Set the address in mobile/.env (EXPO_PUBLIC_API_URL).
 * The sign-in token is kept in memory: after the app restarts you sign in again
 * (fine for the prototype; the real app will keep it in secure storage).
 */
import type {
  AdherenceSummary,
  AiReport,
  CareTeamMember,
  CatalogItem,
  DailyRoutine,
  DemoAccount,
  DoseView,
  InventoryView,
  Item,
  ItemInput,
  Notification,
  PatientSegment,
  PatientSummary,
  PublicDevice,
  Role,
  User,
} from '@smartpod/shared';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

let token: string | null = null;
export const setToken = (value: string | null) => {
  token = value;
};

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
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, `Cannot reach the backend at ${API_URL}. Check mobile/.env and that the phone is on the same Wi-Fi.`, null);
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`, data);
  return data as T;
}

const p = (id: string) => `/api/patients/${encodeURIComponent(id)}`;

export interface RegisterInput {
  name: string;
  email: string;
  role: Role;
  segment?: PatientSegment;
  licenceNumber?: string;
}

export const api = {
  accounts: () => request<DemoAccount[]>('GET', '/api/demo/accounts'),
  login: (userId: string) => request<{ token: string; user: User }>('POST', '/api/auth/login', { userId }),
  register: (input: RegisterInput) => request<{ token: string; user: User }>('POST', '/api/auth/register', input),
  updateMe: (patch: { name?: string; routine?: DailyRoutine }) => request<User>('PATCH', '/api/me', patch),
  catalog: () => request<{ items: CatalogItem[] }>('GET', '/api/catalog'),

  patients: () => request<PatientSummary[]>('GET', '/api/patients'),
  patient: (id: string) => request<PatientSummary>('GET', p(id)),
  items: (id: string) => request<Item[]>('GET', `${p(id)}/items`),
  addItem: (id: string, input: ItemInput) => request<{ item: Item; report: AiReport }>('POST', `${p(id)}/items`, input),
  stopItem: (id: string, itemId: string) => request('POST', `${p(id)}/items/${itemId}/stop`),
  report: (id: string) => request<AiReport>('GET', `${p(id)}/ai/report`),
  check: (id: string, input: ItemInput) => request<AiReport>('POST', `${p(id)}/ai/check`, input),

  doses: (id: string, date?: string) => request<DoseView[]>('GET', `${p(id)}/doses${date ? `?date=${date}` : ''}`),
  adherence: (id: string, days = 7) => request<AdherenceSummary>('GET', `${p(id)}/adherence?days=${days}`),
  take: (doseId: string) => request('POST', `/api/doses/${doseId}/take`),
  skip: (doseId: string) => request('POST', `/api/doses/${doseId}/skip`),

  inventory: (id: string) => request<InventoryView[]>('GET', `${p(id)}/inventory`),
  devices: (id: string) => request<PublicDevice[]>('GET', `${p(id)}/devices`),
  pairPod: (id: string, name: string) =>
    request<PublicDevice & { deviceKey: string }>('POST', `${p(id)}/devices`, { name }),

  careTeam: (id: string) => request<CareTeamMember[]>('GET', `${p(id)}/care-team`),
  share: (id: string, email: string) => request('POST', `${p(id)}/care-team`, { email }),
  unshare: (id: string, linkId: string) => request('DELETE', `${p(id)}/care-team/${linkId}`),

  notifications: () => request<Notification[]>('GET', '/api/notifications'),
  readAll: () => request('POST', '/api/notifications/read-all'),
};
