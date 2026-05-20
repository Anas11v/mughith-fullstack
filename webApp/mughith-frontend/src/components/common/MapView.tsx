import { useEffect, useRef } from 'react';
import L, { Map as LMap, LayerGroup } from 'leaflet';
import { useI18n } from '../../lib/i18n';
import { IconTarget } from './Icons';
import { MAKKAH_BBOX } from '../../lib/geo';

export interface CaseMarker {
  id: string;
  latitude: number;
  longitude: number;
  severity: string;
  selected?: boolean;
  responderPath?: [number, number][];
}

export interface VolunteerMarker {
  id: string;
  latitude: number;
  longitude: number;
  responding?: boolean;
}

interface Props {
  cases?: CaseMarker[];
  volunteers?: VolunteerMarker[];
  selected?: string | null;
  pulseCase?: string | null;
  onSelectCase?: (id: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  pickedPoint?: [number, number] | null;
  showLegend?: boolean;
  height?: number | string;
  crosshair?: boolean;
  center?: [number, number];
}

const cssVar = (name: string, fallback: string): string => {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
};

export function MapView({
  cases = [],
  volunteers = [],
  selected = null,
  pulseCase = null,
  onSelectCase,
  onMapClick,
  pickedPoint = null,
  showLegend = true,
  height = 520,
  crosshair = false,
  center,
}: Props) {
  const { t } = useI18n();
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LMap | null>(null);
  const layersRef = useRef<LayerGroup | null>(null);

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const initialCenter: [number, number] = center ?? [
      (MAKKAH_BBOX.latMin + MAKKAH_BBOX.latMax) / 2,
      (MAKKAH_BBOX.lngMin + MAKKAH_BBOX.lngMax) / 2,
    ];
    const map = L.map(mapEl.current, {
      center: initialCenter,
      zoom: 13,
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: true,
      dragging: true,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
      attribution: '© OpenStreetMap · © CARTO',
    }).addTo(map);
    mapRef.current = map;
    layersRef.current = L.layerGroup().addTo(map);
    setTimeout(() => map.invalidateSize(), 50);
    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
  }, [center]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!onMapClick) return;
    const handler = (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    };
    map.on('click', handler);
    return () => {
      map.off('click', handler);
    };
  }, [onMapClick]);

  useEffect(() => {
    const map = mapRef.current;
    const group = layersRef.current;
    if (!map || !group) return;
    group.clearLayers();

    const accent = cssVar('--accent', '#0B6E4F');
    const critical = cssVar('--critical', '#C8102E');
    const serious = cssVar('--serious', '#E07B00');
    const moderate = cssVar('--moderate', '#1D6FB8');
    const panel = cssVar('--panel', '#ffffff');

    volunteers.forEach((v) => {
      const html = `
        <div class="m-vol ${v.responding ? 'm-vol--resp' : ''}" style="--c:${accent};--bg:${panel}">
          ${v.responding ? `<span class="m-pulse" style="--c:${accent}"></span>` : ''}
          <span class="m-vol__dot"></span>
        </div>`;
      L.marker([v.latitude, v.longitude], {
        icon: L.divIcon({ html, className: '', iconSize: [20, 20], iconAnchor: [10, 10] }),
        interactive: false,
      }).addTo(group);
    });

    cases.forEach((c) => {
      if (c.responderPath && c.responderPath.length >= 2) {
        L.polyline(c.responderPath, {
          color: accent,
          weight: 4,
          opacity: 0.85,
          dashArray: '8 6',
          lineCap: 'round',
        }).addTo(group);
      }
    });

    if (pickedPoint) {
      const html = `
        <div class="m-pin" style="--c:${accent};--bg:${panel}">
          <span class="m-pulse" style="--c:${accent}"></span>
          <svg viewBox="0 0 24 32" width="32" height="40" aria-hidden="true">
            <path d="M12 0 C 4 0 0 6 0 12 C 0 21 12 32 12 32 C 12 32 24 21 24 12 C 24 6 20 0 12 0 Z"
                  fill="${accent}" stroke="${panel}" stroke-width="2"/>
            <circle cx="12" cy="12" r="4.5" fill="${panel}"/>
          </svg>
        </div>`;
      L.marker(pickedPoint, {
        icon: L.divIcon({ html, className: '', iconSize: [32, 40], iconAnchor: [16, 38] }),
        interactive: false,
      }).addTo(group);
    }

    cases.forEach((c) => {
      const sev = (c.severity || '').toLowerCase();
      const color =
        sev === 'critical'
          ? critical
          : sev === 'high' || sev === 'serious'
          ? serious
          : moderate;
      const isSel = selected === c.id || pulseCase === c.id;
      const html = `
        <div class="m-pin ${isSel ? 'm-pin--sel' : ''}" style="--c:${color};--bg:${panel}">
          ${isSel ? `<span class="m-pulse" style="--c:${color}"></span>` : ''}
          <svg viewBox="0 0 24 32" width="28" height="36" aria-hidden="true">
            <path d="M12 0 C 4 0 0 6 0 12 C 0 21 12 32 12 32 C 12 32 24 21 24 12 C 24 6 20 0 12 0 Z"
                  fill="${color}" stroke="${panel}" stroke-width="2"/>
            <circle cx="12" cy="12" r="4.5" fill="${panel}"/>
          </svg>
        </div>`;
      const marker = L.marker([c.latitude, c.longitude], {
        icon: L.divIcon({ html, className: '', iconSize: [28, 36], iconAnchor: [14, 34] }),
      }).addTo(group);
      if (onSelectCase) marker.on('click', () => onSelectCase(c.id));
    });

    const all: [number, number][] = [];
    cases.forEach((c) => all.push([c.latitude, c.longitude]));
    volunteers.forEach((v) => all.push([v.latitude, v.longitude]));
    if (pickedPoint) all.push(pickedPoint);
    if (pulseCase) {
      const focal = cases.find((c) => c.id === pulseCase);
      if (focal) {
        const pts: [number, number][] = focal.responderPath ? [...focal.responderPath] : [];
        pts.push([focal.latitude, focal.longitude]);
        map.fitBounds(L.latLngBounds(pts).pad(0.5), { animate: false });
      }
    } else if (all.length) {
      map.fitBounds(L.latLngBounds(all).pad(0.15), { animate: false, maxZoom: 14 });
    }
    setTimeout(() => map.invalidateSize(), 30);
  }, [cases, volunteers, selected, pulseCase, pickedPoint, onSelectCase]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height,
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'var(--panel-2)',
      }}
    >
      <div ref={mapEl} style={{ position: 'absolute', inset: 0 }} />

      {crosshair && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 400,
          }}
        >
          <svg width="80" height="80" viewBox="-40 -40 80 80">
            <circle r="30" fill="none" stroke="var(--accent)" strokeWidth="1.5" opacity="0.5" />
            <circle r="16" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
            <path
              d="M0 -38 L0 -20 M0 20 L0 38 M-38 0 L-20 0 M20 0 L38 0"
              stroke="var(--accent)"
              strokeWidth="1.5"
            />
            <circle r="3" fill="var(--accent)" />
          </svg>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          insetInlineEnd: 12,
          top: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          zIndex: 500,
        }}
      >
        <MapBtn onClick={() => mapRef.current?.zoomIn()}>+</MapBtn>
        <MapBtn onClick={() => mapRef.current?.zoomOut()}>−</MapBtn>
        <MapBtn
          onClick={() => {
            const map = mapRef.current;
            if (!map) return;
            const c: [number, number] = [
              (MAKKAH_BBOX.latMin + MAKKAH_BBOX.latMax) / 2,
              (MAKKAH_BBOX.lngMin + MAKKAH_BBOX.lngMax) / 2,
            ];
            map.setView(c, 13);
          }}
        >
          <IconTarget size={15} />
        </MapBtn>
      </div>

      {showLegend && (
        <div
          style={{
            position: 'absolute',
            insetInlineStart: 12,
            bottom: 12,
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '10px 12px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            fontSize: 11.5,
            color: 'var(--ink-2)',
            zIndex: 500,
          }}
        >
          <span
            style={{
              fontWeight: 600,
              color: 'var(--muted)',
              fontSize: 10.5,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {t('map_legend')}
          </span>
          <LegendRow color="var(--critical)" label={t('map_case')} />
          <LegendRow color="var(--accent)" label={t('map_volunteer')} ring />
        </div>
      )}
    </div>
  );
}

function MapBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 34,
        height: 34,
        border: '1px solid var(--border)',
        borderRadius: 6,
        background: 'var(--panel)',
        color: 'var(--ink)',
        cursor: 'pointer',
        fontSize: 18,
        fontWeight: 500,
        boxShadow: 'var(--shadow-sm)',
        fontFamily: 'var(--font-en)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </button>
  );
}

function LegendRow({ color, label, ring }: { color: string; label: string; ring?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {ring ? (
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: 'var(--panel)',
            border: `2px solid ${color}`,
          }}
        />
      ) : (
        <span
          style={{
            width: 8,
            height: 11,
            background: color,
            clipPath: 'polygon(50% 0, 100% 55%, 50% 100%, 0 55%)',
          }}
        />
      )}
      <span>{label}</span>
    </div>
  );
}
