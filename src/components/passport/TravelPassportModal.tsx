/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Attraction, CameraItem, TravelerProfile } from '../../types/camera';
import { formatDistance } from '../../utils/geo';
import { Award, BookOpen, Trash2, Download, Check, Shield, MapPin, Calendar, Compass, X } from 'lucide-react';

interface TravelPassportModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: TravelerProfile;
  attractions: Attraction[];
  camerasMap: Map<string, CameraItem>;
  onClearProfile: () => void;
}

export const TravelPassportModal: React.FC<TravelPassportModalProps> = ({
  isOpen,
  onClose,
  profile,
  attractions,
  camerasMap,
  onClearProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'stamps' | 'history' | 'privacy'>('stamps');
  const [copiedId, setCopiedId] = useState(false);

  if (!isOpen) return null;

  const totalCheckins = profile.checkins.length;
  const uniqueAttractionsVisited = new Set(profile.checkins.map((c) => c.attractionId)).size;
  const exploredRegions = new Set(profile.checkins.map((c) => c.region));

  const getExplorerRank = (count: number) => {
    if (count >= 10) return { title: '台灣鏡頭君傳奇守護者', level: 4, color: 'text-amber-400' };
    if (count >= 5) return { title: '山海縱走先鋒巡護員', level: 3, color: 'text-emerald-400' };
    if (count >= 2) return { title: '島嶼踏青探險家', level: 2, color: 'text-sky-400' };
    if (count >= 1) return { title: '鏡頭見證初行者', level: 1, color: 'text-teal-300' };
    return { title: '旅途整備中', level: 0, color: 'text-white/50' };
  };

  const rank = getExplorerRank(totalCheckins);

  const handleCopyTravelerId = () => {
    navigator.clipboard.writeText(profile.userId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(profile, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `taiwan-passport-${profile.userId.slice(0, 8)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getLandmarkEmoji = (type: string) => {
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
        return '📷';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-[#071B29] border border-white/10 shadow-2xl overflow-hidden text-[#F4F0E7]">
        {/* Passport Cover Header */}
        <div className="relative p-6 sm:p-8 bg-gradient-to-r from-[#0b2438] via-[#0d2a42] to-[#071B29] border-b border-white/10">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F6C66B] to-[#d69f3d] text-[#071B29] font-black text-2xl flex items-center justify-center shadow-lg border-2 border-white/20">
                🇹🇼
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold tracking-widest text-[#F6C66B] uppercase">
                    Republic of Formosa Passport
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#F4F0E7] tracking-tight">
                  我的台灣鏡頭旅行護照
                </h2>
                <div className="flex items-center gap-2 text-xs text-white/60 mt-1">
                  <span>專屬旅行識別碼:</span>
                  <button
                    onClick={handleCopyTravelerId}
                    className="font-mono text-[#49A88B] hover:underline flex items-center gap-1"
                    title="點擊複製唯一代碼"
                  >
                    <span>{profile.userId.slice(0, 12)}...</span>
                    {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : null}
                  </button>
                </div>
              </div>
            </div>

            <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
              <Award className="w-6 h-6 text-[#F6C66B]" />
              <div>
                <span className="text-[10px] text-white/50 block">探索位階</span>
                <span className={`text-sm font-bold ${rank.color}`}>{rank.title}</span>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/10 text-center">
            <div className="p-2.5 rounded-xl bg-white/5">
              <span className="text-xl sm:text-2xl font-black text-[#F6C66B] font-mono block">
                {totalCheckins}
              </span>
              <span className="text-[11px] text-white/60">實地打卡次數</span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/5">
              <span className="text-xl sm:text-2xl font-black text-[#49A88B] font-mono block">
                {uniqueAttractionsVisited} / {attractions.length}
              </span>
              <span className="text-[11px] text-white/60">解鎖認證景點</span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/5">
              <span className="text-xl sm:text-2xl font-black text-[#F4F0E7] font-mono block">
                {exploredRegions.size} / 5
              </span>
              <span className="text-[11px] text-white/60">踏足分區 (北/中/南/東/島)</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-white/10 px-6 bg-white/5">
          <button
            onClick={() => setActiveTab('stamps')}
            className={`py-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'stamps'
                ? 'border-[#F6C66B] text-[#F6C66B]'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>旅行印章冊 ({uniqueAttractionsVisited})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-[#F6C66B] text-[#F6C66B]'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>打卡歷史紀錄 ({totalCheckins})</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`py-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'privacy'
                ? 'border-[#F6C66B] text-[#F6C66B]'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>隱私與安全管理</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'stamps' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {attractions.map((attr) => {
                const isUnlocked = profile.checkins.some((c) => c.attractionId === attr.attractionId);
                const unlockRecord = profile.checkins.find((c) => c.attractionId === attr.attractionId);

                return (
                  <div
                    key={attr.attractionId}
                    className={`p-4 rounded-2xl border text-center transition-all ${
                      isUnlocked
                        ? 'bg-gradient-to-b from-[#0e2c3d] to-[#092233] border-[#F6C66B]/40 shadow-lg'
                        : 'bg-white/5 border-white/5 opacity-50 grayscale'
                    }`}
                  >
                    <div className="w-12 h-12 mx-auto rounded-full bg-white/10 flex items-center justify-center text-2xl mb-2.5 shadow-inner">
                      {getLandmarkEmoji(attr.landmarkType)}
                    </div>
                    <h5 className="text-xs font-bold text-[#F4F0E7] line-clamp-1">{attr.name}</h5>
                    <p className="text-[10px] text-[#F6C66B] font-semibold mt-0.5">{attr.city}</p>
                    <div className="mt-2 text-[9px] text-white/50">
                      {isUnlocked && unlockRecord ? (
                        <span className="text-[#49A88B] font-mono">
                          {new Date(unlockRecord.timestamp).toLocaleDateString()} 蓋章
                        </span>
                      ) : (
                        <span>未解鎖 · 需實地打卡</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {profile.checkins.length === 0 ? (
                <div className="py-12 text-center text-white/50">
                  <Compass className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">尚未有任何實地打卡紀錄</p>
                  <p className="text-xs text-white/40 mt-1">
                    前往地圖選擇認證景點，點擊「實地 GPS 打卡」即可獲得專屬旅行勳章！
                  </p>
                </div>
              ) : (
                profile.checkins.map((rec) => (
                  <div
                    key={rec.recordId}
                    className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-[#F4F0E7]">{rec.attractionName}</span>
                        <span className="px-2 py-0.5 rounded bg-[#49A88B]/20 text-[#49A88B] text-[10px] font-semibold">
                          雙重驗證通過
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-white/60 text-[11px]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(rec.timestamp).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          實測距離: {formatDistance(rec.distanceMeters)}
                        </span>
                        <span className="font-mono text-white/40">ID: {rec.recordId}</span>
                      </div>
                      <div className="text-[10px] text-white/50 mt-1">
                        鏡頭: {rec.cameraTitle}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-semibold text-[#F6C66B]">
                        {rec.name} {rec.nickname ? `(${rec.nickname})` : ''}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-5 text-xs text-[#F4F0E7]/80 leading-relaxed">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <h4 className="font-bold text-sm text-[#F6C66B] flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>隱私防護與安全架構</span>
                </h4>
                <ul className="list-disc list-inside space-y-1.5 text-white/70">
                  <li><strong>直播中斷保護：</strong>即使 YouTube 直播暫時下線或更換網址，您的旅行歷史打卡紀錄仍完整保留。</li>
                  <li><strong>僅限主動觸發：</strong>絕不在背景追蹤您的 GPS 定位，唯有點選打卡確認後才執行單次座標讀取。</li>
                  <li><strong>防範假資料入雲端：</strong>評測模擬模式下的測試座標不會寫入正式 Google Sheets 試算表。</li>
                  <li><strong>獨立身份隔離：</strong>護照資料綁定隨機金鑰，他人無法僅憑姓名任意翻閱您的打卡歷程。</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handleExportJson}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>匯出我的護照資料 (JSON)</span>
                </button>

                <button
                  onClick={() => {
                    if (window.confirm('確定要清除本機所有打卡護照紀錄嗎？此動作無法復原。')) {
                      onClearProfile();
                    }
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-semibold transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>清除本機隱私資料與護照</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
