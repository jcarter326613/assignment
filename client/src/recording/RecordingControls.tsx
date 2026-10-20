import type { TimestampedLocation } from "./types"
import type { RecordingState } from "./useLocationRecording"
import "./recording.css"

type RecordingControlsProps = {
    currentLocation: TimestampedLocation | undefined
    hasRecording: boolean
    onPlayRecording: () => void
    onStartRecording: (location: TimestampedLocation) => void
    onStopRecording: () => void
    recordingState: RecordingState
    warning: string | undefined
}

export function RecordingControls({
    currentLocation,
    hasRecording,
    onPlayRecording,
    onStartRecording,
    onStopRecording,
    recordingState,
    warning,
}: RecordingControlsProps) {
    const isRecording = recordingState === "recording"
    const isPlaying = recordingState === "playing"

    return (
        <section aria-label="Location recording">
            <h2>Location recording</h2>
            <div className="recording-controls">
                {isRecording ? (
                    <button onClick={onStopRecording} type="button">
                        Stop recording
                    </button>
                ) : (
                    <button
                        disabled={currentLocation === undefined || isPlaying}
                        onClick={() => {
                            if (currentLocation !== undefined) {
                                onStartRecording(currentLocation)
                            }
                        }}
                        type="button"
                    >
                        Record location
                    </button>
                )}
                <button
                    disabled={!hasRecording || isRecording || isPlaying}
                    onClick={onPlayRecording}
                    type="button"
                >
                    Play recording
                </button>
            </div>
            <p className="recording-status" role="status">
                {isRecording
                    ? "Recording accepted live locations."
                    : isPlaying
                      ? "Playing recording. Live telemetry is disconnected."
                      : hasRecording
                        ? "A recording is ready to play."
                        : "Record a live route to make it available for playback."}
            </p>
            {warning === undefined ? null : <p role="alert">{warning}</p>}
        </section>
    )
}
