import type { Location } from "./coordinates"

export type FaultMode = "none" | "invalid-location" | "offline" | "stale-data"

export interface SensorConfiguration {
    reportingIntervalMs: number
    faultMode: FaultMode
}

export type SensorConfigurationUpdate = Partial<SensorConfiguration>

export interface ConfigurationTelemetryEvent {
    type: "configuration"
    configuration: SensorConfiguration
}

export interface LocationTelemetryEvent {
    type: "location"
    timestampMs: number
    location: Location
}

export interface TelemetryConnectedEvent {
    type: "telemetry-connected"
    configuration: SensorConfiguration
}

export type TelemetryEvent =
    | ConfigurationTelemetryEvent
    | LocationTelemetryEvent
    | TelemetryConnectedEvent
