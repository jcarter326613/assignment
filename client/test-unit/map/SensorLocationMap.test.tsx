import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { mapAttribution, mapTileUrl } from "../../src/map/mapConfig"
import { SensorLocationMap } from "../../src/map/SensorLocationMap"

type MapEventHandlers = {
    dragstart: () => void
    zoomstart: () => void
}

const leafletMock = vi.hoisted(() => ({
    eventHandlers: undefined as MapEventHandlers | undefined,
    map: {
        panTo: vi.fn(),
    },
}))

vi.mock("react-leaflet", () => ({
    Circle: ({ center, radius }: { center: number[]; radius: number }) => (
        <div data-center={center.join(",")} data-radius={radius} />
    ),
    CircleMarker: ({ center }: { center: number[] }) => (
        <div data-center={center.join(",")} data-testid="location-marker" />
    ),
    MapContainer: ({ children }: { children: ReactNode }) => (
        <div data-testid="sensor-map">{children}</div>
    ),
    TileLayer: ({ attribution, url }: { attribution: string; url: string }) => (
        <div
            data-attribution={attribution}
            data-testid="map-tiles"
            data-url={url}
        />
    ),
    useMapEvents: (eventHandlers: MapEventHandlers) => {
        leafletMock.eventHandlers = eventHandlers
        return leafletMock.map
    },
}))

const firstLocation = {
    altitude: 199,
    horizontalAccuracyMeters: 15,
    latitude: 41.49932,
    longitude: -81.69436,
}

beforeEach(() => {
    leafletMock.eventHandlers = undefined
    leafletMock.map.panTo.mockClear()
})

afterEach(cleanup)

test("renders OpenStreetMap tiles and the location accuracy ring", () => {
    render(<SensorLocationMap location={firstLocation} />)

    expect(screen.getByTestId("map-tiles")).toHaveAttribute(
        "data-url",
        mapTileUrl,
    )
    expect(screen.getByTestId("map-tiles")).toHaveAttribute(
        "data-attribution",
        mapAttribution,
    )
    expect(screen.getByTestId("location-marker")).toHaveAttribute(
        "data-center",
        "41.49932,-81.69436",
    )
    expect(
        screen.getByTestId("location-marker").previousElementSibling,
    ).toHaveAttribute("data-radius", "15")
})

test("pauses following after a manual map movement and resumes on request", () => {
    const { rerender } = render(<SensorLocationMap location={firstLocation} />)

    expect(leafletMock.map.panTo).toHaveBeenLastCalledWith(
        [41.49932, -81.69436],
        { animate: false },
    )

    act(() => leafletMock.eventHandlers?.dragstart())
    expect(
        screen.getByRole("button", { name: "Resume following" }),
    ).toBeInTheDocument()

    rerender(
        <SensorLocationMap
            location={{
                ...firstLocation,
                latitude: 41.4995,
                longitude: -81.694,
            }}
        />,
    )
    expect(leafletMock.map.panTo).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole("button", { name: "Resume following" }))
    expect(leafletMock.map.panTo).toHaveBeenLastCalledWith([41.4995, -81.694], {
        animate: true,
    })
})

test("labels replayed telemetry as a recorded location", () => {
    render(<SensorLocationMap location={firstLocation} mode="playback" />)

    expect(
        screen.getByRole("heading", { name: "Recorded location" }),
    ).toBeInTheDocument()
})
