# Mobile app

Expo (React Native), one codebase for iPhone and Android.

```bash
npm install
cp .env.example .env     # put your computer's address (the backend prints it)
npx expo start           # scan the QR code with Expo Go
```

If Expo Go asks for a newer SDK: `npx expo install expo@latest && npx expo install --fix`.
One file per screen in `app/`. Full guide: [../docs/GETTING-STARTED.md](../docs/GETTING-STARTED.md).
