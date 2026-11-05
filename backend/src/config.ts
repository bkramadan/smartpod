/**
 * Settings, read once from environment variables (or a .env file).
 * See .env.example for what each one does.
 */
import { existsSync, readFileSync } from 'node:fs';

/** Minimal .env loader so the backend needs no extra library. */
function loadDotEnv(path = '.env') {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, raw] = match;
    if (process.env[key] === undefined) process.env[key] = raw.replace(/^["']|["']$/g, '');
  }
}

loadDotEnv();

export const config = {
  port: Number(process.env.PORT ?? 4000),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  claudeModel: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
  missedAfterMinutes: Number(process.env.MISSED_AFTER_MINUTES ?? 60),
  dataFile: process.env.DATA_FILE ?? 'data/demo-db.json',
  /** How often the background job runs (reminders, missed doses). */
  tickSeconds: 30,
};

export type Config = typeof config;
