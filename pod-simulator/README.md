# Pod simulator

A small program that behaves like the Smart Pod hardware, so the whole system can be built and tested before the real device is ready. It uses **exactly the same API** a real Pod will use. When the hardware arrives, nothing in the backend has to change.

## How it works

| File                  | What it does                                                               |
| --------------------- | -------------------------------------------------------------------------- |
| `src/index.ts`        | Entry point. Today: checks the backend is reachable and prints the result. |
| `src/config.ts`       | Reads `API_URL` from `.env` and checks it's a valid web address.           |
| `test/config.test.ts` | Tests the settings check.                                                  |

It calls the backend through `getHealth()` from `shared`, the same client the apps use.

## Run and test

```bash
cp .env.example .env    # once
npm start               # or `npm run pod` from the root (start the backend first)
npm test
```

## Where to change things

Step 5 adds the Device API. The simulator will then:

1. **Identify itself** with its own Pod key (each Pod has a separate key that can be revoked on its own).
2. **Fetch its dispensing schedule** from the backend.
3. **Report events**: dose dispensed, dose taken, dose missed, low stock, lid opened.

New behaviour goes in `src/` (e.g. `src/device.ts` for the API calls and `src/scenarios.ts` for scripted demos), and the request/response shapes go in `shared/src/schemas/`.

## How to scale

- **Many simulated Pods:** run several copies with different Pod keys to load-test the backend.
- **Real hardware:** the firmware (likely C/C++ on a microcontroller such as ESP32) follows the same Device API, using HTTPS with a per-device key. If there are later many devices sending data all the time, MQTT can be added. The schemas in `shared/` stay the contract either way.
