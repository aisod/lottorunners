import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import type { Map as LMap } from "leaflet";
import { pinIcon, runnerMarkerIcon, userMarkerIcon, WINDHOEK } from "@/lib/map-icons";
import type { LatLng, Runner } from "@/lib/types";

interface LiveMapProps {
  userLocation: LatLng | null;
  runners: Runner[];
  pickup?: LatLng | null;
  destination?: LatLng | null;
  activeRunner?: Runner | null;
  onMapClick?: (l: LatLng) => void;
  followLocation?: LatLng | null;
}

function MapEvents({ onClick }: { onClick?: (l: LatLng) => void }) {
  const map = useMap();
  useEffect(() => {
    if (!onClick) return;
    const handler = (e: { latlng: { lat: number; lng: number } }) =>
      onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [map, onClick]);
  return null;
}

function Recenter({ target }: { target: LatLng | null | undefined }) {
  const map = useMap();
  const lastRef = useRef<string>("");
  useEffect(() => {
    if (!target) return;
    const key = `${target.lat.toFixed(4)},${target.lng.toFixed(4)}`;
    if (key === lastRef.current) return;
    lastRef.current = key;
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 14), {
      duration: 0.8,
    });
  }, [map, target]);
  return null;
}

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    const bounds = points.map((p) => [p.lat, p.lng]) as [number, number][];
    map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15 });
  }, [map, points]);
  return null;
}

export function LiveMap({
  userLocation,
  runners,
  pickup,
  destination,
  activeRunner,
  onMapClick,
  followLocation,
}: LiveMapProps) {
  const center = useMemo<[number, number]>(() => {
    if (userLocation) return [userLocation.lat, userLocation.lng];
    return WINDHOEK;
  }, [userLocation]);

  const fitPoints = useMemo(() => {
    const pts: LatLng[] = [];
    if (pickup) pts.push(pickup);
    if (destination) pts.push(destination);
    if (activeRunner) pts.push(activeRunner.position);
    return pts;
  }, [pickup, destination, activeRunner]);

  const mapRef = useRef<LMap | null>(null);

  return (
    <MapContainer
      center={center}
      zoom={14}
      zoomControl={false}
      className="h-full w-full"
      ref={(instance) => {
        mapRef.current = instance;
      }}
    >
      <TileLayer
        attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapEvents onClick={onMapClick} />
      <Recenter target={followLocation ?? userLocation} />
      {fitPoints.length >= 2 && <FitBounds points={fitPoints} />}

      {userLocation && (
        <Marker
          position={[userLocation.lat, userLocation.lng]}
          icon={userMarkerIcon()}
          interactive={false}
        />
      )}

      {runners.map((r) => (
        <Marker
          key={r.id}
          position={[r.position.lat, r.position.lng]}
          icon={runnerMarkerIcon(r.vehicle, activeRunner?.id === r.id)}
        />
      ))}

      {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={pinIcon("pickup")} />}
      {destination && (
        <Marker position={[destination.lat, destination.lng]} icon={pinIcon("destination")} />
      )}

      {pickup && destination && (
        <Polyline
          positions={[
            [pickup.lat, pickup.lng],
            [destination.lat, destination.lng],
          ]}
          pathOptions={{
            color: "oklch(0.22 0.06 260)",
            weight: 4,
            opacity: 0.85,
            dashArray: "8 8",
          }}
        />
      )}

      {activeRunner && pickup && (
        <Polyline
          positions={[
            [activeRunner.position.lat, activeRunner.position.lng],
            [pickup.lat, pickup.lng],
          ]}
          pathOptions={{ color: "oklch(0.78 0.17 75)", weight: 5, opacity: 0.9 }}
        />
      )}
    </MapContainer>
  );
}
