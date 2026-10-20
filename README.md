# Sensor Stream Assignment

Monorepo scaffold for a simulated field sensor and browser client.

## Requirements

- Node.js 22 or later
- npm 10 or later

## Run locally

```sh
npm install
npm start
```

This starts the React client at `http://localhost:5173` and one Node server
process with two network interfaces:

- Telemetry WebSocket: `ws://localhost:8081`
- Administration REST API: `http://localhost:8080`

Use `TELEMETRY_PORT` and `ADMINISTRATION_PORT` to override the server ports.
Use `VITE_TELEMETRY_URL` and `VITE_ADMINISTRATION_URL` to point the client to
different endpoints.

## Server boundary

The server intentionally has separate `telemetry` and `administration` modules
even though both run in one Node process. They communicate only through the
`control` module, representing the control interface between the sensor and
configuration CPU cores.

Within each server half, `http` creates its listener, `routes` dispatches
protocol paths, and `controllers` translate requests or connections into
actions. Telemetry additionally has a `services` layer that owns socket,
reporting-timer, and power-down state. Its location simulator is nested below
`telemetry/location`; it is not shared with the administration half.

## Shared Contract

The `shared` workspace is the internal `@sensor/shared` package imported by
both the client and server. It owns the coordinate model, reusable geographic
utilities, and network protocol types. The server constructs telemetry events
against these contracts, and the client consumes the same types, preventing
protocol drift at compile time.

The current shared exports are:

- `Location` and `calculateGreatCircleDistanceMeters`
- `protocol/telemetry` for sensor configuration, fault modes, and telemetry
  events
- `protocol/administration` for focused administration request payloads

Root start, test, and type-check commands build the shared package first.

The initial administration API exposes:

- `GET /health`
- `GET /configuration`
- `PUT /reporting-interval`
- `GET /fault-scenarios`
- `PUT /fault-scenario`
- `DELETE /fault-scenario`
- `GET /packet-quality`
- `PUT /bad-packet-percentage`
- `GET /swagger.json`
- `GET /docs/` and `GET /swagger/`

`PUT /reporting-interval` accepts `{ "reportingIntervalMs": 500 }`, where the
interval is an integer of at least 100 milliseconds. The default interval is
`200 ms`. `GET /fault-scenarios` returns the server-owned fault menu; clients
activate a scenario with `PUT /fault-scenario` and `{ "scenarioId": "..." }`.
The server activates it after two seconds. `DELETE /fault-scenario` cancels a
pending scenario or resumes normal behavior.

`PUT /bad-packet-percentage` accepts `{ "badPacketPercentage": 20 }`. For each
selected report, the server randomly simulates a dropped packet, transient
hardware failure, temporary location jump, or poor-accuracy location.

Swagger UI is available at `http://localhost:8080/docs/` and
`http://localhost:8080/swagger/`. Both views use the Swagger document at
`/swagger.json`, which includes the administration commands and instructions
for connecting to and interpreting the realtime telemetry WebSocket.

## Telemetry protocol

The telemetry WebSocket sends JSON events. The first connected client starts
the reporting timer and receives an immediate location event. A client joining
an active stream waits for the next scheduled live report; the server does not
replay prior locations.

```json
{
    "type": "location",
    "timestampMs": 1760967395123,
    "location": {
        "longitude": -81.69436,
        "latitude": 41.49932,
        "altitude": 199,
        "horizontalAccuracyMeters": 0.05
    }
}
```

The server can also report an observed fault:

```json
{
    "type": "fault",
    "details": {
        "code": "poor-sky-visibility",
        "description": "Satellite visibility is insufficient for a reliable position."
    }
}
```

- `longitude` and `latitude` are WGS84 decimal degrees, quantized to seven
  decimal places.
- `altitude` is metres above mean sea level, quantized to two decimal places.
- `horizontalAccuracyMeters` is the estimated horizontal position accuracy.
- `timestampMs` is the UTC Unix epoch timestamp in milliseconds when the server
  generated the report.
- The location begins at Cleveland city center (`41.4993200`, `-81.6943600`)
  at an approximate ground elevation of `199.00 m`.

Seven decimal degree places provide approximately 1.1 cm latitude resolution;
longitude resolution is finer at Cleveland's latitude. Centimetre altitude
resolution also exceeds the required half-inch (1.27 cm) accuracy. JSON
numbers omit insignificant trailing zeroes, but every generated value is
quantized to this resolution.

The random-walk generator selects a bearing, a 1-4 mph speed, and a 3-10 second
walking leg. After each leg it chooses a new set of values. The reporting timer
starts when the first WebSocket client connects and stops after the final client
disconnects. At that point the server calls `LocationGenerator.powerDown()`;
this pauses the simulation so it resumes from the same position on reconnect.

`RandomWalkLocationGenerator` is injected into the production telemetry server.
Tests use `FixedRouteLocationGenerator`, a repeatable route fixture implementing
the same interface. The client retains only the location event with the newest
timestamp and rejects an event whose timestamp is not newer. Fault packets
supplement client-side detection: for example, a power loss may stop telemetry
entirely, requiring the client to detect missing reports without a fault packet.

## Development checks

```sh
npm test
npm run typecheck
npm run lint
npm run format:check
```

Each workspace keeps implementation in `src` and mirrors its unit tests below
`test-unit`.
