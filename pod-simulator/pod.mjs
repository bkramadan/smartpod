#!/usr/bin/env node
/**
 * Smart Pod simulator — pretends to be the Pod hardware.
 *
 * It uses exactly the same Device API a real Pod (ESP32 firmware) will use:
 *   GET  /api/device/schedule   → the doses for the next 24 hours
 *   POST /api/device/events     → heartbeat, dispensed, jam
 * So the hardware team can test their firmware against the same backend, and the
 * app team can demo the full flow before the hardware exists.
 *
 * Run:   node pod.mjs                 keep running, dispense each dose at its time
 *        node pod.mjs --now           dispense the next dose straight away (for demos)
 *        node pod.mjs --jam           report a jam (to demo caregiver alerts)
 *        node pod.mjs --once          check the schedule once and exit
 *
 * Settings (environment variables or a .env file next to this script):
 *   API_URL  default http://localhost:4000
 *   POD_ID   default pod-maria-01   (the demo Pod for Maria)
 *   POD_KEY  default demo-pod-key
 * No installation needed: it only uses Node.js itself (version 20 or newer).
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const envFile = join(here, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

const API_URL = process.env.API_URL || 'http://localhost:4000';
const POD_ID = process.env.POD_ID || 'pod-maria-01';
const POD_KEY = process.env.POD_KEY || 'demo-pod-key';
const FIRMWARE = 'sim-0.1';
const args = new Set(process.argv.slice(2));

let battery = 90;
const dispensed = new Set();

const hhmm = (iso) => new Date(iso).toTimeString().slice(0, 5);
const log = (...m) => console.log(`[${new Date().toTimeString().slice(0, 8)}] Pod ${POD_ID}:`, ...m);

async function call(method, path, body) {
  const res = await fetch(API_URL + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Device-Id': POD_ID, 'X-Device-Key': POD_KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${data.error ?? ''}`);
  return data;
}

async function schedule() {
  const s = await call('GET', '/api/device/schedule');
  return s.doses;
}

async function dispense(dose) {
  log(`🔄 turning compartment… releasing ${dose.name} ${dose.dose} (planned ${hhmm(dose.plannedAt)})`);
  // A real Pod: motor turns, the drop sensor confirms the pill left, then it reports.
  const result = await call('POST', '/api/device/events', { type: 'dispensed', doseId: dose.doseId, battery });
  dispensed.add(dose.doseId);
  log(`✅ dispensed and confirmed. Status in the app: ${result.status}, confirmed by ${result.confirmedBy}`);
}

async function heartbeat() {
  battery = Math.max(5, battery - 0.2);
  await call('POST', '/api/device/events', { type: 'heartbeat', battery: Math.round(battery), firmware: FIRMWARE });
}

async function cycle() {
  await heartbeat();
  const doses = await schedule();
  const now = Date.now();
  for (const dose of doses) {
    if (dispensed.has(dose.doseId)) continue;
    if (new Date(dose.plannedAt).getTime() <= now) await dispense(dose);
  }
  const next = doses.find((d) => !dispensed.has(d.doseId) && new Date(d.plannedAt).getTime() > now);
  return next;
}

async function main() {
  log(`connecting to ${API_URL}`);
  try {
    if (args.has('--jam')) {
      await call('POST', '/api/device/events', { type: 'jam', battery });
      log('⚠️  reported a jam. The patient and caregiver get an alert.');
      return;
    }
    if (args.has('--now')) {
      await heartbeat();
      const [next] = await schedule();
      if (!next) return log('no upcoming doses in the next 24 hours.');
      try {
        await dispense(next);
      } catch (e) {
        if (!e.message.startsWith('409')) throw e;
        log(`next dose is ${next.name} at ${hhmm(next.plannedAt)}; it can be released from 2 hours before.`);
      }
      return;
    }
    const next = await cycle();
    log(next ? `next dose: ${next.name} at ${hhmm(next.plannedAt)}` : 'no more doses in the next 24 hours');
    if (args.has('--once')) return;
    log('running. Checking every 15 seconds. Press Ctrl+C to stop.');
    setInterval(async () => {
      try {
        await cycle();
      } catch (e) {
        log('❌', e.message);
      }
    }, 15000);
  } catch (e) {
    log('❌', e.message);
    if (e.message.startsWith('401')) log('Check POD_ID and POD_KEY (pair a Pod in the app, or use the demo defaults).');
    if (e.cause?.code === 'ECONNREFUSED') log('The backend is not running. Start it with: cd backend && npm run dev');
    process.exitCode = 1;
  }
}

main();
