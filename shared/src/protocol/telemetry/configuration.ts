export const faultModes = [
    "none",
    "invalid-location",
    "offline",
    "stale-data",
] as const

export type FaultMode = (typeof faultModes)[number]

export interface SensorConfiguration {
    reportingIntervalMs: number
    faultMode: FaultMode
}
