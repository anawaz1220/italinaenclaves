import { useEffect, useRef, useCallback, useState } from 'react';
import { APIProvider, Map as GoogleMap, useMap } from '@vis.gl/react-google-maps';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import type { Church } from '../types';
import { MapSearch } from './MapSearch';
import './Map.css';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// USA center coordinates
const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 };
const DEFAULT_ZOOM = 4;

// Light gray map style (similar to Red Sauce Map)
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

interface MapProps {
  churches: Church[];
  selectedChurch: Church | null;
  onSelectChurch: (church: Church) => void;
}

function ChurchMarkers({ churches, selectedChurch, onSelectChurch }: MapProps) {
  const map = useMap();
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  // Center map on selected church with smooth animation
  useEffect(() => {
    if (selectedChurch && selectedChurch.latitude && selectedChurch.longitude && map) {
      // Use smooth camera animation
      map.moveCamera({
        center: { lat: selectedChurch.latitude, lng: selectedChurch.longitude },
        zoom: 14,
        tilt: 0,
        heading: 0,
      });
    }
  }, [selectedChurch, map]);

  // Initialize clusterer and markers
  useEffect(() => {
    if (!map) return;

    // Clear existing
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    clustererRef.current?.clearMarkers();

    // Filter churches with valid coordinates (must be numbers)
    const validChurches = churches.filter((church) => {
      const lat = church.latitude;
      const lng = church.longitude;
      return typeof lat === 'number' && typeof lng === 'number' &&
             !isNaN(lat) && !isNaN(lng) &&
             lat !== 0 && lng !== 0;
    });

    // Create markers
    const markers = validChurches.map((church) => {
      const isSelected = selectedChurch?.id === church.id;

      const marker = new google.maps.Marker({
        position: { lat: church.latitude!, lng: church.longitude! },
        title: church.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 12 : 8,
          fillColor: isSelected ? '#CD212A' : '#008C45',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
        zIndex: isSelected ? 1000 : 1,
      });

      marker.addListener('click', () => {
        onSelectChurch(church);
      });

      return marker;
    });

    markersRef.current = markers;

    // Initialize clusterer only if there are markers
    if (markers.length > 0) {
      clustererRef.current = new MarkerClusterer({
        map,
        markers,
        renderer: {
          render: ({ count, position }) => {
            return new google.maps.Marker({
              position,
              label: {
                text: String(count),
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '12px',
              },
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 20 + Math.min(count / 10, 10),
                fillColor: '#008C45',
                fillOpacity: 1,
                strokeColor: '#fff',
                strokeWeight: 3,
              },
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
  }, [map, churches, selectedChurch, onSelectChurch]);

  return null;
}

function MapTypeControl({ mapStyle, onStyleChange }: {
  mapStyle: MapStyleType;
  onStyleChange: (style: MapStyleType) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="map-type-control">
      <button
        className="map-type-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-label="Map style"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      </button>
      {isExpanded && (
        <div className="map-type-options">
          <button
            className={`map-type-btn ${mapStyle === 'light' ? 'active' : ''}`}
            onClick={() => { onStyleChange('light'); setIsExpanded(false); }}
          >
            Light
          </button>
          <button
            className={`map-type-btn ${mapStyle === 'dark' ? 'active' : ''}`}
            onClick={() => { onStyleChange('dark'); setIsExpanded(false); }}
          >
            Dark
          </button>
          <button
            className={`map-type-btn ${mapStyle === 'satellite' ? 'active' : ''}`}
            onClick={() => { onStyleChange('satellite'); setIsExpanded(false); }}
          >
            Satellite
          </button>
        </div>
      )}
    </div>
  );
}

function MapControls({ onRecenter }: { onRecenter: () => void }) {
  const map = useMap();

  const handleZoomIn = () => {
    if (map) {
      const currentZoom = map.getZoom() || DEFAULT_ZOOM;
      map.setZoom(currentZoom + 1);
    }
  };

  const handleZoomOut = () => {
    if (map) {
      const currentZoom = map.getZoom() || DEFAULT_ZOOM;
      map.setZoom(currentZoom - 1);
    }
  };

  return (
    <div className="map-left-controls">
      <button
        className="map-control-btn"
        onClick={onRecenter}
        aria-label="Recenter map"
        title="Recenter map"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
        </svg>
      </button>
      <div className="map-zoom-controls">
        <button
          className="map-control-btn zoom-btn"
          onClick={handleZoomIn}
          aria-label="Zoom in"
          title="Zoom in"
        >
          +
        </button>
        <button
          className="map-control-btn zoom-btn"
          onClick={handleZoomOut}
          aria-label="Zoom out"
          title="Zoom out"
        >
          −
        </button>
      </div>
    </div>
  );
}

function MapStyleApplier({ mapStyle }: { mapStyle: MapStyleType }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (mapStyle === 'satellite') {
      map.setMapTypeId('satellite');
    } else {
      map.setMapTypeId('roadmap');
      map.setOptions({
        styles: mapStyle === 'dark' ? DARK_MAP_STYLE : LIGHT_MAP_STYLE,
      });
    }
  }, [map, mapStyle]);

  return null;
}

export function MapContainer({ churches, selectedChurch, onSelectChurch }: MapProps) {
  const [mapStyle, setMapStyle] = useState<MapStyleType>('light');
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  const handleMapClick = useCallback(() => {
    // Clicking on map (not marker) could deselect - optional
  }, []);

  const handleRecenter = useCallback(() => {
    if (mapInstance) {
      // Use smooth camera animation for recenter
      mapInstance.moveCamera({
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        tilt: 0,
        heading: 0,
      });
    }
  }, [mapInstance]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="map-error">
        <p>Google Maps API key is missing. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file.</p>
      </div>
    );
  }

  return (
    <div className="map-wrapper">
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <GoogleMap
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          onClick={handleMapClick}
          gestureHandling="greedy"
          disableDefaultUI={true}
          className="map-container"
          style={{ width: '100%', height: '100%' }}
          onCameraChanged={(ev) => {
            if (ev.map && !mapInstance) {
              setMapInstance(ev.map);
            }
          }}
        >
          <MapStyleApplier mapStyle={mapStyle} />
          <ChurchMarkers
            churches={churches}
            selectedChurch={selectedChurch}
            onSelectChurch={onSelectChurch}
          />
          <MapControls onRecenter={handleRecenter} />
        </GoogleMap>
        <MapSearch onSelectChurch={onSelectChurch} />
        <MapTypeControl mapStyle={mapStyle} onStyleChange={setMapStyle} />
        <div className="map-attribution">
          <span>Developed By: </span>
          <a
            href="https://www.fiverr.com/jam_asif?public_mode=true"
            target="_blank"
            rel="noopener noreferrer"
          >
            Asif Nawaz
          </a>
        </div>
      </APIProvider>
    </div>
  );
}
