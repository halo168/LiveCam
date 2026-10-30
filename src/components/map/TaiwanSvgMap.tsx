/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { Attraction, CameraItem } from '../../types/camera';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

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
  // 縮放與平移狀態管理
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  const projectToSvg = (lat: number, lng: number) => {
    const minLat = 21.8;
    const maxLat = 25.4;
    const minLng = 119.5;
    const maxLng = 122.2;

    const x = ((lng - minLng) / (maxLng - minLng)) * 400 + 50;
    const y = 650 - ((lat - minLat) / (maxLat - minLat)) * 580;
    return { x, y };
  };

  // 台灣本島輪廓 Path
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

  // --- 滾輪縮放邏輯 (以游標位置為中心縮放) ---
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newScale = Math.min(Math.max(transform.scale * zoomFactor, 0.8), 6);

    const rect = e.currentTarget.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    setTransform((prev) => ({
      scale: newScale,
      x: cursorX - ((cursorX - prev.x) / prev.scale) * newScale,
      y: cursorY - ((cursorY - prev.y) / prev.scale) * newScale,
    }));
  };

  // --- 拖曳平移邏輯 ---
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return; // 僅支援滑鼠左鍵拖曳
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx - transform.x) > 3 || Math.abs(dy - transform.y) > 3) {
      hasMovedRef.current = true;
    }
    setTransform((prev) => ({
      ...prev,
      x: dx,
      y: dy,
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // --- 右側控制按鈕事件 ---
  const handleZoomIn = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(prev.scale * 1.25, 6),
    }));
  };

  const handleZoomOut = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(prev.scale / 1.25, 0.8),
    }));
  };

  const handleReset = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#071B29] select-none p-4 overflow-hidden">
      {/* 2D 地圖右側懸浮控制列 */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2">
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 rounded-full bg-[#071B29]/90 hover:bg-[#0c2a40] text-white/90 hover:text-white border border-white/20 shadow-xl flex items-center justify-center transition-all active:scale-90"
          title="放大 (Zoom In)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          onClick={handleZoomOut}
          className="w-10 h-10 rounded-full bg-[#071B29]/90 hover:bg-[#0c2a40] text-white/90 hover:text-white border border-white/20 shadow-xl flex items-center justify-center transition-all active:scale-90"
          title="縮小 (Zoom Out)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          onClick={handleReset}
          className="w-10 h-10 rounded-full bg-[#071B29]/90 hover:bg-[#0c2a40] text-[#F6C66B] hover:text-white border border-[#F6C66B]/40 shadow-xl flex items-center justify-center transition-all active:scale-90"
          title="重置視角"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <svg
        viewBox="0 0 500 700"
        className={`w-full h-full max-h-[640px] drop-shadow-2xl touch-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        preserveAspectRatio="xMidYMid meet"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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

        {/* 靜態背景底板 */}
        <rect width="500" height="700" rx="20" fill="url(#svgOcean)" />

        {/* 可縮放平移的地圖本體群組 */}
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          <circle cx="270" cy="360" r="280" fill="none" stroke="#49A88B" strokeOpacity="0.1" strokeDasharray="4 8" />
          <circle cx="270" cy="360" r="180" fill="none" stroke="#49A88B" strokeOpacity="0.15" />

          {/* 台灣本島輪廓 */}
          <path d={taiwanMainPath} fill="none" stroke="#49A88B" strokeWidth="6" strokeOpacity="0.25" />
          <path d={taiwanMainPath} fill="url(#svgTerrain)" />

          {/* 中央山脈稜線 */}
          <path
            d="M 310,135 Q 295,250 280,360 Q 260,450 240,560"
            fill="none"
            stroke="url(#svgSpine)"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* 景點標記 */}
          {attractions.map((attr) => {
            const { x, y } = projectToSvg(attr.latitude, attr.longitude);
            const isSelected = attr.attractionId === selectedAttractionId;
            const isHovered = attr.attractionId === hoveredAttractionId;

            const hasLive = attr.cameraIds.some((cid) => {
              const cam = camerasMap.get(cid);
              return cam && cam.streamStatus === 'live';
            });

            return (
              <g
                key={attr.attractionId}
                className="cursor-pointer"
                onClick={() => {
                  // 如果剛才是在拖曳地圖，則不觸發選取景點
                  if (!hasMovedRef.current) {
                    onSelectAttraction(attr);
                  }
                }}
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
                      {getLandmarkIcon(attr.landmarkType)}{' '}
                      {attr.name.length > 7 ? attr.name.slice(0, 7) + '..' : attr.name}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
