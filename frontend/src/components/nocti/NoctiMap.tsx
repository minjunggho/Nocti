import * as React from "react";
import type {
  Map as LeafletMap,
  LatLngExpression,
  DivIcon,
  MarkerClusterGroup,
} from "leaflet";

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  matchScore: number; // 0–100
  label: string;     // shown in cluster tooltip / aria
  popup: React.ReactNode; // popup card content
};

export type LaneArc = {
  id: string;
  from: [number, number];
  to: [number, number];
  label: string;
  intensity?: number; // 0–1, controls stroke opacity
};

export type RegionDot = {
  id: string;
  center: [number, number];
  label: string;
  rate: number; // $/mi
};

export type DensityPoint = { lat: number; lng: number; weight?: number };

export type NoctiMapProps = {
  center: [number, number];
  zoom?: number;
  homeLabel?: string;
  pins: MapPin[];
  arcs?: LaneArc[];
  regions?: RegionDot[];
  density?: DensityPoint[];
  showArcs?: boolean;
  showRegions?: boolean;
  showDensity?: boolean;
  className?: string;
};

function colorFor(score: number) {
  if (score >= 80) return "#16a34a"; // green
  if (score >= 50) return "#eab308"; // yellow
  return "#9ca3af"; // gray
}

function pinIcon(L: typeof import("leaflet"), score: number): DivIcon {
  const c = colorFor(score);
  const html = `
    <div style="position:relative;width:34px;height:42px;transform:translate(-17px,-42px);">
      <div style="width:34px;height:34px;border-radius:9999px;background:${c};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:#fff;font:600 11px/1 ui-sans-serif,system-ui;">${score}</div>
      <div style="position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${c};"></div>
    </div>`;
  return L.divIcon({ html, className: "nocti-pin", iconSize: [34, 42] });
}

function homeIcon(L: typeof import("leaflet")): DivIcon {
  const html = `<div style="width:18px;height:18px;border-radius:9999px;background:#0a0a0a;border:3px solid #fff;box-shadow:0 0 0 6px rgba(10,10,10,.12);transform:translate(-9px,-9px);"></div>`;
  return L.divIcon({ html, className: "nocti-home", iconSize: [18, 18] });
}

/** Quadratic-bezier polyline approximating an "arc" between two latlngs. */
function arcPoints(from: [number, number], to: [number, number], steps = 32): LatLngExpression[] {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  // perpendicular offset for curvature
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const off = dist * 0.18;
  const nx = -dy / (dist || 1);
  const ny = dx / (dist || 1);
  const cx = mx + nx * off;
  const cy = my + ny * off;
  const pts: LatLngExpression[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2;
    const lng = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2;
    pts.push([lat, lng]);
  }
  return pts;
}

/**
 * Client-only Leaflet map. We import leaflet + react-leaflet inside an
 * effect so the component is safe to render on the server.
 */
export function NoctiMap(props: NoctiMapProps) {
  const [mods, setMods] = React.useState<null | {
    L: typeof import("leaflet");
    RL: typeof import("react-leaflet");
    cluster: typeof import("leaflet.markercluster");
  }>(null);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      import("leaflet"),
      import("react-leaflet"),
      import("leaflet.markercluster"),
    ]).then(([L, RL, cluster]) => {
      if (!cancelled) setMods({ L: L.default ?? L, RL, cluster });
    });
    return () => { cancelled = true; };
  }, []);

  if (!mods) {
    return (
      <div
        className={props.className}
        style={{ background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <span className="text-xs text-muted-foreground">Loading map…</span>
      </div>
    );
  }
  return <InnerMap {...props} {...mods} />;
}

type InnerProps = NoctiMapProps & {
  L: typeof import("leaflet");
  RL: typeof import("react-leaflet");
};

function InnerMap({
  center, zoom = 6, homeLabel,
  pins, arcs = [], regions = [], density = [],
  showArcs, showRegions, showDensity,
  className,
  L, RL,
}: InnerProps) {
  const { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } = RL;
  const mapRef = React.useRef<LeafletMap | null>(null);

  // Build cluster group imperatively so we get smooth low-zoom clustering
  // without a third-party react wrapper.
  function ClusterLayer({ pins }: { pins: MapPin[] }) {
    const map = useMap();
    React.useEffect(() => {
      const group = (L as unknown as { markerClusterGroup: (o?: unknown) => MarkerClusterGroup })
        .markerClusterGroup({
          showCoverageOnHover: false,
          spiderfyOnMaxZoom: true,
          maxClusterRadius: 50,
        });
      pins.forEach((p) => {
        const m = L.marker([p.lat, p.lng], { icon: pinIcon(L, p.matchScore), title: p.label });
        const div = document.createElement("div");
        div.className = "nocti-popup-mount";
        m.bindPopup(div, { maxWidth: 280, minWidth: 240, closeButton: true });
        m.on("popupopen", () => {
          // render the popup React tree into the popup container
          import("react-dom/client").then(({ createRoot }) => {
            // avoid double-mount
            if ((div as { __root?: ReturnType<typeof createRoot> }).__root) return;
            const root = createRoot(div);
            (div as { __root?: ReturnType<typeof createRoot> }).__root = root;
            root.render(<>{p.popup}</>);
          });
        });
        group.addLayer(m);
      });
      map.addLayer(group);
      return () => {
        map.removeLayer(group);
        group.clearLayers();
      };
    }, [map, pins]);
    return null;
  }

  function Recenter({ center, zoom }: { center: [number, number]; zoom: number }) {
    const map = useMap();
    React.useEffect(() => { mapRef.current = map; }, [map]);
    return (
      <button
        type="button"
        onClick={() => map.flyTo(center, zoom, { duration: 0.6 })}
        className="absolute right-3 top-3 z-[400] rounded-full bg-background/95 backdrop-blur border border-border shadow-md px-3 py-2 text-xs font-medium hover:bg-muted"
        style={{ minHeight: 36 }}
        aria-label="Recenter map"
      >
        Recenter
      </button>
    );
  }

  return (
    <div className={className} style={{ position: "relative" }}>
      <MapContainer
        center={center as LatLngExpression}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%", borderRadius: 8 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* Home base */}
        <Marker position={center as LatLngExpression} icon={homeIcon(L)}>
          {homeLabel ? <Popup>{homeLabel}</Popup> : null}
        </Marker>

        {/* Lane arcs */}
        {showArcs && arcs.map((a) => (
          <Polyline
            key={a.id}
            positions={arcPoints(a.from, a.to)}
            pathOptions={{
              color: "#e85d3a",
              weight: 3,
              opacity: 0.55 + 0.4 * (a.intensity ?? 0.5),
              dashArray: "6,6",
            }}
          >
            <Popup>{a.label}</Popup>
          </Polyline>
        ))}

        {/* Regional rate dots — choropleth-lite */}
        {showRegions && regions.map((r) => {
          const t = Math.max(0, Math.min(1, (r.rate - 2.3) / 0.7));
          const col = `hsl(${(1 - t) * 200}, 75%, 50%)`;
          return (
            <CircleMarker
              key={r.id}
              center={r.center as LatLngExpression}
              radius={20 + t * 18}
              pathOptions={{ color: col, weight: 2, fillColor: col, fillOpacity: 0.22 }}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-medium">{r.label}</div>
                  <div className="text-muted-foreground">Avg ${r.rate.toFixed(2)}/mi</div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Density points */}
        {showDensity && density.map((d, i) => (
          <CircleMarker
            key={i}
            center={[d.lat, d.lng]}
            radius={14 + 6 * (d.weight ?? 1)}
            pathOptions={{ color: "#6366f1", weight: 0, fillColor: "#6366f1", fillOpacity: 0.18 }}
          />
        ))}

        {/* Pins (clustered) */}
        <ClusterLayer pins={pins} />

        <Recenter center={center} zoom={zoom} />
      </MapContainer>
    </div>
  );
}