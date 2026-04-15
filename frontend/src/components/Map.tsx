import { useEffect, useRef, useCallback, useState } from 'react';
import { APIProvider, Map as GoogleMap, useMap } from '@vis.gl/react-google-maps';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import type { Church, Enclave } from '../types';
import { MapSearch } from './MapSearch';
import './Map.css';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 };
const DEFAULT_ZOOM = 4;
const UNSELECTED_MARKER_SIZE = 32;
const SELECTED_MARKER_SIZE = 42;

// ─── Church marker (circle) SVG paths ───────────────────────────────────────
const CHURCH_SVG_PATH = `M12.79,24.29c-6.34,0-11.49-5.16-11.49-11.5S6.46,1.3,12.79,1.3s11.5,5.16,11.5,11.49-5.16,11.5-11.5,11.5Z`;
const CHURCH_SVG_RING = `M12.79,2.6c5.62,0,10.2,4.57,10.2,10.2s-4.57,10.2-10.2,10.2S2.6,18.42,2.6,12.79,7.17,2.6,12.79,2.6M12.79,0C5.73,0,0,5.73,0,12.79s5.73,12.79,12.79,12.79,12.79-5.73,12.79-12.79S19.86,0,12.79,0h0Z`;
const CHURCH_SVG_CROSS = `11.02 12.99 10.99 19.64 14.31 19.64 14.31 13.01 16.9 12.94 16.89 9.68 14.32 9.66 14.3 5.87 11.02 5.87 10.99 9.66 8.42 9.68 8.43 12.97 11.02 12.99`;

// ─── Enclave marker (triangle) SVG paths ────────────────────────────────────
const ENCLAVE_SVG_TRIANGLE = `1.19 16.59 9.98 1.38 18.76 16.59 1.19 16.59`;
const ENCLAVE_SVG_BORDER = `M9.98,2.75l7.59,13.15H2.38L9.98,2.75M9.98,0l-1.19,2.07L1.19,15.22l-1.19,2.07h19.95l-1.19-2.07L11.17,2.07l-1.19-2.07h0Z`;

function makeChurchMarkerUrl(fill: string, size: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 25.59 25.59"><path fill="${fill}" d="${CHURCH_SVG_PATH}"/><path fill="#fcfcfc" d="${CHURCH_SVG_RING}"/><polygon fill="#fcfcfc" points="${CHURCH_SVG_CROSS}"/></svg>`;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

function makeEnclaveMarkerUrl(fill: string, size: number): string {
  // Triangle viewBox is 19.95 x 17.28 — keep aspect ratio
  const h = Math.round(size * 17.28 / 19.95);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${h}" viewBox="0 0 19.95 17.28"><polygon fill="${fill}" points="${ENCLAVE_SVG_TRIANGLE}"/><path fill="#fcfcfc" d="${ENCLAVE_SVG_BORDER}"/></svg>`;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

// ─── Map styles ──────────────────────────────────────────────────────────────
const LIGHT_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
  { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
];

const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#181818' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f2f2f' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d3d3d' }] },
];

type MapStyleType = 'light' | 'dark' | 'satellite';
type LayerType = 'both' | 'churches' | 'enclaves';

// ─── Church markers component ────────────────────────────────────────────────
interface ChurchMarkersProps {
  churches: Church[];
  selectedChurch: Church | null;
  onSelectChurch: (church: Church) => void;
  visible: boolean;
}

function ChurchMarkers({ churches, selectedChurch, onSelectChurch, visible }: ChurchMarkersProps) {
  const map = useMap();
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    if (selectedChurch?.latitude && selectedChurch?.longitude && map) {
      map.moveCamera({
        center: { lat: selectedChurch.latitude, lng: selectedChurch.longitude },
        zoom: 14, tilt: 0, heading: 0,
      });
    }
  }, [selectedChurch, map]);

  useEffect(() => {
    if (!map) return;

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    clustererRef.current?.clearMarkers();

    if (!visible) return;

    const validChurches = churches.filter((c) =>
      typeof c.latitude === 'number' && typeof c.longitude === 'number' &&
      !isNaN(c.latitude) && !isNaN(c.longitude) && c.latitude !== 0 && c.longitude !== 0
    );

    const markers = validChurches.map((church) => {
      const isSelected = selectedChurch?.id === church.id;
      const size = isSelected ? SELECTED_MARKER_SIZE : UNSELECTED_MARKER_SIZE;
      const fill = isSelected ? '#025427' : '#008c45';

      const marker = new google.maps.Marker({
        position: { lat: church.latitude!, lng: church.longitude! },
        title: church.name,
        icon: {
          url: makeChurchMarkerUrl(fill, size),
          size: new google.maps.Size(size, size),
          anchor: new google.maps.Point(size / 2, size / 2),
        },
        zIndex: isSelected ? 1000 : 1,
      });

      marker.addListener('click', () => onSelectChurch(church));
      return marker;
    });

    markersRef.current = markers;

    if (markers.length > 0) {
      const CLUSTER_GREEN = '#008c45';
      clustererRef.current = new MarkerClusterer({
        map, markers,
        renderer: {
          render: ({ count, position }) => {
            const size = 40;
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2-2}" fill="${CLUSTER_GREEN}" stroke="white" stroke-width="2"/><text x="${size/2}" y="${size/2+5}" text-anchor="middle" fill="white" font-size="13" font-weight="bold" font-family="Arial,sans-serif">${count}</text></svg>`;
            return new google.maps.Marker({
              position,
              icon: { url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg), size: new google.maps.Size(size, size), anchor: new google.maps.Point(size/2, size/2) },
              zIndex: 500,
            });
          },
        },
      });
    }

    return () => {
      markersRef.current.forEach(m => m.setMap(null));
      clustererRef.current?.clearMarkers();
    };
  }, [map, churches, selectedChurch, onSelectChurch, visible]);

  return null;
}

// ─── Enclave markers component ───────────────────────────────────────────────
interface EnclaveMarkersProps {
  enclaves: Enclave[];
  selectedEnclave: Enclave | null;
  onSelectEnclave: (enclave: Enclave) => void;
  visible: boolean;
}

function EnclaveMarkers({ enclaves, selectedEnclave, onSelectEnclave, visible }: EnclaveMarkersProps) {
  const map = useMap();
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    if (selectedEnclave?.latitude && selectedEnclave?.longitude && map) {
      map.moveCamera({
        center: { lat: selectedEnclave.latitude, lng: selectedEnclave.longitude },
        zoom: 14, tilt: 0, heading: 0,
      });
    }
  }, [selectedEnclave, map]);

  useEffect(() => {
    if (!map) return;

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    clustererRef.current?.clearMarkers();

    if (!visible) return;

    const validEnclaves = enclaves.filter((e) =>
      typeof e.latitude === 'number' && typeof e.longitude === 'number' &&
      !isNaN(e.latitude) && !isNaN(e.longitude) && e.latitude !== 0 && e.longitude !== 0
    );

    const markers = validEnclaves.map((enclave) => {
      const isSelected = selectedEnclave?.id === enclave.id;
      const size = isSelected ? SELECTED_MARKER_SIZE : UNSELECTED_MARKER_SIZE;
      const fill = isSelected ? '#aa0909' : '#dc2329';
      const h = Math.round(size * 17.28 / 19.95);

      const marker = new google.maps.Marker({
        position: { lat: enclave.latitude!, lng: enclave.longitude! },
        title: enclave.name,
        icon: {
          url: makeEnclaveMarkerUrl(fill, size),
          size: new google.maps.Size(size, h),
          anchor: new google.maps.Point(size / 2, h),
        },
        zIndex: isSelected ? 1000 : 1,
      });

      marker.addListener('click', () => onSelectEnclave(enclave));
      return marker;
    });

    markersRef.current = markers;

    if (markers.length > 0) {
      const CLUSTER_RED = '#dc2329';
      clustererRef.current = new MarkerClusterer({
        map, markers,
        renderer: {
          render: ({ count, position }) => {
            const size = 40;
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2-2}" fill="${CLUSTER_RED}" stroke="white" stroke-width="2"/><text x="${size/2}" y="${size/2+5}" text-anchor="middle" fill="white" font-size="13" font-weight="bold" font-family="Arial,sans-serif">${count}</text></svg>`;
            return new google.maps.Marker({
              position,
              icon: { url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg), size: new google.maps.Size(size, size), anchor: new google.maps.Point(size/2, size/2) },
              zIndex: 500,
            });
          },
        },
      });
    }

    return () => {
      markersRef.current.forEach(m => m.setMap(null));
      clustererRef.current?.clearMarkers();
    };
  }, [map, enclaves, selectedEnclave, onSelectEnclave, visible]);

  return null;
}

// ─── Layer toggle ────────────────────────────────────────────────────────────
function LayerToggle({ layer, onChange }: { layer: LayerType; onChange: (l: LayerType) => void }) {
  return (
    <div className="layer-toggle">
      <button className={`layer-btn ${layer === 'both' ? 'active' : ''}`} onClick={() => onChange('both')}>
        All
      </button>
      <button className={`layer-btn layer-btn-church ${layer === 'churches' ? 'active' : ''}`} onClick={() => onChange('churches')}>
        <span className="layer-dot layer-dot-church" />
        Churches
      </button>
      <button className={`layer-btn layer-btn-enclave ${layer === 'enclaves' ? 'active' : ''}`} onClick={() => onChange('enclaves')}>
        <span className="layer-dot layer-dot-enclave" />
        Enclaves
      </button>
    </div>
  );
}

// ─── Map controls (recenter + zoom + map style) ───────────────────────────────
interface MapControlsProps {
  onRecenter: () => void;
  mapStyle: MapStyleType;
  onStyleChange: (s: MapStyleType) => void;
}

function MapControls({ onRecenter, mapStyle, onStyleChange }: MapControlsProps) {
  const map = useMap();
  const [styleExpanded, setStyleExpanded] = useState(false);

  return (
    <div className="map-left-controls">
      {/* Map style toggle — at top of left stack */}
      <div className="map-style-control">
        <button className="map-control-btn" onClick={() => setStyleExpanded(v => !v)} aria-label="Map style" title="Map style">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </svg>
        </button>
        {styleExpanded && (
          <div className="map-type-options">
            {(['light', 'dark', 'satellite'] as MapStyleType[]).map((s) => (
              <button key={s} className={`map-type-btn ${mapStyle === s ? 'active' : ''}`}
                onClick={() => { onStyleChange(s); setStyleExpanded(false); }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recenter */}
      <button className="map-control-btn" onClick={onRecenter} aria-label="Recenter map" title="Recenter map">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="10" />
          <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
          <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
        </svg>
      </button>

      {/* Zoom */}
      <div className="map-zoom-controls">
        <button className="map-control-btn zoom-btn" onClick={() => map?.setZoom((map.getZoom() || DEFAULT_ZOOM) + 1)} aria-label="Zoom in">+</button>
        <button className="map-control-btn zoom-btn" onClick={() => map?.setZoom((map.getZoom() || DEFAULT_ZOOM) - 1)} aria-label="Zoom out">−</button>
      </div>
    </div>
  );
}

// ─── Map style applier ───────────────────────────────────────────────────────
function MapStyleApplier({ mapStyle }: { mapStyle: MapStyleType }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    if (mapStyle === 'satellite') {
      map.setMapTypeId('satellite');
    } else {
      map.setMapTypeId('roadmap');
      map.setOptions({ styles: mapStyle === 'dark' ? DARK_MAP_STYLE : LIGHT_MAP_STYLE });
    }
  }, [map, mapStyle]);
  return null;
}

// ─── Map container ───────────────────────────────────────────────────────────
interface MapContainerProps {
  churches: Church[];
  enclaves: Enclave[];
  selectedChurch: Church | null;
  selectedEnclave: Enclave | null;
  onSelectChurch: (church: Church) => void;
  onSelectEnclave: (enclave: Enclave) => void;
}

export function MapContainer({
  churches, enclaves,
  selectedChurch, selectedEnclave,
  onSelectChurch, onSelectEnclave,
}: MapContainerProps) {
  const [mapStyle, setMapStyle] = useState<MapStyleType>('light');
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [layer, setLayer] = useState<LayerType>('both');

  const handleRecenter = useCallback(() => {
    if (mapInstance) {
      mapInstance.moveCamera({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, tilt: 0, heading: 0 });
    }
  }, [mapInstance]);

  if (!GOOGLE_MAPS_API_KEY) {
    return <div className="map-error"><p>Google Maps API key is missing.</p></div>;
  }

  return (
    <div className="map-wrapper">
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <GoogleMap
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          gestureHandling="greedy"
          disableDefaultUI={true}
          className="map-container"
          style={{ width: '100%', height: '100%' }}
          onCameraChanged={(ev) => {
            if (ev.map && !mapInstance) setMapInstance(ev.map);
          }}
        >
          <MapStyleApplier mapStyle={mapStyle} />
          <ChurchMarkers
            churches={churches}
            selectedChurch={selectedChurch}
            onSelectChurch={onSelectChurch}
            visible={layer === 'both' || layer === 'churches'}
          />
          <EnclaveMarkers
            enclaves={enclaves}
            selectedEnclave={selectedEnclave}
            onSelectEnclave={onSelectEnclave}
            visible={layer === 'both' || layer === 'enclaves'}
          />
          <MapControls onRecenter={handleRecenter} mapStyle={mapStyle} onStyleChange={setMapStyle} />
        </GoogleMap>

        <MapSearch
          onSelectChurch={onSelectChurch}
          onSelectEnclave={onSelectEnclave}
          activeLayer={layer}
        />
        <LayerToggle layer={layer} onChange={setLayer} />

        <div className="map-attribution">
          <span>Developed By: </span>
          <a href="https://www.fiverr.com/jam_asif?public_mode=true" target="_blank" rel="noopener noreferrer">
            Asif Nawaz
          </a>
        </div>
      </APIProvider>
    </div>
  );
}
