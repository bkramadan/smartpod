/**
 * THE DATA PLUG.
 *
 * Every service talks to data only through this interface. Today it is answered by
 * MemoryStore (mock data in memory, saved to a JSON file). To move to a real database,
 * write a SupabaseStore (or PostgresStore) that implements the same interface and pass
 * it to createApp() in server.ts. Nothing else in the backend has to change.
 *
 * All methods return Promises because a real database is always asynchronous.
 * See docs/MOVING-TO-SUPABASE.md.
 */
import type {
  AuditEntry,
  CareLink,
  Device,
  DoseEvent,
  Inventory,
  Item,
  Notification,
  User,
} from '@smartpod/shared';

export interface Collection<T extends { id: string }> {
  all(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  find(predicate: (row: T) => boolean): Promise<T[]>;
  insert(row: T): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
  remove(id: string): Promise<void>;
}

export interface DataStore {
  users: Collection<User>;
  careLinks: Collection<CareLink>;
  items: Collection<Item>;
  doses: Collection<DoseEvent>;
  inventory: Collection<Inventory>;
  devices: Collection<Device>;
  notifications: Collection<Notification>;
  audit: Collection<AuditEntry>;
  /** Wipe everything and load the demo data again. */
  reset(): Promise<void>;
}
