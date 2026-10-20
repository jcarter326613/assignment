import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import App from "../src/App"

vi.mock("../src/map/SensorLocationMap", () => ({
    SensorLocationMap: () => <div data-testid="sensor-location-map" />,
}))

class WebSocketMock {
    static instances: WebSocketMock[] = []

    onclose: (() => void) | null = null
    onerror: (() => void) | null = null
    onmessage: ((event: MessageEvent<string>) => void) | null = null
    onopen: (() => void) | null = null
    close = vi.fn()

    constructor() {
        WebSocketMock.instances.push(this)
    }
}

beforeEach(() => {
    WebSocketMock.instances = []
    vi.stubGlobal("WebSocket", WebSocketMock)
})

afterEach(cleanup)

test("shows the telemetry connection state", () => {
    render(<App />)

    expect(screen.getByTestId("connection-state")).toHaveTextContent(
        "connecting",
    )

    act(() => WebSocketMock.instances[0].onopen?.())

    expect(screen.getByTestId("connection-state")).toHaveTextContent(
        "connected",
    )
})

test("links to the administration Swagger UI", () => {
    render(<App />)

    expect(
        screen.getByRole("link", { name: "Open administration Swagger" }),
    ).toHaveAttribute("href", "http://localhost:8080/swagger")
})

test("rejects location events older than the latest received timestamp", () => {
    render(<App />)
    const socket = WebSocketMock.instances[0]

    act(() => {
        socket.onmessage?.({
            data: JSON.stringify({
                type: "location",
                timestampMs: 2_000,
                location: {
                    longitude: -81.69436,
                    latitude: 41.49932,
                    altitude: 199,
                    horizontalAccuracyMeters: 0.05,
                },
            }),
        } as MessageEvent<string>)
    })
    act(() => {
        socket.onmessage?.({
            data: JSON.stringify({
                type: "location",
                timestampMs: 1_000,
                location: {
                    longitude: -81.69435,
                    latitude: 41.49933,
                    altitude: 199,
                    horizontalAccuracyMeters: 0.05,
                },
            }),
        } as MessageEvent<string>)
    })

    expect(screen.getByTestId("latest-location-timestamp")).toHaveTextContent(
        "2000",
    )
})
