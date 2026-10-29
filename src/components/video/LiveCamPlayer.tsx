/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Attraction, CameraItem } from '../../types/camera';
import { ExternalLink, Maximize2, MapPin, Radio, AlertTriangle, ShieldCheck, Video } from 'lucide-react';

interface LiveCamPlayerProps {
  attraction: Attraction | null;
  camerasMap: Map<string, CameraItem>;
  onClose?: () => void;
  onOpenCheckin: (attraction: Attraction, camera: CameraItem) => void;
}

export const LiveCamPlayer: React.FC<LiveCamPlayerProps> = ({
  attraction,
  camerasMap,
  onClose,
  onOpenCheckin,
}) => {
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isTheater, setIsTheater] = useState(false);

  // Sync active camera when attraction changes
  useEffect(() => {
    if (attraction && attraction.cameraIds.length > 0) {
      setActiveCameraId(attraction.cameraIds[0]);
      setLoadError(false);
    } else {
      setActiveCameraId(null);
    }
  }, [attraction]);

  if (!attraction || !activeCameraId) {
    return (
      <div className="w-full h-full min-h-[380px] flex flex-col items-center justify-center p-8 text-center bg-[#071B29]/60 border border-white/10 rounded-2xl">
        <div className="w-16 h-16 mb-4 rounded-2xl bg-[#49A88B]/10 border border-[#49A88B]/30 flex items-center justify-center text-3xl">
          🔭
        </div>
        <h3 className="text-lg font-bold text-[#F4F0E7] mb-2">請於 3D 地圖中選擇景點地標</h3>
        <p className="text-sm text-[#F4F0E7]/60 max-w-sm leading-relaxed">
          點選台灣地圖上的動態分類地標或下方景點目錄，即可即時觀看來自指定 YouTube 播放清單的官方即時串流。
        </p>
      </div>
    );
  }

  const currentCamera = camerasMap.get(activeCameraId);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'live':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#49A88B]/20 text-[#49A88B] text-xs font-semibold border border-[#49A88B]/40">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            即時直播中 (LIVE)
          </span>
        );
      case 'upcoming':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F6C66B]/20 text-[#F6C66B] text-xs font-semibold border border-[#F6C66B]/40">
            預定直播 (Upcoming)
          </span>
        );
      case 'offline':
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 text-white/70 text-xs font-semibold border border-white/10">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            離線或輪播待命 (Standby)
          </span>
        );
    }
  };

  return (
    <div
      className={`relative flex flex-col bg-[#071B29]/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
        isTheater ? 'fixed inset-4 z-50 flex flex-col' : 'w-full'
      }`}
    >
      {/* Video Screen Container */}
      <div className="relative w-full aspect-video bg-black/90 flex items-center justify-center overflow-hidden">
        {currentCamera ? (
          currentCamera.embeddable && !loadError ? (
            <iframe
              key={currentCamera.videoId}
              src={`https://www.youtube.com/embed/${currentCamera.videoId}?si=CuMaBwCqPFdeuD7z&autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`}
              title={currentCamera.title}
              className="w-full h-full border-0"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              onError={() => setLoadError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center text-[#F4F0E7]">
              <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
              <h4 className="text-base font-semibold mb-1">
                {!currentCamera.embeddable ? '官方頻道設定限制網頁內嵌播放' : '串流加載失敗'}
              </h4>
              <p className="text-xs text-[#F4F0E7]/60 max-w-md mb-4">
                本影片屬於指定播放清單，請點擊下方按鈕前往 YouTube 原始網頁觀看。
              </p>
              <a
                href={currentCamera.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#49A88B] text-[#071B29] font-bold text-xs hover:bg-[#3d8c74] transition-colors shadow-lg"
              >
                <span>前往 YouTube 觀賞即時串流</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )
        ) : null}

        {/* Top Controls */}
        <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
          <button
            onClick={() => setIsTheater(!isTheater)}
            className="p-2 rounded-lg bg-[#071B29]/70 hover:bg-[#071B29] text-[#F4F0E7] border border-white/10 transition-colors"
            title={isTheater ? '還原視窗' : '劇院全螢幕'}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-lg bg-[#071B29]/70 hover:bg-[#071B29] text-[#F4F0E7] text-xs font-semibold border border-white/10 transition-colors"
            >
              關閉
            </button>
          )}
        </div>
      </div>

      {/* Camera Switcher (When attraction has multiple cameras) */}
      {attraction.cameraIds.length > 1 && (
        <div className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border-b border-white/10 overflow-x-auto">
          <span className="text-[11px] font-semibold text-[#F6C66B] shrink-0 flex items-center gap-1">
            <Video className="w-3.5 h-3.5" /> 切換視角 ({attraction.cameraIds.length}):
          </span>
          {attraction.cameraIds.map((cid, idx) => {
            const cam = camerasMap.get(cid);
            const isActive = cid === activeCameraId;
            return (
              <button
                key={cid}
                onClick={() => {
                  setActiveCameraId(cid);
                  setLoadError(false);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[#49A88B] text-[#071B29] shadow-md'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {cam ? (cam.title.length > 14 ? cam.title.slice(0, 14) + '...' : cam.title) : `視角 ${idx + 1}`}
              </button>
            );
          })}
        </div>
      )}

      {/* Video & Attraction Metadata */}
      <div className="p-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5 text-xs">
              <span className="font-semibold text-[#F6C66B]">{attraction.city}</span>
              <span className="text-white/40">·</span>
              <span className="text-[#49A88B]">{attraction.region.toUpperCase()}</span>
              <span className="text-white/40">·</span>
              <span className="text-white/60">
                {attraction.coordinateAccuracy === 'exact' ? '精準地標座標' : '景點近似位置'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#F4F0E7] tracking-tight">{attraction.name}</h2>
            {currentCamera && (
              <h3 className="text-xs text-[#F4F0E7]/70 mt-1 line-clamp-1">{currentCamera.title}</h3>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {getStatusBadge(currentCamera?.streamStatus)}
          </div>
        </div>

        {/* Geographic & Source Details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10 text-xs">
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
            <span className="text-[11px] text-[#F4F0E7]/50 block">經緯座標 (WGS-84)</span>
            <span className="text-[#F4F0E7] font-mono font-medium">
              {attraction.latitude.toFixed(3)}°N, {attraction.longitude.toFixed(3)}°E
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
            <span className="text-[11px] text-[#F4F0E7]/50 block">打卡允許半徑</span>
            <span className="text-[#F6C66B] font-mono font-medium">
              {attraction.checkinRadiusMeters} 公尺以內
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 col-span-2">
            <span className="text-[11px] text-[#F4F0E7]/50 block">座標認證來源</span>
            <span className="text-white/80 truncate block mt-0.5">
              {attraction.coordinateSource}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-1.5 text-xs text-[#F4F0E7]/60">
            <ShieldCheck className="w-4 h-4 text-[#49A88B]" />
            <span>指定 YouTube 播放清單合法來源</span>
          </div>

          {currentCamera && attraction.checkinEnabled && (
            <button
              onClick={() => onOpenCheckin(attraction, currentCamera)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F6C66B] to-[#e4b354] hover:from-[#f3be58] hover:to-[#db9f3a] text-[#071B29] font-bold text-sm shadow-lg transition-transform active:scale-95"
            >
              <MapPin className="w-4 h-4" />
              <span>實地 GPS 打卡出任務</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
