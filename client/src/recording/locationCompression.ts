import type { Location } from "@sensor/shared"
import {
    RECORDING_VERSION,
    toCompactLocation,
    type Recording,
    type RecordingSegment,
    type TimestampedLocation,
} from "./types"

function horizontalDistanceMeters(
    first: Pick<Location, "latitude" | "longitude">,
    second: Pick<Location, "latitude" | "longitude">,
) {
    const latitudeDifference =
        ((second.latitude - first.latitude) * Math.PI) / 180
    const longitudeDifference =
        ((second.longitude - first.longitude) * Math.PI) / 180
    const firstLatitude = (first.latitude * Math.PI) / 180
    const secondLatitude = (second.latitude * Math.PI) / 180
    const chord =
        Math.sin(latitudeDifference / 2) ** 2 +
        Math.cos(firstLatitude) *
            Math.cos(secondLatitude) *
            Math.sin(longitudeDifference / 2) ** 2

    return 2 * 6_378_137 * Math.atan2(Math.sqrt(chord), Math.sqrt(1 - chord))
}

function isValidLocation(location: TimestampedLocation) {
    return (
        Number.isFinite(location.timestampMs) &&
        Number.isFinite(location.latitude) &&
        Number.isFinite(location.longitude) &&
        Number.isFinite(location.altitude) &&
        Number.isFinite(location.horizontalAccuracyMeters) &&
        location.latitude >= -90 &&
        location.latitude <= 90 &&
        location.longitude >= -180 &&
        location.longitude <= 180 &&
        location.horizontalAccuracyMeters >= 0
    )
}

function followsMovementVector(
    start: TimestampedLocation,
    previous: TimestampedLocation,
    candidate: TimestampedLocation,
) {
    const previousElapsedMs = previous.timestampMs - start.timestampMs
    const candidateElapsedMs = candidate.timestampMs - start.timestampMs
    const ratio = candidateElapsedMs / previousElapsedMs
    const predicted = {
        latitude: start.latitude + (previous.latitude - start.latitude) * ratio,
        longitude:
            start.longitude + (previous.longitude - start.longitude) * ratio,
        altitude: start.altitude + (previous.altitude - start.altitude) * ratio,
    }
    const horizontalDifferenceMeters = horizontalDistanceMeters(
        predicted,
        candidate,
    )
    // Two horizontal measurements contribute uncertainty to the movement vector.
    const toleranceMeters =
        2 *
        Math.hypot(
            previous.horizontalAccuracyMeters,
            candidate.horizontalAccuracyMeters,
        )

    return horizontalDifferenceMeters <= toleranceMeters
}

function createSegment(
    start: TimestampedLocation,
    end: TimestampedLocation,
): RecordingSegment {
    return [
        end.timestampMs - start.timestampMs,
        toCompactLocation(start),
        toCompactLocation(end),
    ]
}

export class LocationRecorder {
    private readonly segments: RecordingSegment[] = []
    private segmentStart: TimestampedLocation
    private previous: TimestampedLocation

    constructor(private readonly initialLocation: TimestampedLocation) {
        if (!isValidLocation(initialLocation)) {
            throw new RangeError(
                "Locations must contain finite, valid coordinates",
            )
        }

        this.segmentStart = initialLocation
        this.previous = initialLocation
    }

    append(candidate: TimestampedLocation) {
        if (!isValidLocation(candidate)) {
            throw new RangeError(
                "Locations must contain finite, valid coordinates",
            )
        }

        if (candidate.timestampMs <= this.previous.timestampMs) {
            throw new RangeError(
                "Locations must have strictly increasing timestamps",
            )
        }

        if (
            this.previous !== this.segmentStart &&
            !followsMovementVector(this.segmentStart, this.previous, candidate)
        ) {
            this.segments.push(createSegment(this.segmentStart, this.previous))
            this.segmentStart = this.previous
        }

        this.previous = candidate
    }

    finish(): Recording {
        return {
            version: RECORDING_VERSION,
            startedAtMs: this.initialLocation.timestampMs,
            segments: [
                ...this.segments,
                createSegment(this.segmentStart, this.previous),
            ],
        }
    }
}

/** Compresses strictly time-ordered, accepted location readings into linear segments. */
export function compressLocations(
    locations: readonly TimestampedLocation[],
): Recording | undefined {
    const initialLocation = locations[0]
    if (initialLocation === undefined) {
        return undefined
    }

    const recorder = new LocationRecorder(initialLocation)
    for (const location of locations.slice(1)) {
        recorder.append(location)
    }

    return recorder.finish()
}
