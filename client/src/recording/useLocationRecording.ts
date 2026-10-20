import { useEffect, useRef, useState } from "react"
import type { Location } from "@sensor/shared"
import { LocationRecorder } from "./locationCompression"
import { locationAtElapsedMs, recordingDurationMs } from "./playback"
import { loadRecording, saveRecording } from "./recordingStorage"
import type { Recording, TimestampedLocation } from "./types"

export type RecordingState = "idle" | "recording" | "playing"

export function useLocationRecording() {
    const [recording, setRecording] = useState<Recording | undefined>(() =>
        loadRecording(),
    )
    const [recordingState, setRecordingState] = useState<RecordingState>("idle")
    const [playbackLocation, setPlaybackLocation] = useState<Location>()
    const [recordingWarning, setRecordingWarning] = useState<string>()
    const recorderRef = useRef<LocationRecorder | undefined>(undefined)
    const recordingStateRef = useRef(recordingState)

    recordingStateRef.current = recordingState

    const recordAcceptedLocation = useRef((location: TimestampedLocation) => {
        if (recordingStateRef.current !== "recording") {
            return
        }

        try {
            recorderRef.current?.append(location)
        } catch {
            setRecordingWarning(
                "A location could not be added to the recording.",
            )
        }
    }).current

    function startRecording(initialLocation: TimestampedLocation) {
        try {
            recorderRef.current = new LocationRecorder(initialLocation)
            setRecordingWarning(undefined)
            setRecordingState("recording")
        } catch {
            setRecordingWarning(
                "The current location cannot start a recording.",
            )
        }
    }

    function stopRecording() {
        const recorder = recorderRef.current
        if (recorder === undefined) {
            return
        }

        const completedRecording = recorder.finish()
        recorderRef.current = undefined
        setRecording(completedRecording)
        setRecordingState("idle")

        if (!saveRecording(completedRecording)) {
            setRecordingWarning(
                "Recording is available now but could not be saved in this browser.",
            )
        }
    }

    function playRecording() {
        if (
            recording === undefined ||
            recordingDurationMs(recording) === 0 ||
            recordingState !== "idle"
        ) {
            return
        }

        setPlaybackLocation(locationAtElapsedMs(recording, 0))
        setRecordingWarning(undefined)
        setRecordingState("playing")
    }

    useEffect(() => {
        if (recordingState !== "playing" || recording === undefined) {
            return
        }

        const durationMs = recordingDurationMs(recording)
        const startedAtMs = performance.now()
        const updatePlayback = () => {
            const elapsedMs = Math.min(
                performance.now() - startedAtMs,
                durationMs,
            )
            setPlaybackLocation(locationAtElapsedMs(recording, elapsedMs))

            if (elapsedMs === durationMs) {
                setRecordingState("idle")
                setPlaybackLocation(undefined)
            }
        }
        const timer = window.setInterval(updatePlayback, 100)

        return () => window.clearInterval(timer)
    }, [recording, recordingState])

    return {
        playbackLocation,
        recordAcceptedLocation,
        recording,
        recordingState,
        recordingWarning,
        startRecording,
        stopRecording,
        playRecording,
    }
}
