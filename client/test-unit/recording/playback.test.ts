import { expect, test } from "vitest"
import {
    locationAtElapsedMs,
    recordingDurationMs,
} from "../../src/recording/playback"
import { RECORDING_VERSION, type Recording } from "../../src/recording/types"

const recording: Recording = {
    version: RECORDING_VERSION,
    startedAtMs: 10_000,
    segments: [
        [
            1_000,
            [-800000000, 400000000, 10000, 4000],
            [-780000000, 420000000, 20000, 8000],
        ],
        [
            1_000,
            [-780000000, 420000000, 20000, 8000],
            [-770000000, 430000000, 30000, 12000],
        ],
    ],
}

test("interpolates every location value at an elapsed time", () => {
    expect(locationAtElapsedMs(recording, 500)).toEqual({
        latitude: 41,
        longitude: -79,
        altitude: 150,
        horizontalAccuracyMeters: 6,
    })
})

test("queries segment boundaries and rejects elapsed times outside the recording", () => {
    expect(recordingDurationMs(recording)).toBe(2_000)
    expect(locationAtElapsedMs(recording, 1_000)).toEqual({
        latitude: 42,
        longitude: -78,
        altitude: 200,
        horizontalAccuracyMeters: 8,
    })
    expect(locationAtElapsedMs(recording, -1)).toBeUndefined()
    expect(locationAtElapsedMs(recording, 2_001)).toBeUndefined()
})
