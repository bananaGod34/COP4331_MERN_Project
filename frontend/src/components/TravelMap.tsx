import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, ZoomControl, useMap, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// --->>>TEMPORARY PIN ICON FIX---
// >>>probably just replace with custom icons later
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});
// ---------------------------------

// --- SUBCOMPONENTS ---

// Map click listener
// Also prevents map clicks from firing when interacting with popups or dragging markers
const MapClickHandler = ({ onMapClick, isPopupOpen }: any) => {
  useMapEvents({
    popupopen: () => { 
      isPopupOpen.current = true; 
    },
    popupclose: () => { 
      setTimeout(() => { isPopupOpen.current = false; }, 50);
    },
    click: (e) => {
      if (!isPopupOpen.current) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
};

// Pan to target pin
const MapCameraController = ({ target }: any) => {
  const map = useMap();
  
  useEffect(() => {
    if (target) {
      map.panTo([target.lat, target.lng], { animate: true, duration: 0.4 });
    }
  }, [target, map]);

  return null;
};

// --- MAIN COMPONENT ---

const TravelMap = () => {
  // STATE: Data
  const [tripPins, setTripPins] = useState<any[]>([]);

  // STATE: UI & Interaction
  const [draftPin, setDraftPin] = useState<{lat: number, lng: number} | null>(null);
  const [editingPinId, setEditingPinId] = useState<number | null>(null);
  const [pinsUnlocked, setPinsUnlocked] = useState(false); 
  const [cameraTarget, setCameraTarget] = useState<{lat: number, lng: number, triggerId: number} | null>(null);
  const [originalPinCoords, setOriginalPinCoords] = useState<{lat: number, lng: number} | null>(null);

  // STATE: Dark Mode
  const [darkMode, setDarkMode] = useState(false);
  
  // STATE: Form
  const [formName, setFormName] = useState('');
  const [formBlurb, setFormBlurb] = useState('');

  // REFS
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const markerRefs = useRef<{ [key: number]: any }>({});
  const isPopupOpen = useRef(false);

  // --- EFFECTS ---
  // toggle dark mode
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    return () => document.body.classList.remove('dark-mode'); // cleanup on unmount
  }, [darkMode]);

  // --- HANDLERS ---
  const handleMapClick = (latlng: any) => {
    if (editingPinId) return;

    setDraftPin({ lat: latlng.lat, lng: latlng.lng });
    setEditingPinId(null);
    setFormName('');
    setFormBlurb('');
    setOriginalPinCoords(null);
    setCameraTarget({ lat: latlng.lat, lng: latlng.lng, triggerId: Date.now() });
  };

  const handleMarkerDragEnd = (id: number, event: any) => {
    const marker = event.target;
    const position = marker.getLatLng();
    setTripPins(tripPins.map(pin => 
      pin.id === id ? { ...pin, lat: position.lat, lng: position.lng } : pin
    ));
  };

  const handleSavePin = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (editingPinId) {
      setTripPins(tripPins.map(pin => 
        pin.id === editingPinId ? { ...pin, name: formName, blurb: formBlurb } : pin
      ));
    } else if (draftPin) {
      const newPin = {
        id: Date.now(),
        name: formName,
        lat: draftPin.lat,
        lng: draftPin.lng,
        blurb: formBlurb,
        photoUrl: "" 
      };
      setTripPins([...tripPins, newPin]);
    }
    
    setDraftPin(null);
    setEditingPinId(null);
    setOriginalPinCoords(null);
    setFormName('');
    setFormBlurb('');
  };

  const deletePin = (id: number) => {
    if (window.confirm("Are you sure you want to permanently delete this stop?")) {
      isPopupOpen.current = false; 
      setTripPins(tripPins.filter(pin => pin.id !== id));
      if (editingPinId === id) {
        setEditingPinId(null);
        setOriginalPinCoords(null);
      }
    }
  };

  const startEditing = (pin: any) => {
    isPopupOpen.current = false; 
    
    if (markerRefs.current[pin.id]) {
      markerRefs.current[pin.id].closePopup(); 
    }

    handleSavePin(new Event('submit') as any);

    setDraftPin(null); 
    setEditingPinId(pin.id);
    setFormName(pin.name);
    setFormBlurb(pin.blurb);
    setOriginalPinCoords({ lat: pin.lat, lng: pin.lng });
    setCameraTarget({ lat: pin.lat, lng: pin.lng, triggerId: Date.now() });
  };

  const cancelForm = () => {
    if (editingPinId && originalPinCoords) {
      setTripPins(prev => prev.map(p => 
        p.id === editingPinId ? { ...p, lat: originalPinCoords.lat, lng: originalPinCoords.lng } : p
      ));
    }
    setDraftPin(null);
    setEditingPinId(null);
    setOriginalPinCoords(null);
  };

  const handleSort = () => {
    if (dragItem.current !== null && dragOverItem.current !== null) {
      let _tripPins = [...tripPins];
      const draggedItemContent = _tripPins.splice(dragItem.current, 1)[0];
      _tripPins.splice(dragOverItem.current, 0, draggedItemContent);
      dragItem.current = null;
      dragOverItem.current = null;
      setTripPins(_tripPins);
    }
  };

  const handleCardClick = (pin: any) => {
    setCameraTarget({ lat: pin.lat, lng: pin.lng, triggerId: Date.now() });
    if (markerRefs.current[pin.id]) {
      markerRefs.current[pin.id].openPopup();
    }
  };

  // --- RENDER ---

  const routeCoordinates = tripPins.map(pin => [pin.lat, pin.lng]);
  const mapCenter = [30.0, -80.0]; //>>>currently centered on Orlando uhhhhh maybe change to user location or something later?
  //>>>we can also save their last map position and use that

  const editingPinData = tripPins.find(p => p.id === editingPinId);
  const activeFocusLocation = draftPin || (editingPinData ? { lat: editingPinData.lat, lng: editingPinData.lng } : null);

  return (
    <div className = "map-wrapper">
      
      {/* Current Trip Panel - >>>PROBABLY REMOVE THIS WHEN TRIP FUNCTIONALITY IS ADDED */}
      <div className = "floating-panel">
        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Current Trip</h3>
        <p style={{ fontSize: '14px', margin: '0 0 10px 0' }}>Total Stops: {tripPins.length}</p>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            checked={pinsUnlocked} 
            onChange={(e) => setPinsUnlocked(e.target.checked)} 
          />
          Unlock map pins to move
        </label>
        <p style={{ fontSize: '12px', color: '#6b7280', margin: '5px 0 0 0' }}>
          (Click anywhere on the map to add a new stop)
        </p>
        {/* Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode(d => !d)}
          className="btn"
          style={{
            background: 'none',
            border: '1px solid var(--border-light)',
            color: 'var(--text-main)',
            padding: '6px 10px',
            fontSize: '14px',
            fontWeight: 'normal',
            width: '100%',
          }}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>

      {/* Right Sidebar */}
      <div className = "sidebar">
        {(draftPin || editingPinId) ? (
          // VIEW 1: FORM (Add/Edit)
          <>
            <h2 style={{ marginTop: 0 }}>{editingPinId ? "Edit Stop" : "New Stop Details"}</h2>
            <div className="info-box">📍 You can freely drag this pin on the map to adjust its exact location.</div>

            <form onSubmit={handleSavePin} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
              <div>
                <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Location Name</label>
                <input className="form-input" type="text" required value={formName} onChange={(e) => setFormName(e.target.value)}/>
              </div>
              <div>
                <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Travel Blurb</label>
                <textarea className="form-input" style={{ height: '100px', resize: 'none' }} required value={formBlurb} onChange={(e) => setFormBlurb(e.target.value)} />
              </div>

              {/*>>>PLACEHOLDER FOR PHOTO UPLOAD*/}
              <div style={{ padding: '20px', border: '2px dashed #d1d5db', borderRadius: '6px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                Photo Upload
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn btn-blue">
                  {editingPinId ? "Update Pin" : "Save Pin"}
                </button>
                <button type="button" onClick={cancelForm} className="btn btn-red">
                  Cancel
                </button>
              </div>
            </form>
          </>
        ) : (
          // VIEW 2: ITINERARY LIST
          <>
            <h2 style={{ marginTop: 0 }}>Trip Itinerary</h2>
            {tripPins.length === 0 && <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Click anywhere on the map to drop your first pin!</p>}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tripPins.map((pin, index) => (
                <div 
                  key={pin.id} 
                  className="trip-card"
                  draggable 
                  onDragStart={(e) => (dragItem.current = index)}
                  onDragEnter={(e) => (dragOverItem.current = index)}
                  onDragEnd={handleSort}
                  onDragOver={(e) => e.preventDefault()}
                  onDoubleClick={() => startEditing(pin)}
                >
                  <div style={{ color: '#9ca3af', fontSize: '20px', cursor: 'grab' }}>☰</div>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => handleCardClick(pin)}>
                    <h4 style={{ margin: '0 0 5px 0' }}>{index + 1}. {pin.name}</h4>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                      {pin.blurb.substring(0, 30)}{pin.blurb.length > 30 ? '...' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Map */}
      <MapContainer center={mapCenter as any} zoom={6} zoomControl={false} style={{ height: '100%', width: '100%' }}>
        <ZoomControl position="bottomleft" />
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
        
        <MapClickHandler onMapClick={handleMapClick} isPopupOpen={isPopupOpen} />
        <MapCameraController target={cameraTarget} />

        {tripPins.length > 1 && (
          <Polyline positions={routeCoordinates} color="#3b82f6" weight={4} dashArray="10, 10" />
        )}

        {/* Highlight Ring */}
        {activeFocusLocation && (
          <CircleMarker 
            center={[activeFocusLocation.lat, activeFocusLocation.lng]} 
            radius={25} 
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.3 }} 
          />
        )}

        {/* Saved Pins */}
        {tripPins.map((pin) => (
          <Marker 
            key={`${pin.id}-${pinsUnlocked || pin.id === editingPinId}`} 
            position={[pin.lat, pin.lng]}
            draggable={pinsUnlocked || pin.id === editingPinId} 
            eventHandlers={{ 
              dragend: (e) => handleMarkerDragEnd(pin.id, e),
              dblclick: () => startEditing(pin) 
            }}
            ref={(r) => { markerRefs.current[pin.id] = r; }}
          >
            <Popup autoPan={false}>
              <div style={{ minWidth: '150px' }}>
                <strong style={{ fontSize: '16px' }}>{pin.name}</strong> <br />
                <p style={{ margin: '8px 0', fontSize: '14px' }}>{pin.blurb}</p>
                
                <div style={{ display: 'flex', gap: '5px', marginTop: '10px', borderTop: '1px solid #e5e7eb', paddingTop: '10px' }}>
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); startEditing(pin); }} className="mini-btn mini-btn-default">Edit</button>
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); deletePin(pin.id); }} className="mini-btn mini-btn-danger">Delete</button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Draft Pin */}
        {draftPin && (
          <Marker 
            position={[draftPin.lat, draftPin.lng]} 
            opacity={0.7} 
            draggable={true}
            eventHandlers={{ 
              dragend: (e) => {
                const position = e.target.getLatLng();
                setDraftPin({ lat: position.lat, lng: position.lng });
              }
            }}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default TravelMap;
