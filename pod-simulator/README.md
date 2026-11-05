# Pod simulator

Pretends to be the Pod hardware using the same Device API the real Pod will use. No install needed.

```bash
node pod.mjs           # release each dose at its time
node pod.mjs --now     # release the next dose now (within 2 hours of its time)
node pod.mjs --jam     # report a jam
```

Defaults use Maria's demo Pod. For another Pod, copy `.env.example` to `.env`. Contract: [../docs/POD-INTEGRATION.md](../docs/POD-INTEGRATION.md).
