export interface FaultScenario {
    id: string
    label: string
}

export interface SetFaultScenarioRequest {
    scenarioId: string
}

export interface PacketQuality {
    badPacketPercentage: number
}

export interface SetBadPacketPercentageRequest {
    badPacketPercentage: number
}

export interface SetReportingIntervalRequest {
    reportingIntervalMs: number
}
