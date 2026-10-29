/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CameraSpot } from '../../types/camera';
import { BookOpen, SlidersHorizontal, MapPin } from 'lucide-react';

interface HeaderProps {
  onOpenPassport: () => void;
  onOpenEditor: () => void;
  onScrollToSection: (sectionId: string) => void;
  selectedCamera: CameraSpot | null;
  onOpenCheckin: (camera: CameraSpot) => void;
  totalCheckins: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenPassport,
  onOpenEditor,
  onScrollToSection,
  selectedCamera,
  onOpenCheckin,
  totalCheckins,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#071B29]/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-8">
      {/* Zone 1: Single element wordmark brand lockup */}
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#F4F0E7] whitespace-nowrap shrink-0 group select-none"
      >
        <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#49A88B] to-[#F6C66B] flex items-center justify-center text-xl shadow-md group-hover:scale-105 transition-transform">
          📸
        </span>
        <div className="flex flex-col">
          <span className="font-extrabold tracking-tight text-[#F4F0E7] text-base leading-none">
            找找台灣鏡頭君
          </span>
          <span className="text-[10px] tracking-wider text-[#49A88B] font-mono mt-0.5">
            Taiwan Live Cam Explorer
          </span>
        </div>
      </a>

      {/* Zone 2: Clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#F4F0E7]/70">
        <button
          onClick={() => onScrollToSection('map-section')}
          className="hover:text-[#F6C66B] transition-colors whitespace-nowrap shrink-0"
        >
          3D 島嶼地圖
        </button>

        <button
          onClick={() => onScrollToSection('player-section')}
          className="hover:text-[#F6C66B] transition-colors whitespace-nowrap shrink-0"
        >
          即時直播觀景
        </button>

        <button
          onClick={() => onScrollToSection('list-section')}
          className="hover:text-[#F6C66B] transition-colors whitespace-nowrap shrink-0"
        >
          全台景點目錄
        </button>

        <button
          onClick={onOpenEditor}
          className="hover:text-[#F6C66B] transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#49A88B]" />
          <span>鏡頭資料庫</span>
        </button>
      </nav>

      {/* Zone 3: 1 Primary Action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenPassport}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#071B29] bg-[#F6C66B] hover:bg-[#ebbb59] rounded-xl shadow-md transition-all active:scale-95 whitespace-nowrap shrink-0"
        >
          <BookOpen className="w-4 h-4 text-[#071B29]" />
          <span>我的旅行護照</span>
          {totalCheckins > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[#071B29] text-[#F6C66B] text-[10px] font-mono">
              {totalCheckins}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
