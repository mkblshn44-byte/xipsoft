"use client";

import { BRAND_COMPANY } from '@/config/brand.config';

interface GoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
  markerTitle?: string;
}

const GoogleMap = ({
  center = BRAND_COMPANY.geo,
  zoom = 12,
  className = 'w-full h-96 rounded-lg',
  markerTitle = "XipSoft Merkez Ofis",
}: GoogleMapProps) => {
  const src = `https://www.google.com/maps?q=${center.lat},${center.lng}&z=${zoom}&output=embed`;

  return (
    <iframe
      src={src}
      className={className}
      style={{ border: 0 }}
      allowFullScreen
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      title={markerTitle}
    />
  );
};

export default GoogleMap;
