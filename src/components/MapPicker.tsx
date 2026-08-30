"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon missing issues in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  defaultAddress?: string;
}

function LocationMarker({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number, address: string) => void }) {
  const [position, setPosition] = useState<L.LatLng | null>(null);

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      
      // Reverse geocode
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`)
        .then(res => res.json())
        .then(data => {
          const address = data.display_name || `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`;
          onLocationSelect(e.latlng.lat, e.latlng.lng, address);
        })
        .catch(err => {
          console.error(err);
          onLocationSelect(e.latlng.lat, e.latlng.lng, `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`);
        });
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function MapPicker({ onLocationSelect, defaultAddress }: MapPickerProps) {
  return (
    <div className="h-[300px] w-full rounded-xl overflow-hidden border">
      <MapContainer center={[24.805, -107.394]} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker onLocationSelect={onLocationSelect} />
      </MapContainer>
      <div className="bg-slate-50 p-2 text-xs text-slate-500 text-center border-t">
        Haz clic en el mapa para colocar el pin 📍
      </div>
    </div>
  );
}
