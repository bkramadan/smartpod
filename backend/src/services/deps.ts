/**
 * What every service needs. Passing these in (instead of importing globals) makes it
 * easy to swap the data store, the AI explainer or the clock — tests use a fixed clock.
 */
import { randomUUID } from 'node:crypto';
import type { Config } from '../config.ts';
import type { Explainer } from '../ai/explainer.ts';
import type { DataStore } from '../store/DataStore.ts';

export interface Deps {
  store: DataStore;
  explainer: Explainer;
  config: Config;
  now: () => Date;
}

export const newId = (prefix: string) => `${prefix}-${randomUUID().slice(0, 8)}`;
