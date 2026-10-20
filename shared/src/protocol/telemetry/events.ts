import type { Location } from "../../coordinates"
import type { SensorConfiguration } from "./configuration"

export interface ConfigurationTelemetryEvent {
    type: "configuration"
    configuration: SensorConfiguration
}

export interface FaultDetails {
    code: string
    description: string
}

export interface FaultTelemetryEvent {
    type: "fault"
    details: FaultDetails
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
    | FaultTelemetryEvent
    | LocationTelemetryEvent
    | TelemetryConnectedEvent
