import { useEffect, useRef, useState } from "react"
import type { LocationTelemetryEvent } from "@sensor/shared/protocol/telemetry"

const telemetryUrl = import.meta.env.VITE_TELEMETRY_URL ?? "ws://localhost:8081"
const administrationUrl =
    import.meta.env.VITE_ADMINISTRATION_URL ?? "http://localhost:8080"

type ConnectionState = "connecting" | "connected" | "disconnected"

export default function App() {
    const [connectionState, setConnectionState] =
        useState<ConnectionState>("connecting")
    const [lastEvent, setLastEvent] = useState("Waiting for telemetry")
    const [latestLocationTimestamp, setLatestLocationTimestamp] = useState<
        number | undefined
    >()
    const latestLocationTimestampRef = useRef<number | undefined>(undefined)

    useEffect(() => {
        const socket = new WebSocket(telemetryUrl)

        socket.onopen = () => setConnectionState("connected")
        socket.onclose = () => setConnectionState("disconnected")
        socket.onerror = () => setConnectionState("disconnected")
        socket.onmessage = (event: MessageEvent<string>) => {
            try {
                const telemetryEvent = JSON.parse(
                    event.data,
                ) as Partial<LocationTelemetryEvent>

                if (
                    telemetryEvent.type === "location" &&
                    typeof telemetryEvent.timestampMs === "number"
                ) {
                    if (
                        latestLocationTimestampRef.current !== undefined &&
                        telemetryEvent.timestampMs <=
                            latestLocationTimestampRef.current
                    ) {
                        return
                    }

                    latestLocationTimestampRef.current =
                        telemetryEvent.timestampMs
                    setLatestLocationTimestamp(telemetryEvent.timestampMs)
                }
            } catch {
                // Non-JSON events remain visible for initial protocol debugging.
            }

            setLastEvent(event.data)
        }

        return () => socket.close()
    }, [])

    return (
        <main>
            <p className="eyebrow">Field sensor monitor</p>
            <h1>Telemetry client</h1>
            <section aria-label="Telemetry connection">
                <h2>Telemetry connection</h2>
                <p data-testid="connection-state">{connectionState}</p>
                <p data-testid="latest-location-timestamp">
                    Latest location timestamp:{" "}
                    {latestLocationTimestamp ?? "none"}
                </p>
                <p>{lastEvent}</p>
            </section>
            <section aria-label="Administration">
                <a href={`${administrationUrl}/swagger`}>
                    Open administration Swagger
                </a>
            </section>
        </main>
    )
}
