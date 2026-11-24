# Mobile app

Phone app for patients and caregivers. Built with [Expo](https://docs.expo.dev) (React Native): one TypeScript codebase for iPhone and Android.

## How it works

| File                      | Layer    | What it does                                                                       |
| ------------------------- | -------- | ---------------------------------------------------------------------------------- |
| `index.ts`                | start-up | Entry point: tells Expo that `App` is the first screen.                            |
| `app.json`                | settings | App name, icon, splash screen, platform options.                                   |
| `src/config.ts`           | settings | Backend address from `EXPO_PUBLIC_API_URL` in `.env`.                              |
| `src/App.tsx`             | UI       | The screen (`<View>` and `<Text>` instead of HTML tags).                           |
| `src/useBackendStatus.ts` | logic    | A hook that asks the backend whether it's online, via `getHealth()` from `shared`. |
| `src/App.test.tsx`        | tests    | Renders the app with a fake `fetch` (Jest + React Native Testing Library).         |
| `jest.config.js`          | tooling  | Uses `jest-expo`, Expo's official test setup.                                      |

Mobile uses **Jest** for tests (Expo's standard). Every other part uses Vitest. The test code looks almost the same.

## Run and test

```bash
cp .env.example .env    # once; set your computer's Wi-Fi address for a real phone
npm start               # scan the QR code with the Expo Go app
npm test
```

**Testing on a real phone:** "127.0.0.1" on a phone means the phone itself. Set `EXPO_PUBLIC_API_URL=http://<your-computer's-Wi-Fi-IP>:4000` in `mobile/.env`, and start the backend with `HOST=0.0.0.0` in `backend/.env`. Your Wi-Fi address is under System Settings → Wi-Fi → Details.

## Where to change things

- **Screen content and styles:** `src/App.tsx` (styles live in `StyleSheet.create` at the bottom).
- **App name, icon, splash:** `app.json` and `assets/`.
- **Backend address:** `mobile/.env`.
- **Talking to a new endpoint:** add a function in `shared/src/api/`, call it from a hook in `src/`.

Step 6 adds navigation (Expo Router) and `src/screens/`, plus secure storage for login tokens (`expo-secure-store`). Never use plain storage for tokens or health data.

## Important: nothing in the app is secret

Everything in `EXPO_PUBLIC_*` variables and in the app code can be read by anyone who downloads the app. Keep API keys (such as Claude's) on the backend only.

## How to scale

- Publish to the stores with **EAS Build / EAS Submit** (Expo's build service). Ship small fixes without a store review using **EAS Update**.
- Production builds must use an `https://` backend address.
