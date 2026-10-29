/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Attraction, CameraItem } from '../../types/camera';

interface TaiwanSvgMapProps {
  attractions: Attraction[];
  camerasMap: Map<string, CameraItem>;
  selectedAttractionId: string | null;
  hoveredAttractionId: string | null;
  onSelectAttraction: (attraction: Attraction) => void;
  onHoverAttraction: (attractionId: string | null) => void;
}

export const TaiwanSvgMap: React.FC<TaiwanSvgMapProps> = ({
  attractions,
  camerasMap,
  selectedAttractionId,
  hoveredAttractionId,
  onSelectAttraction,
  onHoverAttraction,
}) => {
  const projectToSvg = (lat: number, lng: number) => {
    const minLat = 21.8;
    const maxLat = 25.4;
    const minLng = 119.5;
    const maxLng = 122.2;

    const x = ((lng - minLng) / (maxLng - minLng)) * 400 + 50;
    const y = 650 - ((lat - minLat) / (maxLat - minLat)) * 580;
    return { x, y };
  };

  // High precision Taiwan main island polygon
  const taiwanMainPath =
    'M 310,95 ' +
    'C 335,105 370,120 380,145 ' +
    'C 390,165 375,190 365,225 ' +
    'C 355,270 345,340 330,420 ' +
    'C 320,460 305,510 280,560 ' +
    'C 260,600 245,630 230,645 ' +
    'C 215,640 205,615 200,580 ' +
    'C 195,540 190,490 185,450 ' +
    'C 175,410 170,360 180,310 ' +
    'C 190,260 215,210 240,170 ' +
    'C 260,140 285,115 310,95 Z';

  const getLandmarkIcon = (type: string) => {
    switch (type) {
      case 'city':
        return '🏙️';
      case 'mountain':
        return '⛰️';
      case 'coast':
        return '🌊';
      case 'port':
        return '⚓';
      case 'lake':
        return '⛵';
      case 'temple':
        return '⛩️';
      case 'station':
        return '🚆';
      default:
        return '📹';
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#071B29] select-none p-4">
      <svg
        viewBox="0 0 500 700"
        className="w-full h-full max-h-[640px] drop-shadow-2xl"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="svgOcean" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0b2336" />
            <stop offset="100%" stopColor="#071825" />
          </linearGradient>

          <linearGradient id="svgTerrain" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#49A88B" />
            <stop offset="50%" stopColor="#2c725c" />
            <stop offset="100%" stopColor="#1a4d3e" />
          </linearGradient>

          <linearGradient id="svgSpine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F6C66B" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#F6C66B" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#F6C66B" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        <rect width="500" height="700" rx="20" fill="url(#svgOcean)" />
        <circle cx="270" cy="360" r="280" fill="none" stroke="#49A88B" strokeOpacity="0.1" strokeDasharray="4 8" />
        <circle cx="270" cy="360" r="180" fill="none" stroke="#49A88B" strokeOpacity="0.15" />

        {/* Mainland Taiwan */}
        <path d={taiwanMainPath} fill="none" stroke="#49A88B" strokeWidth="6" strokeOpacity="0.25" />
        <path d={taiwanMainPath} fill="url(#svgTerrain)" />

        {/* Central Mountain Range Spine */}
        <path
          d="M 310,135 Q 295,250 280,360 Q 260,450 240,560"
          fill="none"
          stroke="url(#svgSpine)"
          strokeWidth="16"
          strokeLinecap="round"
        />

        {/* Attractions markers */}
        {attractions.map((attr) => {
          const { x, y } = projectToSvg(attr.latitude, attr.longitude);
          const isSelected = attr.attractionId === selectedAttractionId;
          const isHovered = attr.attractionId === hoveredAttractionId;

          // Check if any camera in this attraction is LIVE
          const hasLive = attr.cameraIds.some((cid) => {
            const cam = camerasMap.get(cid);
            return cam && cam.streamStatus === 'live';
          });

          return (
            <g
              key={attr.attractionId}
              className="cursor-pointer"
              onClick={() => onSelectAttraction(attr)}
              onMouseEnter={() => onHoverAttraction(attr.attractionId)}
              onMouseLeave={() => onHoverAttraction(null)}
              transform={`translate(${x}, ${y})`}
            >
              <circle
                r={isSelected ? 16 : isHovered ? 12 : 7}
                fill={hasLive ? '#49A88B' : '#F6C66B'}
                fillOpacity={isSelected ? 0.4 : 0.25}
                stroke={hasLive ? '#49A88B' : '#F6C66B'}
                strokeWidth={isSelected ? 2 : 1}
              />
              <circle
                r={isSelected ? 6 : 4}
                fill={isSelected ? '#F6C66B' : '#FFFFFF'}
                stroke="#071B29"
                strokeWidth="1.5"
              />

              {(isSelected || isHovered) && (
                <g transform="translate(0, -16)">
                  <rect
                    x="-65"
                    y="-22"
                    width="130"
                    height="22"
                    rx="11"
                    fill="#071B29"
                    fillOpacity="0.95"
                    stroke="#F6C66B"
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="-7"
                    textAnchor="middle"
                    fill="#F4F0E7"
                    fontSize="9.5"
                    fontWeight="bold"
                  >
                    {getLandmarkIcon(attr.landmarkType)} {attr.name.length > 7 ? attr.name.slice(0, 7) + '..' : attr.name}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
