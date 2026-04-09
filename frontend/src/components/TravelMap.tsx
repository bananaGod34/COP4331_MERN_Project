import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, ZoomControl, useMap, CircleMarker } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
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
    popupopen: () => { isPopupOpen.current = true; },
    popupclose: () => { setTimeout(() => { isPopupOpen.current = false; }, 50); },
    click: (e) => { if (!isPopupOpen.current) onMapClick(e.latlng); },
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
  const [trips, setTrips] = useState([
    { 
      id: 'trip-1', 
      name: "New Trip", 
      pins: [] 
    }
  ]);

  //NAVIGATION
  const navigate = useNavigate();

  // STATE: Data
  const [activeTripId, setActiveTripId] = useState('trip-1');

  // STATE: UI & Interaction
  const [tripModal, setTripModal] = useState<{isOpen: boolean, mode: 'create' | 'rename', inputValue: string}>({ 
    isOpen: false, 
    mode: 'create', 
    inputValue: '' 
  });

  const activeTrip = trips.find(t => t.id === activeTripId) || trips[0];
  const tripPins = activeTrip ? activeTrip.pins : [];

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [visibleTripIds, setVisibleTripIds] = useState<string[]>(['trip-1', 'trip-2']);
  const [uiHidden, setUiHidden] = useState(false);

  const [draftPin, setDraftPin] = useState<{lat: number, lng: number} | null>(null);
  const [editingPinId, setEditingPinId] = useState<number | null>(null);
  const [pinsUnlocked, setPinsUnlocked] = useState(false); 
  const [cameraTarget, setCameraTarget] = useState<{lat: number, lng: number, triggerId: number} | null>(null);
  const [originalPinCoords, setOriginalPinCoords] = useState<{lat: number, lng: number} | null>(null);

  // STATE: Dark Mode
  const [darkMode, setDarkMode] = useState(false);

  // STATE: Saving
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // STATE: Form
  const [formName, setFormName] = useState('');
  const [formBlurb, setFormBlurb] = useState('');
  const [formPhoto, setFormPhoto] = useState(''); 

  // REFS
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const markerRefs = useRef<{ [key: string]: any }>({});
  const isPopupOpen = useRef(false);
  const mapRef = useRef<any>(null);

  const WORLD_OFFSETS = [-1080, -720, -360, 0, 360, 720, 1080];

  // UseEffect to Load In User Data
  useEffect(() => {
    const loadTripsFromServer = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user_data') || '{}');
        if (!user?.id) return;

        const response = await fetch(`/api/users/${user.id}/trips`);
        const data = await response.json();
        if (!response.ok || data.error) {
          throw new Error(data.error || 'Failed to load trips');
        }

        if (Array.isArray(data.trips) && data.trips.length > 0) {
          setTrips(data.trips);
          setActiveTripId(data.trips[0].id);
          setVisibleTripIds(data.trips.map((trip: any) => trip.id));
          setIsDirty(false);
        }
      } catch (err) {
        console.error('Trip load failed:', err);
      }
    };

    loadTripsFromServer();
  }, []);

  // --- EFFECTS ---
  // toggle dark mode
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    return () => document.body.classList.remove('dark-mode'); // cleanup on unmount
  }, [darkMode]);

  // camera whip helper
  const getClosestLng = (targetLng: number) => {
    if (!mapRef.current) return { lng: targetLng, offset: 0 };
    
    const currentCameraLng = mapRef.current.getCenter().lng;
    let bestLng = targetLng;
    let bestOffset = 0;
    let minDistance = Infinity;

    WORLD_OFFSETS.forEach(offset => {
      const distance = Math.abs(currentCameraLng - (targetLng + offset));
      if (distance < minDistance) {
        minDistance = distance;
        bestLng = targetLng + offset;
        bestOffset = offset;
      }
    });

    return { lng: bestLng, offset: bestOffset };
  };

  // --- HANDLERS ---
  const updateActiveTripPins = (newPins: any[]) => {
    setTrips(trips.map(trip => trip.id === activeTripId ? { ...trip, pins: newPins } : trip));
    setIsDirty(true);
  };

  const handleSaveTrips = async () => {
    try {
      setIsSaving(true);
      const user = JSON.parse(localStorage.getItem('user_data') || '{}');
      const response = await fetch(`/api/users/${user.id}/trips`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trips }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || 'Save failed');
      setIsDirty(false);
    } catch (err: any) {
      alert(err?.message || 'Could not save trips');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleMapClick = (latlng: any) => {
    if (editingPinId || uiHidden) return;
    setDraftPin({ lat: latlng.lat, lng: latlng.lng });
    setEditingPinId(null);
    setFormName('');
    setFormBlurb('');
    setFormPhoto('');
    setOriginalPinCoords(null);
    setCameraTarget({ lat: latlng.lat, lng: latlng.lng, triggerId: Date.now() });
  };

  const handleMarkerDragEnd = (id: number, event: any) => {
    const marker = event.target;
    const position = marker.getLatLng();
    updateActiveTripPins(tripPins.map(pin => 
      pin.id === id ? { ...pin, lat: position.lat, lng: position.lng } : pin
    ));
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPinId) {
      updateActiveTripPins(tripPins.map(pin => 
        pin.id === editingPinId ? { ...pin, name: formName, blurb: formBlurb, photoUrl: formPhoto } : pin
      ));
    } else if (draftPin) {
      const newPin = { id: Date.now(), name: formName, lat: draftPin.lat, lng: draftPin.lng, blurb: formBlurb, photoUrl: formPhoto };
      updateActiveTripPins([...tripPins, newPin]);
    }
    
    setDraftPin(null);
    setEditingPinId(null);
    setOriginalPinCoords(null);
    setFormName('');
    setFormBlurb('');
    setFormPhoto('');
  };

  const deletePin = (id: number) => {
    if (window.confirm("Are you sure you want to permanently delete this stop?")) {
      isPopupOpen.current = false; 
      updateActiveTripPins(tripPins.filter(pin => pin.id !== id));
      if (editingPinId === id) {
        setEditingPinId(null);
        setOriginalPinCoords(null);
        setFormPhoto('');
      }
    }
  };

  const startEditing = (pin: any) => {
    isPopupOpen.current = false; 
    
    WORLD_OFFSETS.forEach(offset => {
      if (markerRefs.current[`${pin.id}-${offset}`]) {
        markerRefs.current[`${pin.id}-${offset}`].closePopup();
      }
    });

    if (editingPinId && editingPinId !== pin.id && originalPinCoords) {
      updateActiveTripPins(tripPins.map(p => 
        p.id === editingPinId ? { ...p, lat: originalPinCoords.lat, lng: originalPinCoords.lng } : p
      ));
    }

    setDraftPin(null); 
    setEditingPinId(pin.id);
    setFormName(pin.name);
    setFormBlurb(pin.blurb);
    setFormPhoto(pin.photoUrl || ''); 
    setOriginalPinCoords({ lat: pin.lat, lng: pin.lng });

    const closest = getClosestLng(pin.lng);
    setCameraTarget({ lat: pin.lat, lng: closest.lng, triggerId: Date.now() });
  };

  const cancelForm = () => {
    if (editingPinId && originalPinCoords) {
      updateActiveTripPins(tripPins.map(p => 
        p.id === editingPinId ? { ...p, lat: originalPinCoords.lat, lng: originalPinCoords.lng } : p
      ));
    }
    setDraftPin(null);
    setEditingPinId(null);
    setOriginalPinCoords(null);
    setFormPhoto('');
  };

  const handleSort = () => {
    if (dragItem.current !== null && dragOverItem.current !== null) {
      let _tripPins = [...tripPins];
      const draggedItemContent = _tripPins.splice(dragItem.current, 1)[0];
      _tripPins.splice(dragOverItem.current, 0, draggedItemContent);
      dragItem.current = null;
      dragOverItem.current = null;
      updateActiveTripPins(_tripPins);
    }
  };

  const handleCardClick = (pin: any) => {
    const closest = getClosestLng(pin.lng);
    setCameraTarget({ lat: pin.lat, lng: closest.lng, triggerId: Date.now() });
    
    if (markerRefs.current[`${pin.id}-${closest.offset}`]) {
      markerRefs.current[`${pin.id}-${closest.offset}`].openPopup();
    }
  };

  const handleSwitchTrip = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTripId = e.target.value;
    setActiveTripId(newTripId);
    
    setIsSidebarOpen(true); 
    if (!visibleTripIds.includes(newTripId)) setVisibleTripIds(prev => [...prev, newTripId]);
    
    setDraftPin(null);
    setEditingPinId(null);
    setFormName('');
    setFormBlurb('');
    setFormPhoto('');

    const newTripData = trips.find(t => t.id === newTripId);
    if (newTripData && newTripData.pins.length > 0) {
      setCameraTarget({ lat: newTripData.pins[0].lat, lng: newTripData.pins[0].lng, triggerId: Date.now() });
    }
  };

  const handleCreateNewTrip = () => {
    setTripModal({ isOpen: true, mode: 'create', inputValue: '' });
  };

  const handleRenameTrip = () => {
    if (!activeTrip) return;
    setTripModal({ isOpen: true, mode: 'rename', inputValue: activeTrip.name });
  };

  const handleDeleteTrip = () => {
    if (window.confirm(`Are you sure you want to permanently delete ${activeTrip?.name}?`)) {
      const remainingTrips = trips.filter(t => t.id !== activeTripId);
      if (remainingTrips.length > 0) {
        setTrips(remainingTrips);
        setActiveTripId(remainingTrips[0].id);
      } else {
        const freshTrip = { id: `trip-${Date.now()}`, name: "New Trip", pins: [] };
        setTrips([freshTrip]);
        setActiveTripId(freshTrip.id);
      }
      setIsDirty(true);
    }
  };

  const submitTripModal = (e: React.FormEvent) => {
    e.preventDefault();
    const name = tripModal.inputValue.trim();
    if (!name) return;

    if (tripModal.mode === 'create') {
      const newTrip = { id: `trip-${Date.now()}`, name, pins: [] };
      setTrips([...trips, newTrip]);
      setActiveTripId(newTrip.id);
      setVisibleTripIds(prev => [...prev, newTrip.id]);
      setIsSidebarOpen(true); 
      setIsDirty(true);
    } else if (tripModal.mode === 'rename') {
      setTrips(trips.map(t => t.id === activeTripId ? { ...t, name } : t));
      setIsDirty(true);
    }
    
    setTripModal({ ...tripModal, isOpen: false });
  };

  const toggleVisibility = (id: string) => {
    setVisibleTripIds(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  };

  const handleLogout = () => {
    localStorage.removeItem('user_data');
    navigate('/login');
  };


  // --- RENDER ---

  // Handle dateline crossing
  const calculateWrappedRoute = (pins: any[]) => {
    if (pins.length < 2) return pins.map(p => [p.lat, p.lng]);

    const coords = [[pins[0].lat, pins[0].lng]];
    let prevLng = pins[0].lng;

    for (let i = 1; i < pins.length; i++) {
      let currentLng = pins[i].lng;
      if (currentLng - prevLng > 180) {
        currentLng -= 360;
      } else if (currentLng - prevLng < -180) {
        currentLng += 360;
      }
      coords.push([pins[i].lat, currentLng]);
      prevLng = currentLng;
    }
    return coords;
  };

  const routeCoordinates = calculateWrappedRoute(tripPins);
  const mapCenter = [30.0, -80.0]; //>>>currently centered on Orlando uhhhhh maybe change to user location or something later?
  //>>>we can also save their last map position and use that

  const editingPinData = tripPins.find(p => p.id === editingPinId);
  const activeFocusLocation = draftPin || (editingPinData ? { lat: editingPinData.lat, lng: editingPinData.lng } : null);

  const visibleTripsData = trips.filter(t => visibleTripIds.includes(t.id));

  return (
    <div className="map-wrapper">
      {/* Add Trip Modal */}
      {tripModal.isOpen && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-panel)', padding: '25px', borderRadius: '8px',
            width: '100%', maxWidth: '350px', boxShadow: 'var(--shadow-float)', color: 'var(--text-main)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>
              {tripModal.mode === 'create' ? 'Create New Trip' : 'Rename Trip'}
            </h3>
            
            <form onSubmit={submitTripModal} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input
                autoFocus
                className="form-input"
                type="text"
                placeholder="e.g., Disney World 2025"
                value={tripModal.inputValue}
                onChange={(e) => setTripModal({...tripModal, inputValue: e.target.value})}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-blue">Save</button>
                <button type="button" className="btn btn-red" onClick={() => setTripModal({...tripModal, isOpen: false})}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Zen Mode */}
      {uiHidden && (
        <button onClick={() => setUiHidden(false)} className="btn btn-blue" style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 1000, boxShadow: 'var(--shadow-float)' }}>
          👁️ Show UI
        </button>
      )}

      {!uiHidden && (
        <>
          <div className="floating-panel">
            <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Your Trips</h3>
            
            <select value={activeTripId} onChange={handleSwitchTrip} className="form-input" style={{ marginBottom: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
              {trips.map(trip => <option key={trip.id} value={trip.id}>{trip.name}</option>)}
            </select>
            
            <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
              <button onClick={handleCreateNewTrip} className="btn btn-blue" style={{ padding: '8px', flex: 1 }}>+ New Trip</button>
              <button onClick={handleRenameTrip} className="mini-btn mini-btn-default" style={{ padding: '8px', flex: 0.3, fontSize: '16px' }}>✏️</button>
              <button onClick={handleDeleteTrip} className="btn btn-red" style={{ padding: '8px', flex: 0.3 }}>🗑️</button>
            </div>
            
            <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', marginBottom: '15px' }} />

            <strong style={{ fontSize: '14px', display: 'block', marginBottom: '5px' }}>Visible on Map:</strong>
            <div style={{ maxHeight: '100px', overflowY: 'auto', marginBottom: '15px', fontSize: '14px' }}>
              {trips.map(trip => (
                <label key={`vis-${trip.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '4px' }}>
                  <input type="checkbox" checked={visibleTripIds.includes(trip.id)} onChange={() => toggleVisibility(trip.id)} />
                  {trip.name}
                </label>
              ))}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', marginBottom: '15px' }} />
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', marginBottom: '10px' }}>
              <input type="checkbox" checked={pinsUnlocked} onChange={(e) => setPinsUnlocked(e.target.checked)} />
              Unlock active pins
            </label>
            
            <div style={{ display: 'flex', gap: '5px' }}>
              <button onClick={() => setDarkMode(d => !d)} className="mini-btn mini-btn-default" style={{ flex: 1 }}>{darkMode ? '☀️' : '🌙'}</button>
              <button onClick={() => setUiHidden(true)} className="mini-btn mini-btn-default" style={{ flex: 1 }}>👁️</button>
            </div>
            <button disabled={!isDirty || isSaving} onClick={handleSaveTrips} className="btn" style={{ background: 'none', border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)', padding: '6px 10px', fontSize: '14px', width: '100%', marginTop: '10px', fontWeight: 'bold', opacity: (!isDirty || isSaving) ? 0.6 : 1, cursor: (!isDirty || isSaving) ? 'not-allowed' : 'pointer' }}>
              {isSaving ? 'Saving...' : (isDirty ? 'Save Changes' : 'Saved')}
            </button>
            <button onClick={handleLogout} className="btn" style={{ background: 'none', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', padding: '6px 10px', fontSize: '14px', width: '100%', marginTop: '10px', fontWeight: 'bold' }}>
              Sign Out
            </button>
          </div>
          
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            style={{ 
              position: 'absolute', 
              top: '20px', 
              right: isSidebarOpen ? '350px' : '0', 
              width: '40px', 
              height: '40px', 
              background: 'var(--bg-panel)', 
              border: '1px solid var(--border-light)', 
              borderRadius: '8px 0 0 8px', 
              cursor: 'pointer', 
              zIndex: 1001, 
              boxShadow: '-2px 2px 5px rgba(0,0,0,0.1)',
              transition: 'right 0.3s ease-in-out'
            }}
          >
            {isSidebarOpen ? '▶' : '◀'}
          </button>

          {/* Right Sidebar */}
          <div className="sidebar"style={{ transform: isSidebarOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s ease-in-out' }}>
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

                  {/* Photo Upload */}
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Photo</label>
                    {formPhoto ? (
                      <div style={{ position: 'relative', marginTop: '5px' }}>
                        <img src={formPhoto} alt="Preview" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-light)' }} />
                        <button type="button" onClick={() => setFormPhoto('')} style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div style={{ marginTop: '5px', padding: '20px', border: '2px dashed var(--border-input)', borderRadius: '6px', textAlign: 'center' }}>
                        <label style={{ cursor: 'pointer', color: 'var(--accent-blue)', fontWeight: 'bold', fontSize: '14px' }}>
                          + Choose an Image
                          <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                        </label>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button type="submit" className="btn btn-blue">{editingPinId ? "Update Pin" : "Save Pin"}</button>
                    <button type="button" onClick={cancelForm} className="btn btn-red">Cancel</button>
                  </div>
                </form>
              </>
            ) : (
              // VIEW 2: ITINERARY LIST
              <>
                <h2 style={{ marginTop: 0 }}>{activeTrip.name} Itinerary</h2>
                {tripPins.length === 0 && <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Click anywhere on the map to drop your first pin!</p>}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {tripPins.map((pin, index) => (
                    <div 
                      key={pin.id} className="trip-card" draggable 
                      onDragStart={(e) => (dragItem.current = index)} onDragEnter={(e) => (dragOverItem.current = index)} onDragEnd={handleSort} onDragOver={(e) => e.preventDefault()} onDoubleClick={() => startEditing(pin)}
                    >
                      <div style={{ color: '#9ca3af', fontSize: '20px', cursor: 'grab' }}>☰</div>
                      
                      {pin.photoUrl && (
                        <img src={pin.photoUrl} alt="Thumbnail" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />
                      )}

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
        </>
      )}
      
      {/* Map */}
      <MapContainer
        ref={mapRef}
        center={mapCenter as any}
        zoom={6}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <ZoomControl position="bottomleft" />
        <TileLayer
          key={darkMode ? "dark" : "light"}
          url={darkMode ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"}
        />
        <MapClickHandler onMapClick={handleMapClick} isPopupOpen={isPopupOpen} />
        <MapCameraController target={cameraTarget} />
        
        {/* Polyline (triple rendered for dateline wrapping) */}
        {visibleTripsData.map(trip => {
          if (trip.pins.length < 2) return null;
          const routeCoords = calculateWrappedRoute(trip.pins);
          return WORLD_OFFSETS.map(offset => {
            const shiftedRoute = routeCoords.map((coord: any) => [coord[0], coord[1] + offset]);
            const lineColor = trip.id === activeTripId ? "#3b82f6" : "#9ca3af"; 
            return <Polyline key={`route-${trip.id}-${offset}`} positions={shiftedRoute as any} color={lineColor} weight={4} dashArray="10, 10" />;
          });
        })}

        {/* Highlight Ring >>>i wanna get rid of this later, it doesnt look good */}
        {activeFocusLocation && (
          <CircleMarker
            center={[activeFocusLocation.lat, activeFocusLocation.lng]}
            radius={25}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.3 }} />
        )}

        {/* Saved Pins (triple rendered for dateline wrapping) */}
        {WORLD_OFFSETS.map(offset => (
          <React.Fragment key={`world-copy-${offset}`}>
            {visibleTripsData.map(trip => (
              <React.Fragment key={`trip-group-${trip.id}`}>
                {trip.pins.map((pin: any) => (
                  <Marker 
                    key={`${pin.id}-${offset}-${pinsUnlocked || pin.id === editingPinId}`} 
                    position={[pin.lat, pin.lng + offset]} 
                    draggable={!uiHidden && ((pinsUnlocked && trip.id === activeTripId) || pin.id === editingPinId)}
                    eventHandlers={{ 
                      dragend: (e) => {
                        const position = e.target.getLatLng();
                        const trueLng = position.lng - offset;
                        updateActiveTripPins(tripPins.map(p => p.id === pin.id ? { ...p, lat: position.lat, lng: trueLng } : p));
                      },
                      dblclick: () => { if (!uiHidden) startEditing(pin); }
                    }}
                    ref={(r) => { markerRefs.current[`${pin.id}-${offset}`] = r; }}
                    opacity={trip.id === activeTripId ? 1.0 : 0.6}
                  >
                    <Popup autoPan={false}>
                      <div style={{ minWidth: '150px' }}>
                        {pin.photoUrl && <img src={pin.photoUrl} alt={pin.name} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '4px', marginBottom: '10px' }} />}
                        <strong style={{ fontSize: '16px' }}>{pin.name}</strong> <br />
                        <p style={{ margin: '8px 0', fontSize: '14px' }}>{pin.blurb}</p>
                        
                        {trip.id === activeTripId && (
                          <div style={{ display: 'flex', gap: '5px', marginTop: '10px', borderTop: '1px solid var(--border-light)', paddingTop: '10px' }}>
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); startEditing(pin); }} className="mini-btn mini-btn-default">Edit</button>
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); deletePin(pin.id); }} className="mini-btn mini-btn-danger">Delete</button>
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </React.Fragment>
            ))}
          </React.Fragment>
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