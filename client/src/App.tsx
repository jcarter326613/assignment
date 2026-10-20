import { useEffect, useRef, useState } from "react"
import type { Location } from "@sensor/shared"
import type {
    FaultTelemetryEvent,
    LocationTelemetryEvent,
} from "@sensor/shared/protocol/telemetry"
import type { FaultScenario } from "@sensor/shared/protocol/administration"

const telemetryUrl = import.meta.env.VITE_TELEMETRY_URL ?? "ws://localhost:8081"
const administrationUrl =
    import.meta.env.VITE_ADMINISTRATION_URL ?? "http://localhost:8080"

type ConnectionState = "connecting" | "connected" | "disconnected"

const MAX_WALKING_SPEED_METERS_PER_SECOND = 8.9408
const STALE_LOCATION_THRESHOLD_MS = 1_000
const TELEPORT_CONFIRMATION_COUNT = 3
const PACKETS_PER_WINDOW = 5
const HEALTH_WINDOW_DURATION_MS = 200 * PACKETS_PER_WINDOW * 1.1

type HealthStatus = "normal" | "degraded" | "critical"

function distanceMeters(first: Location, second: Location) {
    const latitudeDifference =
        ((second.latitude - first.latitude) * Math.PI) / 180
    const longitudeDifference =
        ((second.longitude - first.longitude) * Math.PI) / 180
    const latitudeOne = (first.latitude * Math.PI) / 180
    const latitudeTwo = (second.latitude * Math.PI) / 180
    const chord =
        Math.sin(latitudeDifference / 2) ** 2 +
        Math.cos(latitudeOne) *
            Math.cos(latitudeTwo) *
            Math.sin(longitudeDifference / 2) ** 2

    return 2 * 6_378_137 * Math.atan2(Math.sqrt(chord), Math.sqrt(1 - chord))
}

export default function App() {
    const [connectionState, setConnectionState] =
        useState<ConnectionState>("connecting")
    const [lastEvent, setLastEvent] = useState("Waiting for telemetry")
    const [latestLocationTimestamp, setLatestLocationTimestamp] = useState<
        number | undefined
    >()
    const [latestLocation, setLatestLocation] = useState<Location>()
    const [faultScenarios, setFaultScenarios] = useState<FaultScenario[]>([])
    const [serverFault, setServerFault] = useState<string>()
    const [clientWarning, setClientWarning] = useState<string>()
    const [healthStatus, setHealthStatus] = useState<HealthStatus>("normal")
    const [accuracyThresholdFeet, setAccuracyThresholdFeet] = useState(1)
    const [badPacketPercentage, setBadPacketPercentage] = useState(0)
    const accuracyThresholdFeetRef = useRef(accuracyThresholdFeet)
    const latestLocationTimestampRef = useRef<number | undefined>(undefined)
    const lastAcceptedLocationRef = useRef<
        { location: Location; timestampMs: number } | undefined
    >(undefined)
    const teleportCandidateRef = useRef<
        | {
              location: Location
              timestampMs: number
              followOnCount: number
          }
        | undefined
    >(undefined)
    const healthWindowRef = useRef({
        goodPackets: 0,
        startedAtMs: Date.now(),
        windows: [] as number[],
    })

    accuracyThresholdFeetRef.current = accuracyThresholdFeet

    useEffect(() => {
        void fetch(`${administrationUrl}/fault-scenarios`)
            .then(async (response) => {
                if (response.ok) {
                    setFaultScenarios(
                        (await response.json()) as FaultScenario[],
                    )
                }
            })
            .catch(() =>
                setClientWarning("Fault scenario menu is unavailable."),
            )
    }, [])

    useEffect(() => {
        void fetch(`${administrationUrl}/packet-quality`)
            .then(async (response) => {
                if (response.ok) {
                    const quality = (await response.json()) as {
                        badPacketPercentage: number
                    }
                    setBadPacketPercentage(quality.badPacketPercentage)
                }
            })
            .catch(() =>
                setClientWarning("Packet quality control is unavailable."),
            )
    }, [])

    function updateHealthStatus(nowMs: number) {
        const healthWindow = healthWindowRef.current

        while (nowMs - healthWindow.startedAtMs >= HEALTH_WINDOW_DURATION_MS) {
            healthWindow.windows.push(healthWindow.goodPackets)
            healthWindow.windows = healthWindow.windows.slice(-3)
            healthWindow.goodPackets = 0
            healthWindow.startedAtMs += HEALTH_WINDOW_DURATION_MS
        }

        const lastAcceptedLocation = lastAcceptedLocationRef.current

        if (
            lastAcceptedLocation !== undefined &&
            nowMs - lastAcceptedLocation.timestampMs >
                STALE_LOCATION_THRESHOLD_MS
        ) {
            setClientWarning("Location data is stale.")
            setHealthStatus("critical")
            return
        }

        const unhealthyWindows = healthWindow.windows.filter(
            (goodPackets) => goodPackets < PACKETS_PER_WINDOW,
        ).length
        setHealthStatus(
            healthWindow.windows.length === 3 && unhealthyWindows >= 2
                ? "degraded"
                : "normal",
        )
    }

    useEffect(() => {
        const staleTimer = setInterval(
            () => updateHealthStatus(Date.now()),
            100,
        )

        return () => clearInterval(staleTimer)
    }, [])

    useEffect(() => {
        document.body.classList.toggle(
            "critical-condition",
            healthStatus === "critical",
        )
        document.body.classList.toggle(
            "degraded-condition",
            healthStatus === "degraded",
        )

        return () => {
            document.body.classList.remove("critical-condition")
            document.body.classList.remove("degraded-condition")
        }
    }, [healthStatus])

    useEffect(() => {
        const socket = new WebSocket(telemetryUrl)

        socket.onopen = () => setConnectionState("connected")
        socket.onclose = () => setConnectionState("disconnected")
        socket.onerror = () => setConnectionState("disconnected")
        socket.onmessage = (event: MessageEvent<string>) => {
            try {
                const telemetryEvent = JSON.parse(event.data) as
                    | Partial<FaultTelemetryEvent>
                    | Partial<LocationTelemetryEvent>

                if (
                    telemetryEvent.type === "location" &&
                    typeof telemetryEvent.timestampMs === "number" &&
                    "location" in telemetryEvent &&
                    telemetryEvent.location !== undefined
                ) {
                    if (
                        latestLocationTimestampRef.current !== undefined &&
                        telemetryEvent.timestampMs <=
                            latestLocationTimestampRef.current
                    ) {
                        return
                    }

                    const location = telemetryEvent.location
                    const lastAcceptedLocation = lastAcceptedLocationRef.current

                    if (lastAcceptedLocation !== undefined) {
                        const elapsedSeconds =
                            (telemetryEvent.timestampMs -
                                lastAcceptedLocation.timestampMs) /
                            1_000
                        const speed =
                            elapsedSeconds > 0
                                ? distanceMeters(
                                      lastAcceptedLocation.location,
                                      location,
                                  ) / elapsedSeconds
                                : Infinity

                        if (speed > MAX_WALKING_SPEED_METERS_PER_SECOND) {
                            const candidate = teleportCandidateRef.current

                            if (candidate === undefined) {
                                teleportCandidateRef.current = {
                                    location,
                                    timestampMs: telemetryEvent.timestampMs,
                                    followOnCount: 0,
                                }
                                return
                            }

                            const candidateElapsedSeconds =
                                (telemetryEvent.timestampMs -
                                    candidate.timestampMs) /
                                1_000
                            const candidateSpeed =
                                candidateElapsedSeconds > 0
                                    ? distanceMeters(
                                          candidate.location,
                                          location,
                                      ) / candidateElapsedSeconds
                                    : Infinity

                            if (
                                candidateSpeed <=
                                MAX_WALKING_SPEED_METERS_PER_SECOND
                            ) {
                                candidate.followOnCount += 1
                                candidate.location = location
                                candidate.timestampMs =
                                    telemetryEvent.timestampMs

                                if (
                                    candidate.followOnCount <
                                    TELEPORT_CONFIRMATION_COUNT
                                ) {
                                    return
                                }

                                setClientWarning("Teleportation detected.")
                            } else {
                                teleportCandidateRef.current = undefined
                                return
                            }
                        } else {
                            teleportCandidateRef.current = undefined
                        }
                    }

                    latestLocationTimestampRef.current =
                        telemetryEvent.timestampMs
                    lastAcceptedLocationRef.current = {
                        location,
                        timestampMs: telemetryEvent.timestampMs,
                    }
                    healthWindowRef.current.goodPackets += 1
                    updateHealthStatus(Date.now())
                    setLatestLocationTimestamp(telemetryEvent.timestampMs)
                    setLatestLocation(location)

                    if (
                        location.horizontalAccuracyMeters >
                        accuracyThresholdFeetRef.current * 0.3048
                    ) {
                        setClientWarning("Location accuracy is too low.")
                    } else {
                        setClientWarning(undefined)
                    }
                }

                if (
                    telemetryEvent.type === "fault" &&
                    "details" in telemetryEvent &&
                    telemetryEvent.details !== undefined
                ) {
                    if (telemetryEvent.details !== undefined) {
                        setServerFault(
                            `${telemetryEvent.details.code}: ${telemetryEvent.details.description}`,
                        )
                    }
                }
            } catch {
                // Non-JSON events remain visible for initial protocol debugging.
            }

            setLastEvent(event.data)
        }

        return () => socket.close()
    }, [])

    async function scheduleFaultScenario(scenarioId: string) {
        await fetch(`${administrationUrl}/fault-scenario`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ scenarioId }),
        })
    }

    async function resumeNormalBehavior() {
        await fetch(`${administrationUrl}/fault-scenario`, { method: "DELETE" })
        setServerFault(undefined)
        setClientWarning(undefined)
    }

    async function applyBadPacketPercentage() {
        await fetch(`${administrationUrl}/bad-packet-percentage`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ badPacketPercentage }),
        })
    }

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
                <p>Longitude: {latestLocation?.longitude ?? "waiting"}</p>
                <p>Latitude: {latestLocation?.latitude ?? "waiting"}</p>
                <p>
                    Horizontal accuracy:{" "}
                    {latestLocation?.horizontalAccuracyMeters ?? "waiting"} m
                </p>
                <div className="status-area" role="status">
                    <p>Service status: {healthStatus}</p>
                    <p>
                        {serverFault === undefined
                            ? ""
                            : `Server fault: ${serverFault}`}
                    </p>
                    <p role="alert">{clientWarning ?? ""}</p>
                </div>
            </section>
            <section aria-label="Fault scenarios">
                <h2>Fault scenarios</h2>
                {faultScenarios.map((scenario) => (
                    <button
                        key={scenario.id}
                        onClick={() => void scheduleFaultScenario(scenario.id)}
                    >
                        {scenario.label}
                    </button>
                ))}
                <button onClick={() => void resumeNormalBehavior()}>
                    Resume normal behavior
                </button>
            </section>
            <section aria-label="Accuracy threshold">
                <label>
                    Accuracy warning threshold (feet)
                    <input
                        min="0.1"
                        onChange={(event) =>
                            setAccuracyThresholdFeet(Number(event.target.value))
                        }
                        step="0.1"
                        type="number"
                        value={accuracyThresholdFeet}
                    />
                </label>
            </section>
            <section aria-label="Packet quality">
                <label>
                    Bad packet percentage
                    <input
                        max="100"
                        min="0"
                        onChange={(event) =>
                            setBadPacketPercentage(Number(event.target.value))
                        }
                        step="1"
                        type="number"
                        value={badPacketPercentage}
                    />
                </label>
                <button onClick={() => void applyBadPacketPercentage()}>
                    Apply packet quality
                </button>
            </section>
            <section aria-label="Administration">
                <a href={`${administrationUrl}/swagger`}>
                    Open administration Swagger
                </a>
            </section>
        </main>
    )
}
