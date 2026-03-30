import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const TravelMap = () => {
  const [locations, setLocations] = useState([
  ]);

  const mapCenter = [0.0, 0.0]; 

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <MapContainer center={mapCenter} zoom={6} style={{ height: '100%', width: '100%' }}>
        
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {locations.map((loc) => (
          <Marker key={loc.id} position={[loc.lat, loc.lng]}>
            <Popup>
              <strong>{loc.name}</strong> <br />
              {loc.blurb}
            </Popup>
          </Marker>
        ))}
        
      </MapContainer>
    </div>
  );
};

export default TravelMap;