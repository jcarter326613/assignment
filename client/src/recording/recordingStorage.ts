import {
    RECORDING_VERSION,
    type CompactLocation,
    type Recording,
    type RecordingSegment,
} from "./types"

export const RECORDING_STORAGE_KEY = "sensor-location-recording"

type StorageLike = Pick<Storage, "getItem" | "setItem">

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value)
}

function isCompactLocation(value: unknown): value is CompactLocation {
    return (
        Array.isArray(value) &&
        value.length === 4 &&
        value.every(isFiniteNumber) &&
        value.every(Number.isInteger) &&
        value[0] >= -1_800_000_000 &&
        value[0] <= 1_800_000_000 &&
        value[1] >= -900_000_000 &&
        value[1] <= 900_000_000 &&
        value[3] >= 0
    )
}

function isSegment(value: unknown): value is RecordingSegment {
    return (
        Array.isArray(value) &&
        value.length === 3 &&
        isFiniteNumber(value[0]) &&
        value[0] >= 0 &&
        Number.isInteger(value[0]) &&
        isCompactLocation(value[1]) &&
        isCompactLocation(value[2])
    )
}

export function isRecording(value: unknown): value is Recording {
    if (typeof value !== "object" || value === null) {
        return false
    }

    const recording = value as Partial<Recording>
    const segments = recording.segments
    if (
        recording.version !== RECORDING_VERSION ||
        !isFiniteNumber(recording.startedAtMs) ||
        !Array.isArray(segments) ||
        segments.length === 0 ||
        !segments.every(isSegment)
    ) {
        return false
    }

    return segments.every((segment, index) => {
        if (index === 0) {
            return true
        }

        const previous = segments[index - 1]
        return segment[1].every(
            (value, locationIndex) => value === previous[2][locationIndex],
        )
    })
}

function browserStorage(): StorageLike | undefined {
    try {
        return globalThis.localStorage
    } catch {
        return undefined
    }
}

export function saveRecording(
    recording: Recording,
    storage: StorageLike | undefined = browserStorage(),
): boolean {
    if (!storage || !isRecording(recording)) {
        return false
    }

    try {
        storage.setItem(RECORDING_STORAGE_KEY, JSON.stringify(recording))
        return true
    } catch {
        return false
    }
}

export function loadRecording(
    storage: StorageLike | undefined = browserStorage(),
): Recording | undefined {
    if (!storage) {
        return undefined
    }

    try {
        const serialized = storage.getItem(RECORDING_STORAGE_KEY)
        if (serialized === null) {
            return undefined
        }

        const recording: unknown = JSON.parse(serialized)
        return isRecording(recording) ? recording : undefined
    } catch {
        return undefined
    }
}
