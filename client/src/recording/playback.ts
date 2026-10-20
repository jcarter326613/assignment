import type { Location } from "@sensor/shared"
import { fromCompactLocation, type Recording } from "./types"

export function recordingDurationMs(recording: Recording): number {
    return recording.segments.reduce(
        (durationMs, segment) => durationMs + segment[0],
        0,
    )
}

/** Returns the location at an elapsed recording time, or undefined outside the recording. */
export function locationAtElapsedMs(
    recording: Recording,
    elapsedMs: number,
): Location | undefined {
    if (
        !Number.isFinite(elapsedMs) ||
        elapsedMs < 0 ||
        elapsedMs > recordingDurationMs(recording)
    ) {
        return undefined
    }

    let segmentStartElapsedMs = 0
    for (const segment of recording.segments) {
        const [movementDurationMs, startLocation, endLocation] = segment
        const segmentEndElapsedMs = segmentStartElapsedMs + movementDurationMs
        if (elapsedMs <= segmentEndElapsedMs) {
            if (movementDurationMs === 0) {
                return fromCompactLocation(startLocation)
            }

            const progress =
                (elapsedMs - segmentStartElapsedMs) / movementDurationMs
            const start = fromCompactLocation(startLocation)
            const end = fromCompactLocation(endLocation)
            return {
                latitude:
                    start.latitude + (end.latitude - start.latitude) * progress,
                longitude:
                    start.longitude +
                    (end.longitude - start.longitude) * progress,
                altitude:
                    start.altitude + (end.altitude - start.altitude) * progress,
                horizontalAccuracyMeters:
                    start.horizontalAccuracyMeters +
                    (end.horizontalAccuracyMeters -
                        start.horizontalAccuracyMeters) *
                        progress,
            }
        }

        segmentStartElapsedMs = segmentEndElapsedMs
    }

    return undefined
}
