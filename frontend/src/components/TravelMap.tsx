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

// --- HELPERS ---

// Creates a colored SVG teardrop pin icon for a given hex color
const getPinIcon = (color: string = '#3b82f6') => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
      <path d="M14 0 C6.27 0 0 6.27 0 14 C0 24.5 14 38 14 38 C14 38 28 24.5 28 14 C28 6.27 21.73 0 14 0 Z"
        fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="14" r="5" fill="white" opacity="0.85"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -38],
  });
};

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
      pins: [],
      lineColor: '#3b82f6',
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

  const [gallery, setGallery] = useState<{isOpen: boolean, photos: string[], currentIndex: number}>({
    isOpen: false,
    photos: [],
    currentIndex: 0
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
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [formPinColor, setFormPinColor] = useState('#3b82f6');

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
    const files = Array.from(e.target.files || []);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormPhotos(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleMapClick = (latlng: any) => {
    if (editingPinId || uiHidden) return;
    setDraftPin({ lat: latlng.lat, lng: latlng.lng });
    setEditingPinId(null);
    setFormName('');
    setFormBlurb('');
    setFormPhoto('');
    setFormPinColor('#3b82f6');
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
        pin.id === editingPinId ? { ...pin, name: formName, blurb: formBlurb, photoUrls: formPhotos, color: formPinColor } : pin
      ));
    } else if (draftPin) {
      const newPin = { id: Date.now(), name: formName, lat: draftPin.lat, lng: draftPin.lng, blurb: formBlurb, photoUrls: formPhotos, color: formPinColor };
      updateActiveTripPins([...tripPins, newPin]);
    }
    
    setDraftPin(null);
    setEditingPinId(null);
    setOriginalPinCoords(null);
    setFormName('');
    setFormBlurb('');
    setFormPhotos([]);
    setFormPinColor('#3b82f6');
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
    setFormPhotos(pin.photoUrls || []);
    setFormPinColor(pin.color || '#3b82f6');
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
    setFormPhotos([]);
    setFormPinColor('#3b82f6');
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

  const handleSwitchTrip = (newTripId: string) => {
    setActiveTripId(newTripId);
    setIsSidebarOpen(true); 
    if (!visibleTripIds.includes(newTripId)) setVisibleTripIds(prev => [...prev, newTripId]);
    
    setDraftPin(null);
    setEditingPinId(null);
    setFormName('');
    setFormBlurb('');
    setFormPhoto('');
    setFormPinColor('#3b82f6');

    const newTripData = trips.find(t => t.id === newTripId);
    if (newTripData && newTripData.pins.length > 0) {
      setCameraTarget({ lat: newTripData.pins[0].lat, lng: newTripData.pins[0].lng, triggerId: Date.now() });
    }
  };

  const handleTripLineColorChange = (color: string) => {
    setTrips(trips.map(t => t.id === activeTripId ? { ...t, lineColor: color } : t));
    setIsDirty(true);
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
        setVisibleTripIds([freshTrip.id]);
      }
      setIsDirty(true);
    }
  };

  const submitTripModal = (e: React.FormEvent) => {
    e.preventDefault();
    const name = tripModal.inputValue.trim();
    if (!name) return;

    if (tripModal.mode === 'create') {
      const newTrip = { id: `trip-${Date.now()}`, name, pins: [], lineColor: '#3b82f6' };
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

  const renderPhotoPreview = (photos: string[] | undefined) => {
    if (!photos || photos.length === 0) return null;

    const count = photos.length;

    // 1, 2, or 3 images is a line
    if (count <= 3) {
      return (
        <div style={{ display: 'flex', gap: '5px', margin: '8px 0', width: '100%' }}>
          {photos.map((photo, idx) => (
            <div 
              key={idx} 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setGallery({ isOpen: true, photos, currentIndex: idx }); }}
              style={{ width: '120px', height: '90px', cursor: 'pointer', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border-light)' }}
            >
              <img src={photo} alt={`Thumbnail`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      );
    }

    // 4+ images turns into square
    const visiblePhotos = photos.slice(0, 4);
    const extraCount = count - 3; 

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', margin: '8px 0', width: '100%' }}>
        {visiblePhotos.map((photo, idx) => {
          const isLast = idx === 3;
          const showOverlay = isLast && count > 4;

          return (
            <div 
              key={idx} 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setGallery({ isOpen: true, photos, currentIndex: idx }); }}
              style={{ position: 'relative', width: '100%', aspectRatio: '4/3', cursor: 'pointer', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-light)' }}
            >
              <img src={photo} alt={`Thumbnail`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              
              {showOverlay && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '20px' }}>
                  +{extraCount}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`map-wrapper ${uiHidden ? 'zen-mode' : ''}`}>
      <style>
        {`
          .dark-mode .leaflet-popup-content-wrapper,
          .dark-mode .leaflet-popup-tip {
            background-color: var(--bg-panel);
            color: var(--text-main);
          }
          
          .zen-mode .leaflet-popup {
            display: none !important;
          }
        `}
      </style>

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

      {/* Photo Gallery Modal */}
      {gallery.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.92)', zIndex: 10000, 
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
        }}>
          <button onClick={() => setGallery({ ...gallery, isOpen: false })} style={{ position: 'absolute', top: '20px', right: '30px', background: 'none', border: 'none', color: 'white', fontSize: '40px', cursor: 'pointer', zIndex: 10001 }}>✖</button>

          {gallery.photos.length > 1 && (
            <button 
              onClick={(e) => { e.stopPropagation(); setGallery({ ...gallery, currentIndex: (gallery.currentIndex - 1 + gallery.photos.length) % gallery.photos.length }); }}
              style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: '40px', cursor: 'pointer', padding: '15px 25px', borderRadius: '12px', zIndex: 10001 }}
            >
              ◀
            </button>
          )}

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '80%', height: '80vh' }}>
            <img src={gallery.photos[gallery.currentIndex]} alt={`Gallery view`} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
          </div>
          
          {gallery.photos.length > 1 && (
            <button 
              onClick={(e) => { e.stopPropagation(); setGallery({ ...gallery, currentIndex: (gallery.currentIndex + 1) % gallery.photos.length }); }}
              style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: '40px', cursor: 'pointer', padding: '15px 25px', borderRadius: '12px', zIndex: 10001 }}
            >
              ▶
            </button>
          )}

          <div style={{ color: 'white', marginTop: '20px', fontSize: '18px', fontWeight: 'bold', letterSpacing: '2px' }}>
            {gallery.currentIndex + 1} / {gallery.photos.length}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', gap: '15px' }}>
              <h3 style={{ margin: 0 }}>Your Trips</h3>
              <button onClick={handleCreateNewTrip} className="mini-btn mini-btn-default" style={{ padding: '6px 10px', fontWeight: 'bold', flexShrink: 0 }}>+ New</button>
            </div>

            <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {trips.map(trip => {
                const isActive = trip.id === activeTripId;
                
                return (
                  <div 
                    key={`list-${trip.id}`} 
                    onClick={() => handleSwitchTrip(trip.id)}
                    style={{ 
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                      padding: '10px', borderRadius: '8px', cursor: isActive ? 'default' : 'pointer',
                      backgroundColor: isActive ? 'var(--accent-blue)' : 'transparent',
                      color: isActive ? 'white' : 'var(--text-main)',
                      border: isActive ? 'none' : '1px solid var(--border-light)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <input 
                        type="checkbox" 
                        checked={visibleTripIds.includes(trip.id)} 
                        onChange={() => toggleVisibility(trip.id)}
                        onClick={(e) => e.stopPropagation()} 
                        style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                      />
                      <strong style={{ fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isActive ? '120px' : '180px' }}>
                        {trip.name}
                      </strong>
                    </div>

                    {isActive && (
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={(e) => { e.stopPropagation(); handleRenameTrip(); }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '4px', padding: '4px 6px', fontSize: '12px' }}>✏️</button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteTrip(); }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '4px', padding: '4px 6px', fontSize: '12px' }}>🗑️</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', marginBottom: '15px' }} />
            
            {/*
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', marginBottom: '10px' }}>
              <input type="checkbox" checked={pinsUnlocked} onChange={(e) => setPinsUnlocked(e.target.checked)} />
              Unlock active pins
            </label>
            */}
            
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              {/* Dark Mode Toggle Switch */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, padding: '5px 8px', borderRadius: '4px', background: 'var(--border-light)', cursor: 'pointer' }}
                onClick={() => setDarkMode(d => !d)}
              >
                <span style={{ fontSize: '12px', color: 'var(--text-main)', userSelect: 'none' }}>
                  {darkMode ? '🌙' : '☀️'}
                </span>
                <div style={{
                  width: '32px', height: '18px', borderRadius: '9px',
                  background: darkMode ? 'var(--accent-blue)' : '#cbd5e1',
                  position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                }}>
                  <div style={{
                    position: 'absolute', top: '2px',
                    left: darkMode ? '16px' : '2px',
                    width: '14px', height: '14px', borderRadius: '50%',
                    background: 'white', transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }} />
                </div>
              </div>
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

                  {/* Pin Color Picker */}
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Pin Color</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="color"
                        value={formPinColor}
                        onChange={(e) => setFormPinColor(e.target.value)}
                        style={{ width: '40px', height: '36px', padding: '2px', border: '1px solid var(--border-input)', borderRadius: '6px', cursor: 'pointer', background: 'var(--bg-panel)' }}
                      />
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#000000'].map(c => (
                          <div
                            key={c}
                            onClick={() => setFormPinColor(c)}
                            style={{
                              width: '22px', height: '22px', borderRadius: '50%', background: c, cursor: 'pointer',
                              border: formPinColor === c ? '3px solid var(--text-main)' : '2px solid var(--border-light)',
                              boxSizing: 'border-box',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Multiple Photo Upload */}
                  <div>
                    <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Photos</label>
                    <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', marginTop: '5px' }}>
                      {formPhotos.map((photo, idx) => (
                        <div key={idx} style={{ position: 'relative', minWidth: '100px' }}>
                          <img src={photo} alt={`Preview ${idx}`} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-light)' }} />
                          <button type="button" onClick={() => setFormPhotos(formPhotos.filter((_, i) => i !== idx))} style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>
                            X
                          </button>
                        </div>
                      ))}
                      
                      <div style={{ minWidth: '100px', height: '100px', border: '2px dashed var(--border-input)', borderRadius: '6px' }}>
                        <label style={{ 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          width: '100%', height: '100%', cursor: 'pointer', 
                          color: 'var(--accent-blue)', fontWeight: 'bold', fontSize: '24px' 
                        }}>
                          +
                          <input type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ display: 'none' }} />
                        </label>
                        
                      </div>
                    </div>
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

                {/* Trip Style Section */}
                <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)' }}>TRIP STYLE</p>

                  {/* Line Color */}
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Line Color</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="color"
                        value={(activeTrip as any).lineColor || '#3b82f6'}
                        onChange={(e) => handleTripLineColorChange(e.target.value)}
                        style={{ width: '36px', height: '32px', padding: '2px', border: '1px solid var(--border-input)', borderRadius: '6px', cursor: 'pointer', background: 'var(--bg-panel)' }}
                      />
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#000000'].map(c => (
                          <div
                            key={c}
                            onClick={() => handleTripLineColorChange(c)}
                            style={{
                              width: '20px', height: '20px', borderRadius: '4px', background: c, cursor: 'pointer',
                              border: ((activeTrip as any).lineColor || '#3b82f6') === c ? '3px solid var(--text-main)' : '2px solid var(--border-light)',
                              boxSizing: 'border-box',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {tripPins.length === 0 && <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Click anywhere on the map to drop your first pin!</p>}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {tripPins.map((pin, index) => (
                    <div 
                      key={pin.id} className="trip-card" draggable 
                      onDragStart={(e) => (dragItem.current = index)} onDragEnter={(e) => (dragOverItem.current = index)} onDragEnd={handleSort} onDragOver={(e) => e.preventDefault()} onDoubleClick={() => startEditing(pin)}
                    >
                      <div style={{ color: '#9ca3af', fontSize: '20px', cursor: 'grab' }}>☰</div>
                      
                      {pin.photoUrls && pin.photoUrls.length > 0 && (
                        <img
                          src={pin.photoUrls[0]}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setGallery({ isOpen: true, photos: pin.photoUrls, currentIndex: 0 }); }}
                          alt="Thumbnail"
                          style={{ width: '40px', height: '40px', cursor: 'pointer', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />
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
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <MapClickHandler onMapClick={handleMapClick} isPopupOpen={isPopupOpen} />
        <MapCameraController target={cameraTarget} />
        
        {/* Polyline (triple rendered for dateline wrapping) */}
        {visibleTripsData.map(trip => {
          if (trip.pins.length < 2) return null;
          const routeCoords = calculateWrappedRoute(trip.pins);
          return WORLD_OFFSETS.map(offset => {
            const shiftedRoute = routeCoords.map((coord: any) => [coord[0], coord[1] + offset]);
            const lineColor = trip.id === activeTripId ? ((trip as any).lineColor || '#3b82f6') : '#9ca3af';
            return <Polyline
              key={`route-${trip.id}-${offset}-${trip.id === activeTripId}`}
              positions={shiftedRoute as any}
              color={lineColor} weight={4}
              dashArray="10, 10" />;
          });
        })}

        {/* Highlight Ring >>>i wanna get rid of this later, it doesnt look good */}
        {activeFocusLocation && (
          <CircleMarker
            center={[activeFocusLocation.lat, activeFocusLocation.lng]}
            radius={25}
            pathOptions={{ color: formPinColor, fillColor: formPinColor, fillOpacity: 0.3 }} />
        )}

        {/* Saved Pins (triple rendered for dateline wrapping) */}
        {WORLD_OFFSETS.map(offset => (
          <React.Fragment key={`world-copy-${offset}`}>
            {visibleTripsData.map(trip => (
              <React.Fragment key={`trip-group-${trip.id}`}>
                {trip.pins.map((pin: any) => (
                  <Marker 
                    key={`${pin.id}-${offset}-${pinsUnlocked || pin.id === editingPinId}-${trip.id === activeTripId}`}
                    position={[pin.lat, pin.lng + offset]} 
                    draggable={!uiHidden && ((pinsUnlocked && trip.id === activeTripId) || pin.id === editingPinId)}
                    icon={getPinIcon(pin.color || '#3b82f6')}
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

                    <Popup autoPan={false} minWidth={300} maxWidth={500}>
                      <div style={{ minWidth: '150px' }}>
                        
                        {renderPhotoPreview(pin.photoUrls)}

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
            icon={getPinIcon(formPinColor)}
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
