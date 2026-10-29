/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, Heart, ExternalLink } from 'lucide-react';

interface FooterProps {
  onOpenPassport: () => void;
  onOpenEditor: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenPassport, onOpenEditor }) => {
  return (
    <footer className="w-full bg-[#05141e] border-t border-white/10 text-white/60 py-10 px-6 sm:px-12 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start justify-between gap-8">
        <div className="space-y-3 max-w-md">
          <div className="flex items-center gap-2">
            <span className="text-xl">📸</span>
            <span className="font-bold text-sm text-[#F4F0E7]">找找台灣鏡頭君</span>
            <span className="text-[10px] text-[#49A88B] font-mono">Taiwan Live Cam Explorer</span>
          </div>
          <p className="text-white/60 text-xs leading-relaxed">
            致敬默默守候在台灣高山、海岸、港灣與國家公園的即時攝影機「鏡頭君」。
            本站結合 3D 互動島嶼地圖、YouTube 官方觀光影像與 GPS 雙重防偽打卡系統，陪伴旅人探索福爾摩沙之美。
          </p>
          <div className="flex items-center gap-2 text-[11px] text-[#49A88B]">
            <ShieldCheck className="w-4 h-4" />
            <span>遵守個人資料保護法 · 不儲存高精度座標 · 嚴格防範公式注入</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          <div>
            <h5 className="font-bold text-white mb-2.5">影像授權來源</h5>
            <ul className="space-y-1.5 text-white/60">
              <li>交通部觀光署</li>
              <li>東部海岸國家風景區</li>
              <li>阿里山國家風景區</li>
              <li>日月潭國家風景區</li>
              <li>太魯閣國家公園</li>
              <li>台北市政府觀傳局</li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold text-white mb-2.5">系統與工具</h5>
            <ul className="space-y-1.5 text-white/60">
              <li>
                <button onClick={onOpenPassport} className="hover:text-[#F6C66B] transition-colors">
                  我的旅行護照
                </button>
              </li>
              <li>
                <button onClick={onOpenEditor} className="hover:text-[#F6C66B] transition-colors">
                  攝影機資料管理
                </button>
              </li>
              <li>
                <a
                  href="https://www.youtube.com/playlist?list=PLPHAdGv_-C_60UemaeORmThSvCPluiTtv"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#F6C66B] transition-colors flex items-center gap-1"
                >
                  <span>YouTube 播放清單</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold text-white mb-2.5">開源架構</h5>
            <ul className="space-y-1.5 text-white/60">
              <li>React 19 + TypeScript</li>
              <li>Three.js 3D 地形演算</li>
              <li>Google Apps Script 後端</li>
              <li>GitHub Pages 自動部署</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-white/40">
        <div>
          © {new Date().getFullYear()} 找找台灣鏡頭君. All stream copyrights belong to respective agencies.
        </div>
        <div className="flex items-center gap-1">
          <span>Made for Taiwan Explorers</span>
          <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
        </div>
      </div>
    </footer>
  );
};
