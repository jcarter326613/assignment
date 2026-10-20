export type FaultMode = "none" | "invalid-location" | "offline" | "stale-data"

export interface SensorConfiguration {
    reportingIntervalMs: number
    faultMode: FaultMode
}
