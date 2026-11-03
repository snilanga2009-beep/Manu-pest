import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MapPin, Navigation, Search, Compass, ExternalLink,
  Check, X, Sparkles, RefreshCw, Link2, Map as MapIcon, Edit3
} from 'lucide-react';

/**
 * Comprehensive Sri Lanka Cities, Towns, Industrial Zones & Suburbs Directory
 * Sorted alphabetically within major regions for instant offline/online selection.
 */
export const SRI_LANKA_LOCATIONS = [
  // Colombo & Greater Colombo
  { name: 'Colombo 01 (Fort)', region: 'Colombo', lat: 6.9344, lng: 79.8428 },
  { name: 'Colombo 02 (Slave Island)', region: 'Colombo', lat: 6.9218, lng: 79.8507 },
  { name: 'Colombo 03 (Kollupitiya)', region: 'Colombo', lat: 6.9068, lng: 79.8530 },
  { name: 'Colombo 04 (Bambalapitiya)', region: 'Colombo', lat: 6.8935, lng: 79.8558 },
  { name: 'Colombo 05 (Havelock / Kirulapone)', region: 'Colombo', lat: 6.8830, lng: 79.8685 },
  { name: 'Colombo 06 (Wellawatte / Pamankada)', region: 'Colombo', lat: 6.8741, lng: 79.8612 },
  { name: 'Colombo 07 (Cinnamon Gardens)', region: 'Colombo', lat: 6.9114, lng: 79.8680 },
  { name: 'Colombo 08 (Borella)', region: 'Colombo', lat: 6.9147, lng: 79.8778 },
  { name: 'Colombo 09 (Dematagoda)', region: 'Colombo', lat: 6.9297, lng: 79.8782 },
  { name: 'Colombo 10 (Maradana / Panchikawatte)', region: 'Colombo', lat: 6.9271, lng: 79.8650 },
  { name: 'Colombo 11 (Pettah)', region: 'Colombo', lat: 6.9366, lng: 79.8508 },
  { name: 'Colombo 12 (Hulftsdorp)', region: 'Colombo', lat: 6.9383, lng: 79.8588 },
  { name: 'Colombo 13 (Kotahena)', region: 'Colombo', lat: 6.9482, lng: 79.8602 },
  { name: 'Colombo 14 (Grandpass)', region: 'Colombo', lat: 6.9496, lng: 79.8732 },
  { name: 'Colombo 15 (Mutwal / Modara / Mattakkuliya)', region: 'Colombo', lat: 6.9653, lng: 79.8659 },
  { name: 'Rajagiriya', region: 'Colombo Suburbs', lat: 6.9094, lng: 79.8960 },
  { name: 'Sri Jayawardenepura Kotte', region: 'Colombo Suburbs', lat: 6.8905, lng: 79.9018 },
  { name: 'Battaramulla / Pelawatte', region: 'Colombo Suburbs', lat: 6.8980, lng: 79.9222 },
  { name: 'Thalawathugoda', region: 'Colombo Suburbs', lat: 6.8744, lng: 79.9347 },
  { name: 'Malabe', region: 'Colombo Suburbs', lat: 6.9061, lng: 79.9696 },
  { name: 'Kaduwela', region: 'Colombo Suburbs', lat: 6.9363, lng: 79.9833 },
  { name: 'Biyagama (Export Processing Zone / Industrial)', region: 'Gampaha / Industrial', lat: 6.9456, lng: 80.0008 },
  { name: 'Nugegoda', region: 'Colombo Suburbs', lat: 6.8649, lng: 79.8997 },
  { name: 'Kohuwala', region: 'Colombo Suburbs', lat: 6.8628, lng: 79.8858 },
  { name: 'Dehiwala', region: 'Colombo Suburbs', lat: 6.8511, lng: 79.8630 },
  { name: 'Mount Lavinia', region: 'Colombo Suburbs', lat: 6.8301, lng: 79.8633 },
  { name: 'Rathmalana (Industrial & Residential)', region: 'Colombo Suburbs', lat: 6.8195, lng: 79.8801 },
  { name: 'Moratuwa', region: 'Colombo Suburbs', lat: 6.7730, lng: 79.8816 },
  { name: 'Maharagama', region: 'Colombo Suburbs', lat: 6.8480, lng: 79.9265 },
  { name: 'Pannipitiya', region: 'Colombo Suburbs', lat: 6.8467, lng: 79.9497 },
  { name: 'Kottawa', region: 'Colombo Suburbs', lat: 6.8412, lng: 79.9654 },
  { name: 'Homagama (Industrial Tech Zone)', region: 'Colombo Suburbs', lat: 6.8440, lng: 80.0024 },
  { name: 'Piliyandala', region: 'Colombo Suburbs', lat: 6.8018, lng: 79.9227 },
  { name: 'Boralesgamuwa', region: 'Colombo Suburbs', lat: 6.8411, lng: 79.9016 },
  { name: 'Kolonnawa / Wellampitiya', region: 'Colombo Suburbs', lat: 6.9333, lng: 79.8950 },
  { name: 'Avissawella / Seethawaka EPZ', region: 'Colombo Suburbs', lat: 6.9544, lng: 80.2046 },

  // Gampaha District & Airport / Industrial Zones
  { name: 'Peliyagoda', region: 'Gampaha', lat: 6.9685, lng: 79.8836 },
  { name: 'Kelaniya / Kiribathgoda', region: 'Gampaha', lat: 6.9791, lng: 79.9284 },
  { name: 'Wattala / Hendala', region: 'Gampaha', lat: 6.9892, lng: 79.8917 },
  { name: 'Kadawatha', region: 'Gampaha', lat: 7.0013, lng: 79.9513 },
  { name: 'Ragama', region: 'Gampaha', lat: 7.0283, lng: 79.9231 },
  { name: 'Kandana', region: 'Gampaha', lat: 7.0480, lng: 79.8975 },
  { name: 'Ja-Ela / Ekala Industrial Estate', region: 'Gampaha', lat: 7.0744, lng: 79.8919 },
  { name: 'Seeduwa', region: 'Gampaha', lat: 7.1292, lng: 79.8767 },
  { name: 'Katunayake (BOI Export Processing Zone / Airport)', region: 'Gampaha', lat: 7.1699, lng: 79.8884 },
  { name: 'Negombo', region: 'Gampaha', lat: 7.2008, lng: 79.8737 },
  { name: 'Gampaha Town', region: 'Gampaha', lat: 7.0873, lng: 79.9990 },
  { name: 'Nittambuwa / Wathupitiwala EPZ', region: 'Gampaha', lat: 7.1444, lng: 80.0956 },
  { name: 'Minuwangoda', region: 'Gampaha', lat: 7.1663, lng: 79.9533 },

  // Kalutara & Southern Corridor
  { name: 'Panadura', region: 'Kalutara', lat: 6.7132, lng: 79.9026 },
  { name: 'Bandaragama', region: 'Kalutara', lat: 6.7139, lng: 79.9889 },
  { name: 'Horana (Industrial Zone)', region: 'Kalutara', lat: 6.7159, lng: 80.0626 },
  { name: 'Kalutara', region: 'Kalutara', lat: 6.5854, lng: 79.9607 },
  { name: 'Beruwala / Aluthgama / Bentota', region: 'Kalutara / South', lat: 6.4247, lng: 79.9968 },

  // Major Cities Across Sri Lanka
  { name: 'Kandy City', region: 'Central Province', lat: 7.2906, lng: 80.6337 },
  { name: 'Peradeniya / Katugastota', region: 'Central Province', lat: 7.2699, lng: 80.5938 },
  { name: 'Matale', region: 'Central Province', lat: 7.4675, lng: 80.6234 },
  { name: 'Nuwara Eliya', region: 'Central Province', lat: 6.9497, lng: 80.7891 },
  { name: 'Galle / Koggala EPZ', region: 'Southern Province', lat: 6.0535, lng: 80.2210 },
  { name: 'Matara', region: 'Southern Province', lat: 5.9549, lng: 80.5550 },
  { name: 'Hambantota / Tangalle', region: 'Southern Province', lat: 6.1246, lng: 81.1185 },
  { name: 'Kurunegala', region: 'North Western', lat: 7.4818, lng: 80.3609 },
  { name: 'Kuliyapitiya / Pannala', region: 'North Western', lat: 7.4688, lng: 80.0401 },
  { name: 'Chilaw / Puttalam', region: 'North Western', lat: 7.5758, lng: 79.7953 },
  { name: 'Kegalle / Mawanella', region: 'Sabaragamuwa', lat: 7.2513, lng: 80.3464 },
  { name: 'Ratnapura', region: 'Sabaragamuwa', lat: 6.7056, lng: 80.3847 },
  { name: 'Anuradhapura', region: 'North Central', lat: 8.3114, lng: 80.4037 },
  { name: 'Polonnaruwa / Dambulla', region: 'North Central', lat: 7.8742, lng: 80.6511 },
  { name: 'Badulla / Bandarawela', region: 'Uva Province', lat: 6.9934, lng: 81.0550 },
  { name: 'Trincomalee', region: 'Eastern Province', lat: 8.5874, lng: 81.2152 },
  { name: 'Batticaloa', region: 'Eastern Province', lat: 7.7310, lng: 81.6747 },
  { name: 'Jaffna', region: 'Northern Province', lat: 9.6615, lng: 80.0255 }
];

/**
 * Helper: Extract lat/lng from a pasted Google Maps URL or "lat, lng" string
 */
export function parseCoordinatesFromText(input) {
  if (!input) return null;
  const text = String(input).trim();

  // 1. Check @lat,lng pattern in Google Maps URL (e.g. /@6.9270786,79.861243,15z)
  const atMatch = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]).toFixed(6), lng: parseFloat(atMatch[2]).toFixed(6) };
  }

  // 2. Check ?q=lat,lng or ll=lat,lng or !3dLAT!4dLNG in Google Maps URL
  const d3d4Match = text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (d3d4Match) {
    return { lat: parseFloat(d3d4Match[1]).toFixed(6), lng: parseFloat(d3d4Match[2]).toFixed(6) };
  }

  const qMatch = text.match(/[?&](?:q|ll|query)=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (qMatch) {
    return { lat: parseFloat(qMatch[1]).toFixed(6), lng: parseFloat(qMatch[2]).toFixed(6) };
  }

  // 3. Direct "6.9271, 79.8612" or "6.9271 79.8612" pair
  const pairMatch = text.match(/^(-?\d+\.\d+)\s*[,\s]\s*(-?\d+\.\d+)$/);
  if (pairMatch) {
    const lat = parseFloat(pairMatch[1]);
    const lng = parseFloat(pairMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat: lat.toFixed(6), lng: lng.toFixed(6) };
    }
  }

  return null;
}

/**
 * Find best matching Sri Lanka preset location by location/address string
 */
export function findPresetLocationMatch(text) {
  if (!text || String(text).trim().length < 3) return null;
  const q = String(text).trim().toLowerCase();
  return SRI_LANKA_LOCATIONS.find(loc => {
    const cleanName = loc.name.toLowerCase();
    const primaryWord = cleanName.split('(')[0].split('/')[0].trim();
    return cleanName.includes(q) || (primaryWord.length >= 4 && q.includes(primaryWord));
  }) || null;
}

export default function GpsCoordinatePicker({
  latitude,
  longitude,
  locationText = '',
  onChange, // ({ latitude, longitude, locationName }) => void
  compact = false
}) {
  const [activeTab, setActiveTab] = useState('preset'); // 'preset' | 'map' | 'search' | 'paste'
  const [selectedPresetName, setSelectedPresetName] = useState('');
  const [presetFilter, setPresetFilter] = useState('');
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsFeedback, setGpsFeedback] = useState(null);

  // Live OpenStreetMap / Nominatim search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingPlace, setSearchingPlace] = useState(false);

  // Paste Google Maps link or coordinate string
  const [pasteInput, setPasteInput] = useState('');

  // Interactive Leaflet Map refs
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const leafletMarkerRef = useRef(null);

  const defaultLat = 6.9271;
  const defaultLng = 79.8612;

  const numericLat = parseFloat(latitude);
  const numericLng = parseFloat(longitude);
  const hasValidCoords = !isNaN(numericLat) && !isNaN(numericLng) && numericLat !== 0 && numericLng !== 0;

  // Filtered Sri Lanka preset locations
  const filteredPresets = useMemo(() => {
    if (!presetFilter.trim()) return SRI_LANKA_LOCATIONS;
    const q = presetFilter.toLowerCase().trim();
    return SRI_LANKA_LOCATIONS.filter(
      l => l.name.toLowerCase().includes(q) || l.region.toLowerCase().includes(q)
    );
  }, [presetFilter]);

  // Auto-suggest coordinates if user typed a known Sri Lanka city in "Primary Location Name" and coords are empty
  const suggestedMatch = useMemo(() => {
    if (hasValidCoords || !locationText) return null;
    return findPresetLocationMatch(locationText);
  }, [locationText, hasValidCoords]);

  // Initialize / Update Interactive Leaflet Map when 'map' tab is open
  useEffect(() => {
    if (activeTab !== 'map') {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        leafletMarkerRef.current = null;
      }
      return;
    }

    const L = typeof window !== 'undefined' ? window.L : null;
    if (!L || !mapContainerRef.current) return;

    const initLat = hasValidCoords ? numericLat : defaultLat;
    const initLng = hasValidCoords ? numericLng : defaultLng;

    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [initLat, initLng],
        zoom: hasValidCoords ? 15 : 12
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      const marker = L.marker([initLat, initLng], { draggable: true }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        if (pos && onChange) {
          onChange({
            latitude: pos.lat.toFixed(6),
            longitude: pos.lng.toFixed(6)
          });
          setGpsFeedback({ type: 'success', text: `Pin moved to ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}` });
        }
      });

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        if (onChange) {
          onChange({
            latitude: lat.toFixed(6),
            longitude: lng.toFixed(6)
          });
          setGpsFeedback({ type: 'success', text: `Map clicked: ${lat.toFixed(5)}, ${lng.toFixed(5)}` });
        }
      });

      leafletMapRef.current = map;
      leafletMarkerRef.current = marker;

      setTimeout(() => {
        map.invalidateSize();
      }, 150);
    } else {
      leafletMapRef.current.setView([initLat, initLng], leafletMapRef.current.getZoom());
      if (leafletMarkerRef.current) {
        leafletMarkerRef.current.setLatLng([initLat, initLng]);
      }
    }
  }, [activeTab]);

  // Keep map marker in sync when latitude/longitude change externally
  useEffect(() => {
    if (activeTab === 'map' && leafletMapRef.current && leafletMarkerRef.current && hasValidCoords) {
      leafletMarkerRef.current.setLatLng([numericLat, numericLng]);
      leafletMapRef.current.panTo([numericLat, numericLng]);
    }
  }, [numericLat, numericLng, activeTab, hasValidCoords]);

  // 1. Auto-detect current device GPS location
  const handleDetectMyLocation = () => {
    if (!navigator.geolocation) {
      setGpsFeedback({ type: 'error', text: 'Geolocation is not supported by your browser.' });
      return;
    }

    setDetectingGps(true);
    setGpsFeedback(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        if (onChange) {
          onChange({ latitude: lat, longitude: lng });
        }
        setGpsFeedback({
          type: 'success',
          text: `Live GPS locked: ${lat}, ${lng} (±${Math.round(position.coords.accuracy || 15)}m)`
        });
        setDetectingGps(false);
      },
      (err) => {
        setDetectingGps(false);
        setGpsFeedback({
          type: 'error',
          text: err.code === 1
            ? 'Location permission denied. Please allow location access or pick from the City List / Map below.'
            : `Unable to read live GPS (${err.message}). Select from the City List or Map below.`
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // 2. Select from Sri Lanka City / Area Preset List
  const handleSelectPreset = (loc) => {
    if (!loc) return;
    setSelectedPresetName(loc.name);
    const lat = Number(loc.lat).toFixed(6);
    const lng = Number(loc.lng).toFixed(6);
    if (onChange) {
      onChange({
        latitude: lat,
        longitude: lng,
        locationName: loc.name
      });
    }
    setGpsFeedback({
      type: 'success',
      text: `Selected ${loc.name} (${lat}, ${lng})`
    });
  };

  // 3. Search OpenStreetMap Nominatim for any address/building in Sri Lanka
  const handlePlaceSearch = async (e) => {
    if (e) e.preventDefault();
    const q = (searchQuery || locationText || '').trim();
    if (!q) return;

    setSearchingPlace(true);
    setGpsFeedback(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=lk&limit=6&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en' }
      });
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
      if (!data || data.length === 0) {
        setGpsFeedback({ type: 'error', text: `No map results found for "${q}". Try a nearby town or click on the Interactive Map.` });
      }
    } catch (err) {
      setGpsFeedback({ type: 'error', text: 'Could not reach online map search. Use the Sri Lanka City List or manual input.' });
    } finally {
      setSearchingPlace(false);
    }
  };

  // 4. Parse Google Maps URL or "lat, lng" paste
  const handleApplyPaste = (rawVal) => {
    const val = rawVal !== undefined ? rawVal : pasteInput;
    setPasteInput(val);
    const parsed = parseCoordinatesFromText(val);
    if (parsed) {
      if (onChange) {
        onChange({ latitude: parsed.lat, longitude: parsed.lng });
      }
      setGpsFeedback({
        type: 'success',
        text: `Extracted GPS coordinates: ${parsed.lat}, ${parsed.lng}`
      });
    } else if (val && val.trim().length > 5) {
      setGpsFeedback({
        type: 'error',
        text: 'Paste a Google Maps link containing @lat,lng or coordinates like "6.9271, 79.8612"'
      });
    }
  };

  return (
    <div className="p-3.5 bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20 rounded-2xl border border-slate-200 space-y-3">
      {/* Header Row with Quick Action Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900 text-xs block leading-none">
              GPS Coordinates (Auto / Map / List / Manual)
            </span>
            <span className="text-[10px] text-slate-500">
              Auto-detect GPS, pick from Sri Lanka town list, click on map, or type manually
            </span>
          </div>
        </div>

        {/* Instant "Auto-Detect My GPS" Button */}
        <button
          type="button"
          onClick={handleDetectMyLocation}
          disabled={detectingGps}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl shadow-xs transition cursor-pointer disabled:opacity-60"
          title="Automatically get current GPS coordinates from your phone/computer"
        >
          {detectingGps ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Navigation className="w-3.5 h-3.5" />
          )}
          <span>{detectingGps ? 'Detecting GPS...' : 'Auto-Detect My GPS'}</span>
        </button>
      </div>

      {/* Smart Auto-Suggestion Banner if Primary Location matches a Sri Lanka town */}
      {suggestedMatch && (
        <div className="p-2.5 bg-amber-50/90 border border-amber-200 rounded-xl flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-amber-900">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              Matched <strong>{suggestedMatch.name}</strong> ({suggestedMatch.lat}, {suggestedMatch.lng})
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleSelectPreset(suggestedMatch)}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[10px] shrink-0 transition cursor-pointer"
          >
            Auto-Fill GPS
          </button>
        </div>
      )}

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-200/70 p-1 rounded-xl text-[11px] font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('preset')}
          className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
            activeTab === 'preset'
              ? 'bg-white text-emerald-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>City / Area List</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('map')}
          className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
            activeTab === 'map'
              ? 'bg-white text-emerald-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span>Interactive Map</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('search');
            if (!searchQuery && locationText) setSearchQuery(locationText);
          }}
          className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
            activeTab === 'search'
              ? 'bg-white text-emerald-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search Address</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('paste')}
          className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
            activeTab === 'paste'
              ? 'bg-white text-emerald-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>Paste Map Link</span>
        </button>
      </div>

      {/* TAB 1: Sri Lanka City / Industrial Zone Quick Selector */}
      {activeTab === 'preset' && (
        <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={presetFilter}
                onChange={(e) => setPresetFilter(e.target.value)}
                placeholder="Filter Sri Lanka towns (e.g. Rathmalana, Biyagama, Kandy, Colombo 03)..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <select
              value={selectedPresetName}
              onChange={(e) => {
                const found = SRI_LANKA_LOCATIONS.find(l => l.name === e.target.value);
                if (found) handleSelectPreset(found);
              }}
              className="sm:w-64 py-1.5 px-2.5 bg-emerald-50/70 text-emerald-950 font-bold rounded-lg border border-emerald-200 text-xs focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              <option value="">-- Quick Select Town ({filteredPresets.length}) --</option>
              {filteredPresets.map((loc) => (
                <option key={loc.name} value={loc.name}>
                  {loc.name} ({loc.lat}, {loc.lng})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Clickable Chips for Popular Areas */}
          <div className="flex flex-wrap gap-1.5 pt-1 max-h-24 overflow-y-auto">
            {filteredPresets.slice(0, 14).map((loc) => {
              const isSelected =
                hasValidCoords &&
                Math.abs(numericLat - loc.lat) < 0.002 &&
                Math.abs(numericLng - loc.lng) < 0.002;
              return (
                <button
                  key={loc.name}
                  type="button"
                  onClick={() => handleSelectPreset(loc)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                      : 'bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border-slate-200'
                  }`}
                >
                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                  <span>{loc.name.split('(')[0].trim()}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Interactive Clickable Map Picker */}
      {activeTab === 'map' && (
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-600 px-1">
            <span className="font-semibold flex items-center gap-1">
              <MapIcon className="w-3.5 h-3.5 text-emerald-600" />
              Click anywhere on the map or drag the blue pin to set exact GPS coordinates:
            </span>
            {hasValidCoords && (
              <span className="font-mono font-bold text-emerald-700">
                {numericLat.toFixed(5)}, {numericLng.toFixed(5)}
              </span>
            )}
          </div>
          <div
            ref={mapContainerRef}
            className="w-full h-56 rounded-xl border border-slate-200 overflow-hidden z-0"
            style={{ minHeight: '220px' }}
          />
        </div>
      )}

      {/* TAB 3: Live OpenStreetMap Address / Building Search */}
      {activeTab === 'search' && (
        <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handlePlaceSearch();
                }
              }}
              placeholder="Type street, building, or town in Sri Lanka (e.g. Galle Road Rathmalana)..."
              className="flex-1 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={handlePlaceSearch}
              disabled={searchingPlace}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition cursor-pointer shrink-0"
            >
              {searchingPlace ? 'Searching...' : 'Find on Map'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto border border-slate-100 rounded-lg">
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    const lat = parseFloat(item.lat).toFixed(6);
                    const lng = parseFloat(item.lon).toFixed(6);
                    if (onChange) {
                      onChange({
                        latitude: lat,
                        longitude: lng,
                        locationName: item.display_name?.split(',')[0] || ''
                      });
                    }
                    setGpsFeedback({
                      type: 'success',
                      text: `Selected: ${item.display_name.substring(0, 60)}... (${lat}, ${lng})`
                    });
                  }}
                  className="w-full text-left px-2.5 py-2 hover:bg-emerald-50 transition flex items-start justify-between gap-2 text-[11px] cursor-pointer"
                >
                  <span className="text-slate-800 font-medium line-clamp-1">{item.display_name}</span>
                  <span className="font-mono text-[10px] text-emerald-700 font-bold shrink-0">
                    {parseFloat(item.lat).toFixed(4)}, {parseFloat(item.lon).toFixed(4)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Paste Google Maps Link or "lat, lng" */}
      {activeTab === 'paste' && (
        <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
          <label className="text-[11px] font-bold text-slate-700 block">
            Paste Google Maps URL or Combined Coordinates (e.g. <code className="bg-slate-100 px-1 rounded">6.9271, 79.8612</code>)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={pasteInput}
              onChange={(e) => handleApplyPaste(e.target.value)}
              placeholder="Paste https://www.google.com/maps/@6.9271,79.8612... or 6.9271, 79.8612"
              className="flex-1 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono focus:outline-hidden focus:border-emerald-500"
            />
            {pasteInput && (
              <button
                type="button"
                onClick={() => setPasteInput('')}
                className="px-2.5 py-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-lg text-xs"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Feedback Banner */}
      {gpsFeedback && (
        <div
          className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold flex items-center justify-between ${
            gpsFeedback.type === 'success'
              ? 'bg-emerald-100/80 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{gpsFeedback.text}</span>
          <button type="button" onClick={() => setGpsFeedback(null)} className="text-slate-400 hover:text-slate-700 ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Direct Manual Edit Inputs (Always visible & editable for manual override) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div>
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-700 text-xs flex items-center gap-1">
              <Edit3 className="w-3 h-3 text-emerald-600" />
              <span>GPS Latitude (Auto / Manual)</span>
            </label>
            {latitude && (
              <button
                type="button"
                onClick={() => onChange && onChange({ latitude: '', longitude })}
                className="text-[10px] text-slate-400 hover:text-rose-600"
              >
                Clear
              </button>
            )}
          </div>
          <input
            type="number"
            step="any"
            value={latitude ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              // Also support pasting "lat, lng" directly into the Latitude box!
              const pair = parseCoordinatesFromText(val);
              if (pair && onChange) {
                onChange({ latitude: pair.lat, longitude: pair.lng });
              } else if (onChange) {
                onChange({ latitude: val, longitude });
              }
            }}
            placeholder="e.g. 6.9271"
            className="w-full mt-1 p-2 bg-white rounded-xl border border-slate-300 font-mono font-bold text-slate-900 focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-700 text-xs flex items-center gap-1">
              <Edit3 className="w-3 h-3 text-emerald-600" />
              <span>GPS Longitude (Auto / Manual)</span>
            </label>
            {hasValidCoords && (
              <a
                href={`https://www.google.com/maps?q=${numericLat},${numericLng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5"
              >
                <span>Verify on Google Maps</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
          <input
            type="number"
            step="any"
            value={longitude ?? ''}
            onChange={(e) => onChange && onChange({ latitude, longitude: e.target.value })}
            placeholder="e.g. 79.8612"
            className="w-full mt-1 p-2 bg-white rounded-xl border border-slate-300 font-mono font-bold text-slate-900 focus:outline-hidden focus:border-emerald-500"
          />
        </div>
      </div>
    </div>
  );
}
