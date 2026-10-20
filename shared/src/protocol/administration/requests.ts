import type { FaultMode } from "../telemetry"

export interface SetFaultModeRequest {
    faultMode: FaultMode
}

export interface SetReportingIntervalRequest {
    reportingIntervalMs: number
}
