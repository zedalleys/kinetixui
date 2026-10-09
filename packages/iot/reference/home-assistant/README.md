# Home Assistant reference adapter (M4B)

Not part of `@kinetixui/iot`: nothing here is part of the package build, exported or published, and package source never imports
it (`src/functions/device-ledger-boundary.test.ts` fails if it does). It proves the device-ledger boundary in
[§10 of the device contract](../../../../docs/iot/DEVICE-INTERACTION-CONTRACT.md#10-device-ledger-and-provider-integration-m4b).

| File | Owner in a real product | What it shows |
| --- | --- | --- |
| `adapter.ts` | adapter | Pure translation: Home Assistant message → `KinetixDeviceSignal[]`, `KinetixCommandIntent` → `call_service`. Binary power for `light.*` and `switch.*`. |
| `example-app.tsx` | application | The store, the transport interface, request-id correlation, the clock, the timeout schedule, and a `DevicePowerControl` reading the ledger through selectors. |
| `fixtures/messages.json` | — | Synthetic messages shaped from Home Assistant's public WebSocket API documentation. No token, URL or personal data. Not captured from a live instance. |
| `home-assistant.test.tsx` | — | Fixture → adapter → signals → ledger → selector → rendered control, in CI, with no Home Assistant. |

The M4B fixture application leaves transport, authentication, subscriptions and reconnects to its caller.
Persistence and a device registry remain application concerns.

## M4C-A live-session harness

See [LIVE-VALIDATION.md](./LIVE-VALIDATION.md) for the server-only operator CLI, synthetic evidence,
security boundaries and the pending live-provider / physical proof checklist.
