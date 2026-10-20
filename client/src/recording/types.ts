import type { Location } from "@sensor/shared"

export const RECORDING_VERSION = 1

export type TimestampedLocation = Location & {
    timestampMs: number
}

const COORDINATE_SCALE = 10_000_000
const ALTITUDE_SCALE = 100
const ACCURACY_SCALE = 1_000

// Tuple ordering keeps persisted recordings small while remaining explicit at use sites.
export type CompactLocation = readonly [
    longitudeE7: number,
    latitudeE7: number,
    altitudeCentimeters: number,
    horizontalAccuracyMillimeters: number,
]

export type RecordingSegment = readonly [
    movementDurationMs: number,
    startLocation: CompactLocation,
    endLocation: CompactLocation,
]

export type Recording = {
    version: typeof RECORDING_VERSION
    startedAtMs: number
    segments: readonly RecordingSegment[]
}

export function toCompactLocation(location: Location): CompactLocation {
    return [
        Math.round(location.longitude * COORDINATE_SCALE),
        Math.round(location.latitude * COORDINATE_SCALE),
        Math.round(location.altitude * ALTITUDE_SCALE),
        Math.round(location.horizontalAccuracyMeters * ACCURACY_SCALE),
    ]
}

export function fromCompactLocation(location: CompactLocation): Location {
    return {
        longitude: location[0] / COORDINATE_SCALE,
        latitude: location[1] / COORDINATE_SCALE,
        altitude: location[2] / ALTITUDE_SCALE,
        horizontalAccuracyMeters: location[3] / ACCURACY_SCALE,
    }
}
