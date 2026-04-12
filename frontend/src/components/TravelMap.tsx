import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, ZoomControl, useMap, CircleMarker } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import './TravelMap.css';

// Drag n Drop
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="-4 -2 36 46">
      <filter id="pin-shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.35"/>
      </filter>
      <path filter="url(#pin-shadow)"
        d="M14 0 C6.27 0 0 6.27 0 14 C0 24.5 14 38 14 38 C14 38 28 24.5 28 14 C28 6.27 21.73 0 14 0 Z
           M 14 9 A 5 5 0 1 0 14 19 A 5 5 0 1 0 14 9 Z"
        fill="${color}" 
        fill-rule="evenodd"
        stroke="#ffffff" 
        stroke-width="1.5" />
    </svg>`;
    
  return L.divIcon({
    html: svg,
    className: '', 
    iconSize: [36, 46],
    iconAnchor: [18, 40], 
    popupAnchor: [0, -40],
  });
};

// --- SUBCOMPONENTS ---

// Map click listener
// Also prevents map clicks from firing when interacting with popups or dragging markers
const MapClickHandler = ({ onMapClick, popupCount }: any) => {
  useMapEvents({
    popupopen: () => { 
      popupCount.current += 1; 
    },
    popupclose: () => { 
      setTimeout(() => { 
        popupCount.current = Math.max(0, popupCount.current - 1); 
      }, 50); 
    },
    click: (e) => { 
      if (popupCount.current === 0) onMapClick(e.latlng); 
    },
  });
  return null;
};

// Pan to target pin
const MapCameraController = ({ target, isSidebarOpen }: any) => {
  const map = useMap();
  const lastTriggerId = useRef<number | null>(null);
  
  useEffect(() => {
    if (target && target.triggerId !== lastTriggerId.current) {
      lastTriggerId.current = target.triggerId;
      
      const isMobile = window.innerWidth <= 768;
      
      if (isMobile && isSidebarOpen) {
        const targetPoint = map.project([target.lat, target.lng], map.getZoom());
        targetPoint.y += (window.innerHeight * 0.25);
        const offsetLatLng = map.unproject(targetPoint, map.getZoom());
        map.panTo(offsetLatLng, { animate: true, duration: 0.4 });
      } else {
        map.panTo([target.lat, target.lng], { animate: true, duration: 0.4 });
      }
    }
  }, [target, map, isSidebarOpen]);
  
  return null;
}

const MapBackgroundEvents = ({ selectedCardId, setSelectedCardId }: any) => {
  const map = useMapEvents({
    click: () => setSelectedCardId(null)
  });

  React.useEffect(() => {
    if (selectedCardId === null) {
      map.closePopup();
    }
  }, [selectedCardId, map]);

  return null;
};

// --- COMPONENTS ---

// Draggable card subcomponent
const SortableTripCard = ({ 
  pin, 
  index, 
  selectedCardId, 
  activeTrip, 
  handleCardClick, 
  startEditing, 
  deletePin,
  getDisplayColor,
  setGallery
}: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pin.id });
  const longPressTimer = React.useRef<NodeJS.Timeout>();

  const isSelected = selectedCardId === pin.id;
  const lockedTransform = transform ? { ...transform, x: 0 } : null;

  const style = {
    transform: CSS.Translate.toString(lockedTransform),
    transition: transition 
      ? `${transition}, background-color 0.3s ease-in-out, border-color 0.3s ease-in-out, box-shadow 0.3s ease-in-out` 
      : 'background-color 0.3s ease-in-out, border-color 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
      
    position: 'relative' as const,
    zIndex: isDragging ? 999 : 1,
    opacity: isDragging ? 0.8 : 1,
    boxShadow: isDragging ? '0 10px 25px rgba(0,0,0,0.2)' : undefined,
  };

  return (
    <div 
      ref={setNodeRef} 
      className={`trip-card ${isSelected ? 'selected-card' : ''}`}
      style={{
        ...style,
        borderColor: isSelected ? getDisplayColor((activeTrip as any)?.lineColor || '#3b82f6') : undefined,
        boxShadow: isSelected ? `0 0 0 1px ${getDisplayColor((activeTrip as any)?.lineColor || '#3b82f6')}` : style.boxShadow,
        display: 'flex', flexDirection: 'column', padding: '12px'
      }}
      onDoubleClick={() => startEditing(pin)}
      onTouchStart={() => { longPressTimer.current = setTimeout(() => startEditing(pin), 500); }}
      onTouchEnd={() => clearTimeout(longPressTimer.current)}
      onTouchMove={() => clearTimeout(longPressTimer.current)}
    >
      
      {/* ROW 1 */}
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <div 
          {...attributes} {...listeners} className="desktop-drag" 
          style={{ 
            padding: '20px', 
            marginLeft: '-20px', 
            fontSize: '20px',
            display: 'flex', justifyContent: 'center', cursor: 'grab', touchAction: 'none', color: 'var(--text-muted)' }}
        >
          ☰
        </div>

        {pin.photoUrls && pin.photoUrls.length > 0 && (
          <img
            src={pin.photoUrls[0]}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setGallery({ isOpen: true, photos: pin.photoUrls, currentIndex: 0 }); }}
            alt="Thumbnail"
            style={{ width: '40px', height: '40px', cursor: 'pointer', objectFit: 'cover', borderRadius: '4px', flexShrink: 0, marginRight: '10px' }} 
          />
        )}

        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => handleCardClick(pin)}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {index + 1}. {pin.name}
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {pin.blurb}
          </p>
        </div>
      </div>

      {/* ROW 2 */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateRows: isSelected ? '1fr' : '0fr', 
          transition: 'grid-template-rows 0.3s ease-in-out' 
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
            <button
              onClick={(e) => { e.stopPropagation(); startEditing(pin); }}
              style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-input)', borderRadius: '6px', color: 'var(--accent-blue)', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              ✏️ Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation(); 
                if (window.confirm(`Are you sure you want to delete ${pin.name}?`)) deletePin(pin.id);
              }}
              style={{ background: 'var(--accent-red-dim)', border: '1px solid transparent', borderRadius: '6px', color: 'var(--accent-red)', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              🗑️ Delete
            </button>
          </div>
          
        </div>
      </div>
      
    </div>
  );
};

// Main Component
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
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [visibleTripIds, setVisibleTripIds] = useState<string[]>(['trip-1', 'trip-2']);
  const [uiHidden, setUiHidden] = useState(false);

  const [draftPin, setDraftPin] = useState<{lat: number, lng: number} | null>(null);
  const [editingPinId, setEditingPinId] = useState<number | null>(null);
  const [pinsUnlocked, setPinsUnlocked] = useState(false); 
  const [cameraTarget, setCameraTarget] = useState<{lat: number, lng: number, triggerId: number} | null>(null);
  const [originalPinCoords, setOriginalPinCoords] = useState<{lat: number, lng: number} | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);

  //>>>MOBILE MENU
  const [isMobileScreen, setIsMobileScreen] = useState(window.innerWidth <= 768);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDragId, setActiveDragId] = useState<number | null>(null);

  // STATE: Dark Mode
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('travelmap_theme');
    return savedTheme === 'dark';
  });

  // STATE: Saving
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // STATE: Form
  const [formName, setFormName] = useState('');
  const [formBlurb, setFormBlurb] = useState('');
  const [formPhotos, setFormPhotos] = useState<string[]>([]);

  // STATE: Touch Gestures
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  const [touchEnd, setTouchEnd] = useState<{x: number, y: number} | null>(null);
  const minSwipeDistance = 50;

  // REFS
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const markerRefs = useRef<{ [key: string]: any }>({});
  const popupCount = useRef(0);
  const mapRef = useRef<any>(null);
  const longPressTimer = useRef<any>(null);
  const swipeStartY = useRef<number | null>(null);
  const touchCoords = useRef<{x: number, y: number} | null>(null);
  const activePolylinesRef = useRef<Record<number, any>>({});
  const highlightCirclesRef = useRef<Record<number, any>>({});
  const isDraggingMapPin = useRef(false);
  const sidebarRef = React.useRef<HTMLDivElement>(null);
  const swipeState = React.useRef({ startY: 0, lastY: 0, startHeight: 0, time: 0, velocity: 0, isDragging: false, hasDecided: false });
  const swipeTimeout = React.useRef<NodeJS.Timeout>();

  const WORLD_OFFSETS = [-1080, -720, -360, 0, 360, 720, 1080];

  // Drag n Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Desktop
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }), // Mobile
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = tripPins.findIndex((pin) => pin.id === active.id);
      const newIndex = tripPins.findIndex((pin) => pin.id === over?.id);
      updateActiveTripPins(arrayMove(tripPins, oldIndex, newIndex));
    }
  };

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

  // prompt when unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (gallery.isOpen) setGallery(prev => ({ ...prev, isOpen: false }));
        else if (tripModal.isOpen) setTripModal(prev => ({ ...prev, isOpen: false }));
        else if (editingPinId) cancelForm();
        else if (uiHidden) setUiHidden(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gallery.isOpen, tripModal.isOpen, editingPinId, uiHidden]);

  // mobile screen resize listener
  useEffect(() => {
    const handleResize = () => setIsMobileScreen(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- EFFECTS ---
  // toggle dark mode
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    if (mapRef.current?.getContainer()) {
      mapRef.current.getContainer().classList.toggle('dark-mode', darkMode);
    }
    
    localStorage.setItem('travelmap_theme', darkMode ? 'dark' : 'light');

    return () => {
      document.body.classList.remove('dark-mode');
    };
  }, [darkMode]);

  // dark mode display helper
  const getDisplayColor = (hex: string) => {
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length !== 6) return hex;

    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);

    // W3C formula for calculating accessible contrast
    // https://www.w3.org/WAI/GL/wiki/Relative_luminance
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    if (darkMode && brightness < 40) {
      return '#d2d8e0';
    }
    
    if (!darkMode && brightness > 230) {
      return '#000000';
    }

    return hex;
  };

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
    animateSheet(true, false);
    setDraftPin({ lat: latlng.lat, lng: latlng.lng });
    setCameraTarget({ lat: latlng.lat, lng: latlng.lng, triggerId: Date.now() });
    if (!draftPin) {
      setEditingPinId(null);
      setFormName('');
      setFormBlurb('');
      setFormPhotos([]);
      setOriginalPinCoords(null);
    }
  };

  const handleMarkerDragEnd = (id: number, event: any) => {
    const marker = event.target;
    const position = marker.getLatLng();
    updateActiveTripPins(tripPins.map(pin => 
      pin.id === id ? { ...pin, lat: position.lat, lng: position.lng } : pin
    ));
  };

  const handleSavePin = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (editingPinId) {
      updateActiveTripPins(tripPins.map(pin => 
        pin.id === editingPinId ? { ...pin, name: formName, blurb: formBlurb, photoUrls: formPhotos } : pin
      ));
    } else if (draftPin) {
      const newPin = { id: Date.now(), name: formName, lat: draftPin.lat, lng: draftPin.lng, blurb: formBlurb, photoUrls: formPhotos };
      updateActiveTripPins([...tripPins, newPin]);
    }
    
    setDraftPin(null);
    setEditingPinId(null);
    setOriginalPinCoords(null);
    setFormName('');
    setFormBlurb('');
    setFormPhotos([]);

    animateSheet(true, false);
  };

  const deletePin = (id: number) => {
    if (window.confirm(`Are you sure you want to delete ${tripPins.find(p => p.id === id)?.name}?`)) {
      popupCount.current = 0;
      updateActiveTripPins(tripPins.filter(pin => pin.id !== id));
      if (editingPinId === id) {
        setEditingPinId(null);
        setOriginalPinCoords(null);
        setFormPhotos([]);
      }
      animateSheet(true, false);
    }
  };

  const startEditing = (pin: any) => {
    popupCount.current = 0;
    
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

    animateSheet(true, false);
    setDraftPin(null); 
    setEditingPinId(pin.id);
    setFormName(pin.name);
    setFormBlurb(pin.blurb);
    setFormPhotos(pin.photoUrls || []);
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

    animateSheet(true, false);
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

  const animateSheet = (targetOpen: boolean, targetExpanded: boolean) => {
    if (!sidebarRef.current) {
      setIsSidebarOpen(targetOpen);
      setIsSheetExpanded(targetExpanded);
      return;
    }

    if (swipeTimeout.current) clearTimeout(swipeTimeout.current);

    sidebarRef.current.style.height = '100%'; 

    const currentHeight = sidebarRef.current.getBoundingClientRect().height;
    sidebarRef.current.style.maxHeight = `${currentHeight}px`;
    sidebarRef.current.style.transition = 'none';

    void sidebarRef.current.offsetHeight; 

    let targetHeight = '';
    if (!targetOpen) {
      const header = sidebarRef.current.querySelector('.sheet-header') as HTMLElement;
      const footer = sidebarRef.current.querySelector('.action-footer') as HTMLElement;
      targetHeight = `${(header ? header.offsetHeight : 60) + (footer ? footer.offsetHeight : 0) + 15}px`; 
    } else if (targetExpanded) {
      targetHeight = `${window.innerHeight * 0.9}px`;
    } else {
      targetHeight = `${window.innerHeight * 0.5}px`;
    }

    sidebarRef.current.style.transition = 'max-height 0.4s cubic-bezier(0.1, 1, 0.2, 1)';
    sidebarRef.current.style.maxHeight = targetHeight;

    if (!targetOpen) sidebarRef.current.classList.add('closed');
    else sidebarRef.current.classList.remove('closed');

    if (targetExpanded) sidebarRef.current.classList.add('expanded');
    else sidebarRef.current.classList.remove('expanded');

    swipeTimeout.current = setTimeout(() => {
      if (sidebarRef.current) {
        sidebarRef.current.style.height = ''; 
        sidebarRef.current.style.transition = ''; 
        sidebarRef.current.style.maxHeight = '';  
      }
      
      setIsSidebarOpen(targetOpen);
      setIsSheetExpanded(targetExpanded);
      swipeTimeout.current = undefined; 
    }, 400);
  };

  const handleCardClick = (pin: any) => {
    const closest = getClosestLng(pin.lng);
    setCameraTarget({ lat: pin.lat, lng: closest.lng, triggerId: Date.now() });
    
    if (markerRefs.current[`${pin.id}-${closest.offset}`]) {
      markerRefs.current[`${pin.id}-${closest.offset}`].openPopup();
    }
  };

  const handleSwitchTrip = (newTripId: string, clickedPin?: any) => {
    if(editingPinId) cancelForm();

    setActiveTripId(newTripId);
    animateSheet(true, false);
    if (!visibleTripIds.includes(newTripId)) setVisibleTripIds(prev => [...prev, newTripId]);
    
    setDraftPin(null);
    setEditingPinId(null);
    setFormName('');
    setFormBlurb('');
    setFormPhotos([]); 
    popupCount.current = 0;

    const newTripData = trips.find(t => t.id === newTripId);
    
    if (clickedPin) {
      const closest = getClosestLng(clickedPin.lng);
      setCameraTarget({ lat: clickedPin.lat, lng: closest.lng, triggerId: Date.now() });
    } else if (newTripData && newTripData.pins.length > 0) {
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
    if (window.confirm(`Are you sure you want to delete ${activeTrip?.name}?`)) {
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
      animateSheet(true, false); 
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
  
  const mapCenter = [30.0, -80.0]; //>>>currently centered on Orlando uhhhhh maybe change to user location or something later?
  //>>>we can also save their last map position and use that

  const editingPinData = tripPins.find(p => p.id === editingPinId);
  const activeFocusLocation = draftPin || (editingPinData ? { lat: editingPinData.lat, lng: editingPinData.lng } : null);

  const getSheetTitle = () => {
    if (editingPinId) return `Edit ${formName || 'Stop'}`;
    if (draftPin) return 'New Stop Details';
    return `${activeTrip?.name || 'Trip'} Itinerary`;
  };

  const visibleTripsData = useMemo(() => {
    return trips.filter(t => visibleTripIds.includes(t.id));
  }, [trips, visibleTripIds]);

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
    <main className={`map-wrapper ${uiHidden ? 'zen-mode' : ''}`}>
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

      <h1 style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
        Travel Map Dashboard
      </h1>

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
                aria-label="Trip Name"
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
        <div
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.92)', zIndex: 10000, 
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
          }}
          onTouchStart={(e) => {
            touchCoords.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
          }}
          onTouchEnd={(e) => {
            if (!touchCoords.current) return;
            const distanceX = touchCoords.current.x - e.changedTouches[0].clientX;

            if (distanceX > 50 && gallery.photos.length > 1) {
              setGallery({ ...gallery, currentIndex: (gallery.currentIndex + 1) % gallery.photos.length });
            }
            if (distanceX < -50 && gallery.photos.length > 1) {
              setGallery({ ...gallery, currentIndex: (gallery.currentIndex - 1 + gallery.photos.length) % gallery.photos.length });
            }
            touchCoords.current = null;
          }}
        >
          <button
            onClick={() => setGallery({ ...gallery, isOpen: false })} 
            style={{ position: 'absolute', top: '20px', right: '30px', background: 'none', border: 'none', color: 'white', fontSize: '40px', cursor: 'pointer', zIndex: 10001 }}
            aria-label="Close Gallery"
          >
            ✖
          </button>

          {gallery.photos.length > 1 && (
            <button
              aria-label="Previous Photo"
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
              aria-label="Next Photo"
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
        <button
          onClick={() => setUiHidden(false)}
          className="btn btn-blue"
          aria-label="Show UI"
          style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 1000, boxShadow: 'var(--shadow-float)' }}>
          👁️ Show UI
        </button>
      )}

      {!uiHidden && (
        <>
          {/* Floating Panel */}
          <div className={`floating-panel ${!isMobileMenuOpen ? 'mobile-collapsed' : ''}`}>

            {/* Mobile Menu Header */}
            <div className="mobile-panel-header" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <strong style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>{isMobileMenuOpen ? '✖' : '☰'}</span> 
                {!isMobileMenuOpen && 'Menu'}
              </strong>
            </div>

            {/* Panel Content */}
            <div className="panel-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', gap: '15px' }}>
                <h2 style={{ margin: 0, fontSize: '18px' }}>Your Trips</h2>
                <button onClick={handleCreateNewTrip} className="mini-btn mini-btn-default" style={{ padding: '6px 10px', fontWeight: 'bold', flexShrink: 0 }}>+ New</button>
              </div>

              {/* Trip List */}
              <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {trips.map(trip => {
                  const isActive = trip.id === activeTripId;
                  const displayColor = getDisplayColor((trip as any).lineColor || '#3b82f6');
                  
                  return (
                    <div 
                      key={`list-${trip.id}`} 
                      onClick={() => handleSwitchTrip(trip.id)}
                      style={{ 
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                        padding: '10px', borderRadius: '8px', cursor: isActive ? 'default' : 'pointer',
                        backgroundColor: isActive ? 'var(--border-light)' : 'transparent',
                        borderLeft: isActive ? `5px solid ${displayColor}` : '5px solid transparent',
                        color: 'var(--text-main)',
                        minHeight: '46px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                        <input 
                          type="checkbox" 
                          aria-label={`Toggle visibility for ${trip.name}`}
                          checked={visibleTripIds.includes(trip.id)} 
                          onChange={() => toggleVisibility(trip.id)}
                          onClick={(e) => e.stopPropagation()} 
                          style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                        />

                        <div style={{ 
                          width: '14px', height: '14px', borderRadius: '50%', 
                          backgroundColor: displayColor, flexShrink: 0, 
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)' 
                        }} />

                        <strong style={{ fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isActive ? '120px' : '180px' }}>
                          {trip.name}
                        </strong>
                      </div>

                      {isActive && (
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button onClick={(e) => { e.stopPropagation(); handleRenameTrip(); }} aria-label={`Edit ${trip.name}`} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-input)', color: 'var(--text-main)', cursor: 'pointer', borderRadius: '4px', padding: '4px 6px', fontSize: '12px' }}>✏️</button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteTrip(); }} aria-label={`Delete ${trip.name}`} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-input)', color: 'var(--text-main)', cursor: 'pointer', borderRadius: '4px', padding: '4px 6px', fontSize: '12px' }}>🗑️</button>
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
              
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center', minWidth: '220px' }}>
                {/* Dark Mode Toggle Switch */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, padding: '5px 8px', borderRadius: '4px', background: 'var(--border-light)', cursor: 'pointer' }}
                  aria-label="Toggle Dark Mode"
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
                <button
                  onClick={() => setUiHidden(true)}
                  aria-label="Enter Zen Mode"
                  className="mini-btn mini-btn-default" style={{ flex: 1 }}>👁️</button>
              </div>
              <button disabled={!isDirty || isSaving} onClick={handleSaveTrips} className="btn" style={{ background: 'none', border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)', padding: '6px 10px', fontSize: '14px', width: '100%', marginTop: '10px', fontWeight: 'bold', opacity: (!isDirty || isSaving) ? 0.6 : 1, cursor: (!isDirty || isSaving) ? 'not-allowed' : 'pointer' }}>
                {isSaving ? 'Saving...' : (isDirty ? 'Save Changes' : 'Saved')}
              </button>
              <button onClick={handleLogout} className="btn" style={{ background: 'none', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', padding: '6px 10px', fontSize: '14px', width: '100%', marginTop: '10px', fontWeight: 'bold' }}>
                Sign Out
              </button>
            </div>
          </div>
          
          <button
            className="desktop-toggle-btn"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
            style={{ 
              position: 'absolute', 
              top: '20px', 
              right: '0',
              transform: isSidebarOpen ? 'translateX(-350px)' : 'translateX(0)',
              color: 'var(--text-main)',
              width: '40px', 
              height: '40px',
              background: 'var(--bg-sidebar)',
              border: '1px solid var(--border-light)', 
              borderRight: 'none', 
              borderRadius: '8px 0 0 8px', 
              cursor: 'pointer', 
              zIndex: 1001, 
              boxShadow: '-2px 2px 4px rgba(0,0,0,0.05)',
              transition: 'transform 0.3s ease-in-out, background-color 0.3s ease-in-out, border-color 0.3s ease-in-out, color 0.3s ease-in-out'
            }}
          >
            {isSidebarOpen ? '▶' : '◀'}
          </button>

          {/* Right Sidebar */}
          <div
            ref={sidebarRef}
            className={`sidebar ${!isSidebarOpen ? 'closed' : ''} ${isSheetExpanded ? 'expanded' : ''}`}
            style={{ display: 'flex', flexDirection: 'column' }}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (
                !target.closest('.trip-card') && 
                !target.closest('.trip-style-box') && 
                !target.closest('.action-footer')
              ) {
                setSelectedCardId(null);
              }
            }}
            
            onTouchStart={(e) => {
              if ((e.target as HTMLElement).closest('.desktop-drag')) return;
              if ((e.target as HTMLElement).closest('.color-ribbon')) return;
              if ((e.target as HTMLElement).closest('button')) return;

              const scrollArea = (e.target as HTMLElement).closest('.sheet-content');
              if (scrollArea && scrollArea.scrollTop > 0) return;

              const rect = sidebarRef.current?.getBoundingClientRect();
              swipeState.current = {
                startY: e.touches[0].clientY,
                lastY: e.touches[0].clientY,
                startHeight: rect ? rect.height : 0, 
                time: Date.now(),
                velocity: 0,
                isDragging: false, 
                hasDecided: false 
              };
            }}
            
            onTouchMove={(e) => {
              if (swipeState.current.hasDecided && !swipeState.current.isDragging) return;

              const currentY = e.touches[0].clientY;
              const deltaY = currentY - swipeState.current.startY;

              if (!swipeState.current.hasDecided) {
                if (Math.abs(deltaY) < 10) return;

                swipeState.current.hasDecided = true;
                const scrollArea = (e.target as HTMLElement).closest('.sheet-content');

                if (scrollArea) {
                  if (deltaY < 0) {
                    const isAtBottom = Math.abs(scrollArea.scrollHeight - scrollArea.clientHeight - scrollArea.scrollTop) <= 10;
                    
                    if (!isAtBottom) {
                       swipeState.current.isDragging = false; 
                       return;
                    }
                  }
                  else {
                    if (scrollArea.scrollTop > 5) {
                       swipeState.current.isDragging = false; 
                       return;
                    }
                  }
                }

                swipeState.current.isDragging = true;
                if (sidebarRef.current) {
                  if (swipeTimeout.current) clearTimeout(swipeTimeout.current);
                  sidebarRef.current.style.height = '100%';
                  sidebarRef.current.style.maxHeight = `${swipeState.current.startHeight}px`;
                  sidebarRef.current.style.transition = 'none';

                  if (!isSidebarOpen) sidebarRef.current.classList.remove('closed');
                }
              }
              
              if(swipeState.current.isDragging) {
                const now = Date.now();
                const deltaTime = now - swipeState.current.time;
                if (deltaTime > 0) {
                  const instantVelocity = (currentY - swipeState.current.lastY) / deltaTime;
                  swipeState.current.velocity = (swipeState.current.velocity + instantVelocity) / 2;
                }
                swipeState.current.lastY = currentY;
                swipeState.current.time = now;

                let newHeight = swipeState.current.startHeight - deltaY;

                const maxVH = window.innerHeight * 0.9;
                if (newHeight > maxVH) {
                  const excess = newHeight - maxVH;
                  newHeight = maxVH + (excess / 4);
                }
                if (newHeight < 60) newHeight = 60;

                if (sidebarRef.current) {
                  sidebarRef.current.style.maxHeight = `${newHeight}px`;
                }
              }
            }}
            
            onTouchEnd={(e) => {
              if (!swipeState.current.hasDecided || !swipeState.current.isDragging) return;
              swipeState.current.isDragging = false;

              const deltaY = swipeState.current.lastY - swipeState.current.startY;
              const velocity = swipeState.current.velocity;
              const finalHeight = swipeState.current.startHeight - deltaY;

              const projectedHeight = finalHeight - (velocity * 250); 
              const vh = window.innerHeight;

              let targetOpen = true;
              let targetExpanded = false;

              if (projectedHeight > vh * 0.90) { 
                  targetOpen = true;
                  targetExpanded = true;
              }
              else if (projectedHeight < vh * 0.20) { 
                  targetOpen = false;
                  targetExpanded = false;
              }
              else { 
                  targetOpen = true;
                  targetExpanded = false;
              }
              if (finalHeight < 140) {
                  targetOpen = false;
                  targetExpanded = false;
              }

              if (sidebarRef.current) {
                sidebarRef.current.style.height = '100%'; 
                
                let targetHeight = '';
                if (!targetOpen) {
                   const header = sidebarRef.current.querySelector('.sheet-header') as HTMLElement;
                   const footer = sidebarRef.current.querySelector('.action-footer') as HTMLElement;
                   const hHeight = header ? header.offsetHeight : 60;
                   const fHeight = footer ? footer.offsetHeight : 0;
                   targetHeight = `${hHeight + fHeight + 15}px`; 
                } else if (targetExpanded) {
                   targetHeight = `${window.innerHeight * 0.9}px`; 
                } else {
                   targetHeight = `${window.innerHeight * 0.5}px`;
                }

                const absVelocity = Math.abs(velocity);
                const duration = Math.max(250, Math.min(550, 550 - (absVelocity * 100)));
                
                sidebarRef.current.style.transition = `max-height ${duration}ms cubic-bezier(0.1, 1, 0.2, 1)`;
                sidebarRef.current.style.maxHeight = targetHeight;

                if (!targetOpen) sidebarRef.current.classList.add('closed');
                else sidebarRef.current.classList.remove('closed');

                if (targetExpanded) sidebarRef.current.classList.add('expanded');
                else sidebarRef.current.classList.remove('expanded');
                
                const cleanupTime = Math.max(duration, 350);

                swipeTimeout.current = setTimeout(() => {
                  if (sidebarRef.current) {
                    sidebarRef.current.style.height = ''; 
                    sidebarRef.current.style.transition = ''; 
                    sidebarRef.current.style.maxHeight = '';  
                  }
                  
                  setIsSidebarOpen(targetOpen);
                  setIsSheetExpanded(targetExpanded);
                }, cleanupTime);
              }
            }}
          >

            {/* ZONE 1 */}
            <div 
              className="sheet-header" 
              style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', touchAction: 'none', cursor: 'grab' }}
            >
              
              <div className="mobile-only" style={{ width: '100%', height: '30px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ width: '40px', height: '5px', backgroundColor: 'var(--border-input)', borderRadius: '3px' }} />
              </div>

              <h2 style={{ margin: 0, fontSize: '20px', padding: '0 15px' }}>
                {getSheetTitle()}
              </h2>
            </div>

            {/*
            <div
              className="mobile-drag-handle"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '30px',
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'center', 
                cursor: 'grab',
                touchAction: 'none'
              }}
              onTouchStart={(e) => {
                setTouchEnd(null);
                setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
              }}
              onTouchMove={(e) => setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY })}
              onTouchEnd={() => {
                if (!touchStart || !touchEnd) return;
                const distanceY = touchStart.y - touchEnd.y;
                const isDownSwipe = distanceY < -minSwipeDistance;
                const isUpSwipe = distanceY > minSwipeDistance;

                if (isDownSwipe) setIsSidebarOpen(false);
                if (isUpSwipe) setIsSidebarOpen(true);
              }}
            >
              <div style={{ width: '40px', height: '5px', backgroundColor: 'var(--border-input)', borderRadius: '3px' }} />
            </div>
            */}

            {/* ZONE 2 */}
            <div 
              className="sheet-content"
              style={{ flex: 1, overflowY: 'auto', padding: '0 15px' }}
            >
              {(draftPin || editingPinId) ? (
                // VIEW 1: FORM (Add/Edit)
                <>
                  <div key="edit-helper-box" className="info-box">📍 You can freely drag this pin on the map to adjust its exact location.</div>

                  <form onSubmit={handleSavePin} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
                    <div>
                      <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Location Name</label>
                      <input
                        className="form-input"
                        type="text"
                        aria-label="Location Name"
                        required value={formName}
                        onChange={(e) => setFormName(e.target.value)}/>
                    </div>
                    <div>
                      <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Travel Blurb</label>
                      <textarea
                        className="form-input"
                        style={{ height: '100px', resize: 'none' }}
                        aria-label="Travel Blurb"
                        required
                        value={formBlurb}
                        onChange={(e) => setFormBlurb(e.target.value)}
                      />
                    </div>

                    {/* Multiple Photo Upload */}
                    <div>
                      <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Photos</label>
                      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', marginTop: '5px' }}>
                        {formPhotos.map((photo, idx) => (
                          <div key={idx} style={{ position: 'relative', minWidth: '150px' }}>
                            <img src={photo} alt={`Preview ${idx}`} style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-light)' }} />
                            <button
                              type="button"
                              onClick={() => setFormPhotos(formPhotos.filter((_, i) => i !== idx))}
                              style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}
                              aria-label="Remove Photo"
                            >
                              X
                            </button>
                          </div>
                        ))}
                        
                        <div style={{ minWidth: '150px', height: '150px', border: '2px dashed var(--border-input)', borderRadius: '6px' }}>
                          <label style={{ 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            width: '100%', height: '100%', cursor: 'pointer', 
                            color: 'var(--accent-blue)', fontWeight: 'bold', fontSize: '24px' 
                          }}>
                            +
                            <input
                              type="file"
                              accept="image/*"
                              aria-label="Upload Photos"
                              multiple onChange={handleImageUpload} style={{ display: 'none' }} />
                          </label>
                          
                        </div>
                      </div>
                    </div>
                  </form>
                </>
              ) : (
                // VIEW 2: ITINERARY LIST
                <>
                  {/*
                  <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)' }}>TRIP STYLE</p>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Trip Color</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="color"
                          aria-label="Select Trip Line Color"
                          value={(activeTrip as any).lineColor || '#3b82f6'}
                          onChange={(e) => handleTripLineColorChange(e.target.value)}
                          style={{ 
                            width: '36px', height: '32px', padding: '2px', border: '1px solid var(--border-input)', 
                            borderRadius: '6px', cursor: 'pointer', background: 'var(--bg-panel)',
                            filter: (darkMode && ((activeTrip as any).lineColor || '#3b82f6') === '#000000') ? 'invert(1)' : 'none'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                          {['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#000000'].map(c => {
                            const isSelected = ((activeTrip as any).lineColor || '#3b82f6') === c;
                            return (
                              <div
                                key={c}
                                onClick={() => handleTripLineColorChange(c)}
                                style={{
                                  width: '20px', height: '20px', borderRadius: '4px', cursor: 'pointer', boxSizing: 'border-box',
                                  background: getDisplayColor(c),
                                  border: isSelected ? '3px solid var(--text-main)' : '2px solid var(--border-light)',
                                }}
                              />
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>*/}

                  <div key="trip-style-box" className="trip-style-box" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)' }}>TRIP STYLE</p>

                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Trip Color</label>
                      <div className="color-ribbon">
                        <div className="custom-color-btn" style={{ position: 'relative', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--border-light)', flexShrink: 0 }}>
                          <input
                            type="color"
                            aria-label="Select Custom Trip Line Color"
                            value={(activeTrip as any).lineColor || '#3b82f6'}
                            onChange={(e) => handleTripLineColorChange(e.target.value)}
                            style={{ position: 'absolute', top: '-10px', left: '-10px', width: '60px', height: '60px', padding: 0, border: 'none', cursor: 'pointer' }}
                          />
                        </div>
                        <div className="ribbon-divider" style={{ width: '1px', backgroundColor: 'var(--border-input)', flexShrink: 0, margin: '0 8px' }} />
                        <div className="preset-colors-wrapper">
                          {[
                            '#ef4444', '#f97316', '#f59e0b', '#84cc16', 
                            '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', 
                            '#6366f1', '#8b5cf6', '#ec4899', '#000000'
                          ].map(c => {
                            const isSelected = ((activeTrip as any).lineColor || '#3b82f6') === c;
                            return (
                              <button
                                key={c}
                                type="button"
                                className="color-swatch-btn"
                                aria-label={`Select color ${c}`}
                                onClick={() => handleTripLineColorChange(c)}
                                style={{
                                  borderRadius: '50%', cursor: 'pointer', padding: 0, flexShrink: 0,
                                  background: getDisplayColor(c),
                                  border: isSelected ? '3px solid var(--text-main)' : '2px solid transparent',
                                  boxShadow: isSelected ? '0 0 0 2px var(--bg-panel) inset' : '0 2px 4px rgba(0,0,0,0.1)',
                                  transition: 'transform 0.1s ease, border-color 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease',
                                  transform: isSelected ? 'scale(1.1)' : 'scale(1)'
                                }}
                              />
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {tripPins.length === 0 && <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Click anywhere on the map to drop your first pin!</p>}
                  
                  {/* Trip Cards */}
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '15px', paddingBottom: '40px', marginLeft: '10px' }}>
                    {tripPins.length > 1 && (
                      <div style={{ position: 'absolute', top: '30px', bottom: '70px', left: '22px', width: '2px', backgroundColor: 'var(--border-light)', zIndex: 0 }} />
                    )}

                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActiveDragId(e.active.id as number)} onDragEnd={handleDragEnd}>
                      <SortableContext items={tripPins.map(p => p.id)} strategy={verticalListSortingStrategy}>
                        
                        {tripPins.map((pin, index) => (
                          <SortableTripCard 
                            key={pin.id} 
                            pin={pin} 
                            index={index} 
                            selectedCardId={selectedCardId} 
                            activeTrip={activeTrip}
                            getDisplayColor={getDisplayColor}
                            setGallery={setGallery}
                            handleCardClick={handleCardClick} 
                            startEditing={startEditing} 
                            deletePin={deletePin} 
                          />
                        ))}
                        
                      </SortableContext>
                    </DndContext>
                  </div>
                </>
              )}
            </div>

            {/* ZONE 3 */}
            {(draftPin || editingPinId) && (
              <div className="action-footer">
                <button type="button" onClick={handleSavePin} className="btn btn-blue" style={{ flex: 1, padding: '12px' }}>
                  {editingPinId ? "Update Pin" : "Save Pin"}
                </button>
                <button type="button" onClick={cancelForm} className="btn btn-red" style={{ flex: 1, padding: '12px' }}>
                  Cancel
                </button>
              </div>
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
        doubleClickZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <ZoomControl position={isMobileScreen ? "topright" : "bottomleft"} />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        <MapClickHandler onMapClick={handleMapClick} popupCount={popupCount} />
        <MapCameraController target={cameraTarget} isSidebarOpen={isSidebarOpen}/>
        <MapBackgroundEvents selectedCardId={selectedCardId} setSelectedCardId={setSelectedCardId} />
        
        {/* Polyline (triple rendered for dateline wrapping) */}
        {visibleTripsData.map(trip => {
          if (trip.pins.length < 2) return null;
          const routeCoords = calculateWrappedRoute(trip.pins);
          return WORLD_OFFSETS.map(offset => {
            const shiftedRoute = routeCoords.map((coord: any) => [coord[0], coord[1] + offset]);
            const displayColor = getDisplayColor((trip as any).lineColor || '#3b82f6');
            
            return <Polyline
              key={`route-${trip.id}-${offset}-${displayColor}-${trip.id === activeTripId}`}
              ref={(el) => {
                if (trip.id === activeTripId && el) {
                  activePolylinesRef.current[offset] = el;
                }
              }}
              
              positions={shiftedRoute}
              color={displayColor} 
              weight={4}
              opacity={trip.id === activeTripId ? 1.0 : 0.4}
              dashArray="10, 10" 
            />;
          });
        })}

        {/* Highlight Ring >>>i wanna get rid of this later, it doesnt look good */}
        {activeFocusLocation && WORLD_OFFSETS.map(offset => (
          <CircleMarker
            key={`highlight-${selectedCardId}-${offset}`}
            ref={(el) => {
              if (el) highlightCirclesRef.current[offset] = el;
            }}
            center={[activeFocusLocation.lat, activeFocusLocation.lng + offset]}
            radius={25}
            pathOptions={{
              color: getDisplayColor((activeTrip as any).lineColor || '#3b82f6'),
              fillColor: getDisplayColor((activeTrip as any).lineColor || '#3b82f6'),
              fillOpacity: 0.3 
            }} 
          />
        ))}

        {/* Saved Pins (triple rendered for dateline wrapping) */}
        {WORLD_OFFSETS.map(offset => (
          <React.Fragment key={`world-copy-${offset}`}>
            {visibleTripsData.map(trip => (
              <React.Fragment key={`trip-group-${trip.id}`}>
                {[...trip.pins].sort((a, b) => a.id.toString().localeCompare(b.id.toString())).map((pin: any, index: number) => {
                  const displayColor = getDisplayColor((trip as any).lineColor || '#3b82f6');

                  return (
                    <Marker 
                      key={`${pin.id}-${offset}-${pinsUnlocked || pin.id === editingPinId}-${trip.id === activeTripId}`}
                      position={[pin.lat, pin.lng + offset]}
                      title={pin.name}
                      alt={`Map pin for ${pin.name}`}
                      draggable={!uiHidden && ((pinsUnlocked && trip.id === activeTripId) || pin.id === editingPinId)}
                      icon={getPinIcon(displayColor)}
                      eventHandlers={{ 
                        mousedown: (e) => {
                            isDraggingMapPin.current = true;
                            e.target.closePopup(); 
                          },
                        dragstart: (e) => {
                          isDraggingMapPin.current = true;
                          e.target.closePopup();
                        },
                        drag: (e) => {
                            const liveLatLng = e.target.getLatLng();
                            const baseLng = liveLatLng.lng - offset; 
                            const draftPinsForMath = tripPins.map(p => 
                              p.id === pin.id 
                                ? { ...p, lat: liveLatLng.lat, lng: baseLng } 
                                : p
                            );
                            const newBaseRoute = calculateWrappedRoute(draftPinsForMath);
                            WORLD_OFFSETS.forEach(worldOffset => {
                              const polyRef = activePolylinesRef.current[worldOffset];
                              if (polyRef) {
                                const shiftedRoute = newBaseRoute.map((coord: any) => [coord[0], coord[1] + worldOffset]);
                                polyRef.setLatLngs(shiftedRoute);
                              }
                            });
                            if (selectedCardId === pin.id) {
                              WORLD_OFFSETS.forEach(worldOffset => {
                                const circleRef = highlightCirclesRef.current[worldOffset];
                                if (circleRef) {
                                  circleRef.setLatLng([liveLatLng.lat, baseLng + worldOffset]);
                                }
                              });
                            }
                          },
                        dragend: (e) => {
                          const position = e.target.getLatLng();
                          const trueLng = position.lng - offset;
                          updateActiveTripPins(tripPins.map(p => p.id === pin.id ? { ...p, lat: position.lat, lng: trueLng } : p));
                          setTimeout(() => { isDraggingMapPin.current = false; }, 100);
                        },
                        contextmenu: () => { if (!uiHidden) startEditing(pin); },
                        popupopen: () => setSelectedCardId(pin.id),
                        popupclose: () => {
                            if (!isDraggingMapPin.current) {
                              setSelectedCardId(prev => prev === pin.id ? null : prev);
                            }
                          },
                        click: () => {
                          if (editingPinId === pin.id) return;
                          if (selectedCardId === pin.id) {
                            if (!uiHidden) startEditing(pin);
                            return; 
                          }

                          if (trip.id !== activeTripId) {
                            handleSwitchTrip(trip.id, pin);
                            
                            setTimeout(() => {
                              if (markerRefs.current[`${pin.id}-${offset}`]) {
                                markerRefs.current[`${pin.id}-${offset}`].openPopup();
                              }
                            }, 150);
                          }
                        }
                      }}
                      ref={(r) => { markerRefs.current[`${pin.id}-${offset}`] = r; }}
                      opacity={trip.id === activeTripId ? 1.0 : 0.6}
                    >

                      <Popup
                        autoPan={false}
                        minWidth={300}
                        maxWidth={500}
                      >
                        <div style={{ minWidth: '150px' }}>
                          
                          {renderPhotoPreview(pin.photoUrls)}

                          <strong style={{ fontSize: '16px' }}>{pin.name}</strong> <br />
                          <p style={{ margin: '8px 0', fontSize: '14px' }}>{pin.blurb}</p>
                          
                          {trip.id === activeTripId && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', paddingTop: '10px', borderTop: '1px solid var(--border-light)' }}>
                              
                              <button 
                                aria-label="Previous Stop"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (index > 0) handleCardClick(trip.pins[index - 1]); }}
                                style={{ visibility: index > 0 ? 'visible' : 'hidden', background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '16px', padding: '0 5px' }}
                              >
                                ◀
                              </button>

                              <div style={{ display: 'flex', gap: '5px' }}>
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); startEditing(pin); }} className="mini-btn mini-btn-default">Edit</button>
                                <button onClick={(e) => {e.preventDefault(); e.stopPropagation(); deletePin(pin.id); }} className="mini-btn mini-btn-danger">Delete</button>
                              </div>

                              <button
                                aria-label="Next Stop"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (index < trip.pins.length - 1) handleCardClick(trip.pins[index + 1]); }}
                                style={{ visibility: index < trip.pins.length - 1 ? 'visible' : 'hidden', background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '16px', padding: '0 5px' }}
                              >
                                ▶
                              </button>
                              
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  )}
                )}
              </React.Fragment>
            ))}
          </React.Fragment>
        ))}

        {/* Draft Pin */}
        {draftPin && (
          <Marker
            position={[draftPin.lat, draftPin.lng]}
            title="New Draft Pin"
            alt="New Draft Pin"
            opacity={0.7}
            icon={getPinIcon(getDisplayColor((activeTrip as any).lineColor || '#3b82f6'))}
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
    </main>
  );
};

export default TravelMap;
