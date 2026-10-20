export interface FaultScenario {
    id: string
    label: string
}

export interface SetFaultScenarioRequest {
    scenarioId: string
}

export interface SetReportingIntervalRequest {
    reportingIntervalMs: number
}
