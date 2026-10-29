/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Attraction, CameraItem, CheckinRecord, TravelerProfile, SyncStats } from './types/camera';
import initialCamerasData from './data/cameras.json';
import initialAttractionsData from './data/attractions.json';
import { Taiwan3DMap } from './components/map/Taiwan3DMap';
import { LiveCamPlayer } from './components/video/LiveCamPlayer';
import { CameraListGrid } from './components/camera/CameraListGrid';
import { GpsCheckinModal } from './components/checkin/GpsCheckinModal';
import { TravelPassportModal } from './components/passport/TravelPassportModal';
import { CameraEditorModal } from './components/camera/CameraEditorModal';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { MapPin, Compass, Radio, BookOpen, ShieldCheck, Sparkles, Video } from 'lucide-react';
import { PlaylistSyncService } from './services/PlaylistSyncService';

const LOCAL_STORAGE_PROFILE_KEY = 'taiwan_traveler_profile_v2';
const LOCAL_STORAGE_CAMERAS_KEY = 'taiwan_custom_cameras_v2';
const LOCAL_STORAGE_ATTRS_KEY = 'taiwan_custom_attractions_v2';

export default function App() {
  // Load cameras and attractions
  const [cameras, setCameras] = useState<CameraItem[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_CAMERAS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to load cached cameras:', e);
    }
    return initialCamerasData as CameraItem[];
  });

  const [attractions, setAttractions] = useState<Attraction[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_ATTRS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to load cached attractions:', e);
    }
    return initialAttractionsData as Attraction[];
  });

  // Fast lookup Map for cameras by cameraId
  const camerasMap = useMemo(() => {
    const map = new Map<string, CameraItem>();
    cameras.forEach((c) => map.set(c.cameraId, c));
    return map;
  }, [cameras]);

  // Selected Attraction (Default: 大稻埕碼頭)
  const [selectedAttraction, setSelectedAttraction] = useState<Attraction | null>(() => {
    return (
      (initialAttractionsData as Attraction[]).find(
        (a) => a.attractionId === 'attr-dadaocheng-wharf'
      ) || (initialAttractionsData as Attraction[])[0] || null
    );
  });

  const [is2DView, setIs2DView] = useState(false);
  const [isMapCollapsed, setIsMapCollapsed] = useState(false);
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [checkinTarget, setCheckinTarget] = useState<{
    attraction: Attraction;
    camera: CameraItem;
  } | null>(null);

  const [isPassportOpen, setIsPassportOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Traveler Profile State
  const [profile, setProfile] = useState<TravelerProfile>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Could not load traveler profile:', e);
    }
    const newId = `TW-CAM-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    return {
      userId: newId,
      displayName: '島嶼旅人',
      nickname: '',
      firstJoined: new Date().toISOString(),
      checkins: [],
      unlockedAttractionIds: [],
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.error('Failed to save profile:', e);
    }
  }, [profile]);

  const stats: SyncStats = useMemo(() => {
    return PlaylistSyncService.computeStats(cameras, attractions);
  }, [cameras, attractions]);

  const handleCheckinSuccess = (record: CheckinRecord) => {
    setProfile((prev) => {
      const alreadyChecked = prev.checkins.some((c) => c.attractionId === record.attractionId);
      const updatedCheckins = [record, ...prev.checkins];
      const updatedBadgeIds = alreadyChecked
        ? prev.unlockedAttractionIds
        : [...prev.unlockedAttractionIds, record.attractionId];

      return {
        ...prev,
        displayName: record.name || prev.displayName,
        nickname: record.nickname || prev.nickname,
        checkins: updatedCheckins,
        unlockedAttractionIds: updatedBadgeIds,
      };
    });
  };

  const handleClearProfile = () => {
    const newId = `TW-CAM-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const freshProfile: TravelerProfile = {
      userId: newId,
      displayName: '島嶼旅人',
      nickname: '',
      firstJoined: new Date().toISOString(),
      checkins: [],
      unlockedAttractionIds: [],
    };
    setProfile(freshProfile);
    localStorage.removeItem(LOCAL_STORAGE_PROFILE_KEY);
    setIsPassportOpen(false);
  };

  const handleTriggerSync = async (apiKey?: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch('/api/sync-playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || '同步失敗' };
      }
      return { success: true, message: data.message };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  };

  const handleAssignCoordinates = (
    cameraId: string,
    attractionName: string,
    city: string,
    lat: number,
    lng: number
  ) => {
    const newAttrId = `attr-custom-${Date.now().toString(36)}`;
    const newAttr: Attraction = {
      attractionId: newAttrId,
      name: attractionName,
      city: city || '台灣景點',
      region: 'north',
      latitude: lat,
      longitude: lng,
      coordinateSource: '管理員手動核實官方座標',
      coordinateAccuracy: 'exact',
      landmarkType: 'other',
      cameraIds: [cameraId],
      checkinEnabled: true,
      checkinRadiusMeters: 1000,
    };

    const updatedCameras = cameras.map((c) => {
      if (c.cameraId === cameraId) {
        return { ...c, attractionId: newAttrId };
      }
      return c;
    });

    const updatedAttrs = [...attractions, newAttr];
    setCameras(updatedCameras);
    setAttractions(updatedAttrs);
    try {
      localStorage.setItem(LOCAL_STORAGE_CAMERAS_KEY, JSON.stringify(updatedCameras));
      localStorage.setItem(LOCAL_STORAGE_ATTRS_KEY, JSON.stringify(updatedAttrs));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#071B29] text-[#F4F0E7] flex flex-col font-sans selection:bg-[#49A88B] selection:text-[#071B29]">
      <Header
        onOpenPassport={() => setIsPassportOpen(true)}
        onOpenEditor={() => setIsEditorOpen(true)}
        onScrollToSection={scrollToSection}
        selectedCamera={null}
        onOpenCheckin={() => {}}
        totalCheckins={profile.checkins.length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-12">
        {/* HERO SECTION */}
        <section className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-gradient-to-br from-[#0c263a] via-[#071B29] to-[#04111c] p-6 sm:p-10 lg:p-12">
          <div className="absolute inset-0 z-0 opacity-25 pointer-events-none mix-blend-screen">
            <img
              src="/src/assets/images/taiwan_clouds_sunrise_1793215817207.jpg"
              alt="台灣高山雲海日出"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="relative z-10 max-w-3xl space-y-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#F6C66B] tracking-wider uppercase">
              <Sparkles className="w-4 h-4" />
              <span>YouTube 唯一指定播放清單動態核心 · Taiwan Live Cam Explorer V2.1</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-[#F4F0E7] tracking-tight leading-tight text-balance">
              找找台灣鏡頭君，<br className="hidden sm:inline" />
              探索福爾摩沙山海即時影像
            </h1>

            <p className="text-sm sm:text-base text-[#F4F0E7]/80 leading-relaxed max-w-2xl">
              所有景點影像 100% 來自指定官方 YouTube 直播播放清單。
              結合 3D 島嶼低多邊形地貌、依地質景觀動態生成的 8 類微縮地標模型，
              以及 Google Apps Script 試算表雙重防偽打卡，身歷其境探索台灣之美。
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              <button
                onClick={() => scrollToSection('map-section')}
                className="px-6 py-3 rounded-xl bg-[#49A88B] hover:bg-[#3ca084] text-[#071B29] font-bold text-sm shadow-xl transition-all active:scale-95 flex items-center gap-2"
              >
                <Compass className="w-4 h-4" />
                <span>進入 3D 動態地標地圖</span>
              </button>

              <button
                onClick={() => setIsPassportOpen(true)}
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/10 font-semibold text-sm transition-all active:scale-95 flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-[#F6C66B]" />
                <span>我的旅行護照 ({profile.checkins.length})</span>
              </button>

              <button
                onClick={() => setIsEditorOpen(true)}
                className="px-5 py-3 rounded-xl bg-[#0b2438] hover:bg-[#0e2d45] text-white border border-[#49A88B]/40 font-semibold text-sm transition-all active:scale-95 flex items-center gap-2"
              >
                <Video className="w-4 h-4 text-[#49A88B]" />
                <span>鏡頭資料庫 (99 部影片)</span>
              </button>
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/50">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#49A88B]" />
                YouTube 官方播放清單真實影像
              </span>
              <span className="flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-[#F6C66B]" />
                {stats.geocodedAttractionsCount} 處認證景點 · {stats.liveConfirmedCount} 支 LIVE
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#49A88B]" />
                中央山脈立體地形 · 無矩形色塊
              </span>
            </div>
          </div>
        </section>

        {/* 3D MAP & LIVE CAM PLAYER SPLIT SECTION */}
        <section id="map-section" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#F4F0E7] tracking-tight flex items-center gap-2.5">
                <span>3D 台灣島嶼動態地標地圖</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#49A88B]/20 text-[#49A88B] border border-[#49A88B]/30 font-mono">
                  {attractions.length} 處地標
                </span>
              </h2>
              <p className="text-xs text-white/60 mt-0.5">
                參考真實高程地貌呈現中央山脈立體山脊與翡翠平原，搭配 3D 互動鏡頭地標與光影氣氛模式。
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIs2DView(!is2DView)}
                className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-[#F4F0E7] border border-white/10 transition-colors"
              >
                {is2DView ? '切換為 3D 透視視角' : '切換為 2D 俯視視角'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* 3D Interactive Map */}
            <div
              className={`transition-all duration-300 ${
                isMapCollapsed
                  ? 'lg:col-span-12 h-[640px] lg:h-[720px]'
                  : 'lg:col-span-7 h-[540px] lg:h-[640px]'
              }`}
            >
              <Taiwan3DMap
                attractions={attractions}
                camerasMap={camerasMap}
                selectedAttractionId={selectedAttraction?.attractionId || null}
                onSelectAttraction={(attr) => {
                  setSelectedAttraction(attr);
                  if (!isMapCollapsed) {
                    scrollToSection('player-section');
                  }
                }}
                is2DView={is2DView}
                onToggle2D={() => setIs2DView(!is2DView)}
                isCollapsed={isMapCollapsed}
                onToggleCollapse={() => setIsMapCollapsed(!isMapCollapsed)}
              />
            </div>

            {/* YouTube Live Cam Player */}
            <div
              id="player-section"
              className={`flex flex-col justify-start transition-all duration-300 ${
                isMapCollapsed ? 'lg:col-span-12' : 'lg:col-span-5'
              }`}
            >
              <LiveCamPlayer
                attraction={selectedAttraction}
                camerasMap={camerasMap}
                onOpenCheckin={(attr, cam) => {
                  setCheckinTarget({ attraction: attr, camera: cam });
                  setIsCheckinOpen(true);
                }}
              />
            </div>
          </div>
        </section>

        {/* SPOT EXPLORER & CAMERA DIRECTORY */}
        <section id="list-section" className="pt-6 space-y-6">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-xl sm:text-2xl font-black text-[#F4F0E7] tracking-tight">
              指定清單全台景點目錄
            </h2>
            <p className="text-xs text-white/60 mt-1">
              依北中南東離島與地貌分類快速探索，可隨時切換多視角鏡頭。
            </p>
          </div>

          <CameraListGrid
            attractions={attractions}
            camerasMap={camerasMap}
            selectedAttractionId={selectedAttraction?.attractionId || null}
            onSelectAttraction={(attr) => {
              setSelectedAttraction(attr);
              scrollToSection('player-section');
            }}
            onOpenCheckin={(attr, cam) => {
              setCheckinTarget({ attraction: attr, camera: cam });
              setIsCheckinOpen(true);
            }}
          />
        </section>
      </main>

      <Footer
        onOpenPassport={() => setIsPassportOpen(true)}
        onOpenEditor={() => setIsEditorOpen(true)}
      />

      {/* MODALS */}
      {checkinTarget && (
        <GpsCheckinModal
          attraction={checkinTarget.attraction}
          camera={checkinTarget.camera}
          isOpen={isCheckinOpen}
          onClose={() => setIsCheckinOpen(false)}
          onSuccess={handleCheckinSuccess}
        />
      )}

      <TravelPassportModal
        isOpen={isPassportOpen}
        onClose={() => setIsPassportOpen(false)}
        profile={profile}
        attractions={attractions}
        camerasMap={camerasMap}
        onClearProfile={handleClearProfile}
      />

      <CameraEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        cameras={cameras}
        attractions={attractions}
        stats={stats}
        onTriggerSync={handleTriggerSync}
        onAssignCoordinates={handleAssignCoordinates}
      />
    </div>
  );
}
