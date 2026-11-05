/**
 * Mock database: keeps every table in memory and, if a file path is given,
 * saves it as JSON shortly after each change so a restart keeps your data.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Collection, DataStore } from './DataStore.ts';
import { buildSeed, type SeedData } from './seed.ts';

type Tables = SeedData;
type TableName = keyof Tables;

class MemoryCollection<T extends { id: string }> implements Collection<T> {
  constructor(
    private rows: () => T[],
    private changed: () => void,
  ) {}

  async all() {
    return [...this.rows()];
  }
  async get(id: string) {
    return this.rows().find((r) => r.id === id);
  }
  async find(predicate: (row: T) => boolean) {
    return this.rows().filter(predicate);
  }
  async insert(row: T) {
    if (this.rows().some((r) => r.id === row.id)) throw new Error(`Duplicate id ${row.id}`);
    this.rows().push(row);
    this.changed();
    return row;
  }
  async update(id: string, patch: Partial<T>) {
    const row = this.rows().find((r) => r.id === id);
    if (!row) throw new Error(`Not found: ${id}`);
    Object.assign(row, patch, { id });
    this.changed();
    return row;
  }
  async remove(id: string) {
    const rows = this.rows();
    const i = rows.findIndex((r) => r.id === id);
    if (i >= 0) {
      rows.splice(i, 1);
      this.changed();
    }
  }
}

export class MemoryStore implements DataStore {
  private tables: Tables;
  private saveTimer?: NodeJS.Timeout;

  users; careLinks; items; doses; inventory; devices; notifications; audit;

  constructor(
    private file?: string,
    private now: () => Date = () => new Date(),
  ) {
    this.tables = this.load() ?? buildSeed(this.now());
    const col = <K extends TableName>(name: K) =>
      new MemoryCollection(() => this.tables[name] as any[], () => this.scheduleSave()) as unknown as Collection<
        Tables[K][number]
      >;
    this.users = col('users');
    this.careLinks = col('careLinks');
    this.items = col('items');
    this.doses = col('doses');
    this.inventory = col('inventory');
    this.devices = col('devices');
    this.notifications = col('notifications');
    this.audit = col('audit');
    this.scheduleSave();
  }

  async reset() {
    const fresh = buildSeed(this.now());
    for (const key of Object.keys(fresh) as TableName[]) {
      // Keep the same array objects so collections stay connected.
      (this.tables[key] as any[]).splice(0, Infinity, ...(fresh[key] as any[]));
    }
    this.scheduleSave();
  }

  private load(): Tables | undefined {
    if (!this.file || !existsSync(this.file)) return undefined;
    try {
      const data = JSON.parse(readFileSync(this.file, 'utf8'));
      if (data?.version !== 1) return undefined;
      console.log(`Loaded mock data from ${this.file}`);
      return data.tables as Tables;
    } catch {
      console.warn(`Could not read ${this.file}; starting from demo data.`);
      return undefined;
    }
  }

  private scheduleSave() {
    if (!this.file) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveNow(), 300);
    this.saveTimer.unref?.();
  }

  saveNow() {
    if (!this.file) return;
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify({ version: 1, tables: this.tables }, null, 2));
  }
}
