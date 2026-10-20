import { expect, test } from "vitest"
import {
    RECORDING_STORAGE_KEY,
    loadRecording,
    saveRecording,
} from "../../src/recording/recordingStorage"
import { RECORDING_VERSION, type Recording } from "../../src/recording/types"

function storage(initial: Record<string, string> = {}) {
    const values = new Map(Object.entries(initial))
    return {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
    }
}

const recording: Recording = {
    version: RECORDING_VERSION,
    startedAtMs: 1_000,
    segments: [
        [
            500,
            [-810000000, 410000000, 20000, 5000],
            [-809000000, 411000000, 21000, 6000],
        ],
    ],
}

test("saves and loads one validated recording", () => {
    const localStorage = storage()

    expect(saveRecording(recording, localStorage)).toBe(true)
    expect(loadRecording(localStorage)).toEqual(recording)
})

test("does not load malformed or unsupported recording data", () => {
    const localStorage = storage({
        [RECORDING_STORAGE_KEY]: JSON.stringify({ ...recording, version: 99 }),
    })

    expect(loadRecording(localStorage)).toBeUndefined()
})

test("contains storage write failures", () => {
    const unavailableStorage = {
        getItem: () => null,
        setItem: () => {
            throw new Error("Quota exceeded")
        },
    }

    expect(saveRecording(recording, unavailableStorage)).toBe(false)
})
