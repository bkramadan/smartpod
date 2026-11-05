# Glossary

| Word | Plain meaning |
| --- | --- |
| **API** | The fixed list of requests the backend accepts, like a menu. The apps and the Pod order from it. |
| **Adherence** | The share of planned doses actually taken. |
| **Audit log** | A record of every change: who did what, and when. |
| **Backend** | The program that holds the data and the rules. All apps talk to it. |
| **Catalogue** | The list of medicines and supplements the AI engine knows, with their best timing. |
| **Consent / care link** | A patient's permission for a doctor, pharmacist or caregiver to see their data. |
| **CORS** | A browser safety rule; the backend allows the web app to call it. |
| **Data plug (DataStore)** | The single door to the data. Swap what is behind it (mock data → database) without changing the rest. |
| **Device API** | The two URLs a Pod uses: get the schedule, report events. |
| **Dose event** | One planned dose and what happened to it: due, taken, missed or skipped. |
| **Edge / scheduled function** | A small piece of server code that runs on a timer or event, without a server to manage. |
| **`.env` file** | A small text file with settings (addresses, keys). Never put it on GitHub. |
| **ESP32** | A cheap, small computer chip with Wi-Fi and Bluetooth, common in devices like the Pod. |
| **Expo / Expo Go** | Expo lets us write the app once for iPhone and Android. Expo Go is a phone app that runs it during development. |
| **Firmware** | The program that runs on the Pod itself. |
| **Mock data** | Realistic fake data, so everything can be shown before a real database exists. |
| **MQTT** | A lightweight messaging system for many devices; used later when there are thousands of Pods. |
| **npm** | The tool that downloads code libraries (`npm install`) and runs project commands (`npm run dev`). |
| **React / React Native** | A way of building screens from components. React for the web, React Native for phones. |
| **Row-level security** | A database rule that shows each person only their own rows. |
| **SaMD** | Software as a Medical Device: software regulated like a medical device because of what it does. |
| **Supabase** | A ready-made cloud database with sign-in built in; planned for the pilot. |
| **Token** | A pass the app sends with each request to prove who is signed in. |
| **TypeScript** | JavaScript with types: the editor warns you when, say, a date is used where a name was expected. |
| **Vite** | A fast tool that runs and builds the web app. |
