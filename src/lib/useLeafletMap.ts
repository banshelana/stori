"use client";

import { useEffect, useRef, useState } from "react";
import type * as LeafletNS from "leaflet";
import {
  IRAN_CENTER,
  IRAN_ZOOM,
  MAX_ZOOM,
  REGION_BOUNDS,
  TILE_ATTRIBUTION,
  TILE_URL,
  type LatLon,
} from "@/lib/map";

/**
 * Boots a Leaflet map into a container and hands back the instance.
 *
 * Shared by the editable picker and the read-only viewer, which differ in
 * what they put *on* the map but agree on everything about creating it:
 * Leaflet touches `window` at import time, so it is pulled in with a
 * dynamic import inside the effect — a top-level import would break the
 * server render of any page holding the component.
 */
export function useLeafletMap({
  center,
  zoom,
  scrollWheelZoom = "on-click",
}: {
  center?: LatLon | null;
  zoom?: number;
  /**
   * "on-click" leaves the wheel scrolling the page until the map is
   * clicked, which is what an embedded map should do. "never" suits a
   * read-only view inside a dialog, where the map is the only thing there.
   */
  scrollWheelZoom?: "on-click" | "never" | "always";
} = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);
  const leafletRef = useRef<typeof LeafletNS | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      leafletRef.current = L;
      const start = center ?? IRAN_CENTER;

      const map = L.map(containerRef.current, {
        center: [start.lat, start.lon],
        zoom: zoom ?? IRAN_ZOOM,
        maxBounds: REGION_BOUNDS,
        maxBoundsViscosity: 0.7,
        scrollWheelZoom: scrollWheelZoom === "always",
      });

      L.tileLayer(TILE_URL, {
        attribution: TILE_ATTRIBUTION,
        maxZoom: MAX_ZOOM,
      }).addTo(map);

      if (scrollWheelZoom === "on-click") {
        map.on("click", () => map.scrollWheelZoom.enable());
        map.on("mouseout", () => map.scrollWheelZoom.disable());
      }

      mapRef.current = map;
      setReady(true);

      // Leaflet measures its container on creation, and inside a dialog
      // or a freshly mounted panel that measurement can still be zero.
      // Two frames is enough for the open animation to have laid out.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => map.invalidateSize())
      );
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      setReady(false);
    };
    // Created once; callers drive it imperatively through the refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { containerRef, mapRef, leafletRef, ready };
}

/** A divIcon pin — Leaflet's default marker resolves a PNG by relative URL, which breaks under a bundler. */
export function pinIcon(L: typeof LeafletNS): LeafletNS.DivIcon {
  return L.divIcon({
    className: "",
    html: `<span class="map-pin"></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
  });
}
