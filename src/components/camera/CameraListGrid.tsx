/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Attraction, CameraItem, RegionKey, LandmarkType } from '../../types/camera';
import { Search, MapPin, Radio, Compass, Filter, Video } from 'lucide-react';

interface CameraListGridProps {
  attractions: Attraction[];
  camerasMap: Map<string, CameraItem>;
  selectedAttractionId: string | null;
  onSelectAttraction: (attraction: Attraction) => void;
  onOpenCheckin: (attraction: Attraction, camera: CameraItem) => void;
}

export const CameraListGrid: React.FC<CameraListGridProps> = ({
  attractions,
  camerasMap,
  selectedAttractionId,
  onSelectAttraction,
  onOpenCheckin,
}) => {
  const [activeRegion, setActiveRegion] = useState<RegionKey | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLandmarkType, setActiveLandmarkType] = useState<LandmarkType | 'all'>('all');

  const filteredAttractions = attractions.filter((attr) => {
    if (activeRegion !== 'all' && attr.region !== activeRegion) return false;
    if (activeLandmarkType !== 'all' && attr.landmarkType !== activeLandmarkType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = attr.name.toLowerCase().includes(q);
      const matchCity = attr.city.toLowerCase().includes(q);
      if (!matchName && !matchCity) return false;
    }
    return true;
  });

  const regions: { key: RegionKey | 'all'; label: string }[] = [
    { key: 'all', label: '全台灣' },
    { key: 'north', label: '北部' },
    { key: 'central', label: '中部' },
    { key: 'south', label: '南部' },
    { key: 'east', label: '東部' },
    { key: 'islands', label: '離島' },
  ];

  const landmarkTypes: { key: LandmarkType | 'all'; label: string }[] = [
    { key: 'all', label: '所有地標' },
    { key: 'city', label: '都市天際' },
    { key: 'mountain', label: '山嶺森林' },
    { key: 'coast', label: '海岸燈塔' },
    { key: 'port', label: '漁港船影' },
    { key: 'lake', label: '水庫湖泊' },
    { key: 'temple', label: '廟宇古蹟' },
    { key: 'station', label: '車站交通' },
  ];

  const getLandmarkBadge = (type: LandmarkType) => {
    switch (type) {
      case 'city':
        return '🏙️ 都市';
      case 'mountain':
        return '⛰️ 山區';
      case 'coast':
        return '🌊 海岸';
      case 'port':
        return '⚓ 港口';
      case 'lake':
        return '⛵ 湖泊';
      case 'temple':
        return '⛩️ 寺廟';
      case 'station':
        return '🚆 車站';
      default:
        return '📷 地標';
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Search and Filters Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Region Filter Segmented Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#0b2438] rounded-xl border border-white/10 overflow-x-auto scrollbar-none">
          {regions.map((r) => (
            <button
              key={r.key}
              onClick={() => setActiveRegion(r.key)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                activeRegion === r.key
                  ? 'bg-[#49A88B] text-[#071B29] shadow-md'
                  : 'text-[#F4F0E7]/70 hover:text-[#F4F0E7] hover:bg-white/5'
              }`}
            >
              {r.label}
              {r.key !== 'all' && (
                <span className="ml-1 opacity-60 text-[10px]">
                  ({attractions.filter((c) => c.region === r.key).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋景點名稱、縣市 (例如：阿里山、象山、多良車站...)"
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#0b2438] border border-white/10 text-xs text-[#F4F0E7] placeholder-white/30 focus:outline-none focus:border-[#49A88B] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Landmark Type Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs text-white/60">
        <span className="shrink-0 flex items-center gap-1 text-[11px] text-white/40">
          <Filter className="w-3 h-3" /> 地貌分類:
        </span>
        {landmarkTypes.map((st) => (
          <button
            key={st.key}
            onClick={() => setActiveLandmarkType(st.key)}
            className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeLandmarkType === st.key
                ? 'bg-[#F6C66B]/20 text-[#F6C66B] border border-[#F6C66B]/40 font-semibold'
                : 'bg-white/5 hover:bg-white/10 text-white/70'
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* Grid of Attraction Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredAttractions.map((attr) => {
          const isSelected = attr.attractionId === selectedAttractionId;
          const firstCam = camerasMap.get(attr.cameraIds[0]);

          const hasLive = attr.cameraIds.some((cid) => {
            const cam = camerasMap.get(cid);
            return cam?.streamStatus === 'live';
          });

          return (
            <div
              key={attr.attractionId}
              onClick={() => onSelectAttraction(attr)}
              className={`group relative flex flex-col justify-between p-4 rounded-2xl bg-[#071B29]/90 border transition-all duration-200 cursor-pointer shadow-lg hover:shadow-2xl hover:-translate-y-0.5 ${
                isSelected
                  ? 'border-[#F6C66B] ring-1 ring-[#F6C66B]/50 bg-gradient-to-b from-[#0d2a42] to-[#071B29]'
                  : 'border-white/10 hover:border-[#49A88B]/60'
              }`}
            >
              {/* Card Header & Thumbnail */}
              <div>
                {firstCam && (
                  <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-black/60 border border-white/5">
                    <img
                      src={firstCam.thumbnailUrl}
                      alt={attr.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#071B29]/80 backdrop-blur-sm text-[10px] font-semibold text-[#F6C66B] border border-white/10">
                      {getLandmarkBadge(attr.landmarkType)}
                    </div>
                    {hasLive ? (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-[#49A88B]/90 text-[#071B29] text-[10px] font-bold flex items-center gap-1 shadow-md">
                        <Radio className="w-2.5 h-2.5 animate-pulse" />
                        LIVE
                      </div>
                    ) : (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 text-white/70 text-[10px] font-mono">
                        Standby
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 mb-1.5 text-xs">
                  <span className="font-semibold text-[#F6C66B]">{attr.city}</span>
                  <span className="text-[11px] text-white/50 flex items-center gap-1 font-mono">
                    <Video className="w-3 h-3 text-[#49A88B]" />
                    {attr.cameraIds.length} 鏡頭
                  </span>
                </div>

                <h4 className="text-sm font-bold text-[#F4F0E7] group-hover:text-[#F6C66B] transition-colors line-clamp-1">
                  {attr.name}
                </h4>

                <p className="text-xs text-[#F4F0E7]/60 line-clamp-1 mt-1 font-mono text-[11px]">
                  座標來源: {attr.coordinateSource}
                </p>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3.5 mt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <span className="text-[11px] text-white/40 font-mono">
                  {attr.latitude.toFixed(2)}°N, {attr.longitude.toFixed(2)}°E
                </span>

                <div className="flex items-center gap-2">
                  {firstCam && attr.checkinEnabled && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCheckin(attr, firstCam);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#49A88B]/20 hover:bg-[#49A88B] text-[#49A88B] hover:text-[#071B29] font-semibold text-xs transition-colors flex items-center gap-1"
                      title="現場 GPS 打卡"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>打卡</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredAttractions.length === 0 && (
        <div className="py-16 text-center text-white/50 space-y-2">
          <Compass className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">沒有找到符合條件的景點地標</p>
          <p className="text-xs text-white/40">請嘗試更換搜尋關鍵字或分區篩選條件</p>
        </div>
      )}
    </div>
  );
};
