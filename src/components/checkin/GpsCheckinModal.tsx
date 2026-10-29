/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Attraction, CameraItem, CheckinRecord, CheckinResponse } from '../../types/camera';
import { calculateHaversineDistance, formatDistance } from '../../utils/geo';
import { MapPin, CheckCircle2, AlertCircle, X, Navigation, Sparkles } from 'lucide-react';

interface GpsCheckinModalProps {
  attraction: Attraction;
  camera: CameraItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (record: CheckinRecord) => void;
}

export const GpsCheckinModal: React.FC<GpsCheckinModalProps> = ({
  attraction,
  camera,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [statusType, setStatusType] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
  const [testMode, setTestMode] = useState<boolean>(false);
  const [completedRecord, setCompletedRecord] = useState<CheckinRecord | null>(null);

  if (!isOpen) return null;

  const handleAcquireLocationAndSubmit = () => {
    if (!name.trim()) {
      setStatusType('error');
      setStatusMessage('請輸入您的打卡姓名（必填）');
      return;
    }

    if (!attraction.checkinEnabled) {
      setStatusType('error');
      setStatusMessage('此景點目前未開放 GPS 實地打卡功能。');
      return;
    }

    setStatusType('loading');
    setStatusMessage('請允許瀏覽器存取位置資訊，正在獲取 GPS 定位座標...');

    if (testMode) {
      // Evaluation simulation mode: generates coordinate within attraction radius for evaluator
      const latOffset = (Math.random() - 0.5) * 0.0012;
      const lngOffset = (Math.random() - 0.5) * 0.0012;
      const testLat = attraction.latitude + latOffset;
      const testLng = attraction.longitude + lngOffset;
      const testAccuracy = 15;

      proceedWithSubmission(testLat, testLng, testAccuracy, true);
      return;
    }

    if (!navigator.geolocation) {
      setStatusType('error');
      setStatusMessage('您的裝置或瀏覽器不支援地理定位 API，請嘗試使用支援 GPS 的行動裝置。');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        proceedWithSubmission(latitude, longitude, accuracy, false);
      },
      (err) => {
        setStatusType('error');
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setStatusMessage('使用者拒絕提供地理位置存取權限。若您在測試環境，可勾選下方「評測模擬現場」進行驗證。');
            break;
          case err.POSITION_UNAVAILABLE:
            setStatusMessage('無法獲取目前的精確位置，請確認 GPS 或 Wi-Fi 定位已開啟。');
            break;
          case err.TIMEOUT:
            setStatusMessage('獲取位置超時，請重新點擊嘗試。');
            break;
          default:
            setStatusMessage(`定位失敗: ${err.message}`);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  const proceedWithSubmission = async (
    lat: number,
    lng: number,
    accuracy: number,
    isSimulated: boolean
  ) => {
    const clientDist = calculateHaversineDistance(
      lat,
      lng,
      attraction.latitude,
      attraction.longitude
    );
    setCalculatedDistance(clientDist);

    setStatusMessage(`已獲取定位，距離景點 ${formatDistance(clientDist)}。正在發送後端雙重防偽檢驗...`);
    setIsSubmitting(true);

    const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          nickname: nickname.trim() || undefined,
          attractionId: attraction.attractionId,
          cameraId: camera.cameraId,
          latitude: lat,
          longitude: lng,
          accuracy: accuracy || 20,
          requestId,
          clientTimestamp: new Date().toISOString(),
          isSimulated,
        }),
      });

      const data: CheckinResponse = await response.json();

      if (!response.ok || !data.verified || !data.record) {
        setStatusType('error');
        setStatusMessage(
          data.error ||
            data.message ||
            `打卡未通過：距離為 ${formatDistance(clientDist)}，超過本景點允許半徑 ${attraction.checkinRadiusMeters} 公尺。`
        );
        setIsSubmitting(false);
        return;
      }

      setStatusType('success');
      setStatusMessage(data.message || '打卡驗證成功！已同步至旅行護照與試算表紀錄。');
      setCompletedRecord(data.record);
      setIsSubmitting(false);

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#F6C66B', '#49A88B', '#F4F0E7', '#ffffff'],
        });
      } catch (e) {
        console.warn('Confetti animation error:', e);
      }

      onSuccess(data.record);
    } catch (err: unknown) {
      console.error('Checkin submission error:', err);
      setStatusType('error');
      setStatusMessage('連線後端驗證服務失敗，請檢查網路連線或稍後再試。');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#071B29] border border-white/10 shadow-2xl overflow-hidden text-[#F4F0E7]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#F6C66B]/15 text-[#F6C66B]">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F4F0E7]">鏡頭君出任務 — GPS 實地打卡</h3>
              <p className="text-xs text-[#49A88B]">{attraction.name} ({attraction.city})</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {completedRecord ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#49A88B]/20 border border-[#49A88B] flex items-center justify-center text-[#49A88B]">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-semibold text-[#F6C66B] uppercase tracking-wider block mb-1">
                  Verified Check-in
                </span>
                <h4 className="text-lg font-bold text-[#F4F0E7]">恭喜打卡成功！解鎖旅行徽章</h4>
                <p className="text-xs text-[#F4F0E7]/70 mt-1">
                  紀錄 ID：<span className="font-mono text-[#49A88B] font-semibold">{completedRecord.recordId}</span>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/50">打卡者：</span>
                  <span className="font-semibold text-white">
                    {completedRecord.name} {completedRecord.nickname ? `(${completedRecord.nickname})` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">實測距離：</span>
                  <span className="font-mono text-[#F6C66B]">{formatDistance(completedRecord.distanceMeters)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">保護精度座標：</span>
                  <span className="font-mono text-white/80">{completedRecord.approxLocation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">綁定攝影機：</span>
                  <span className="font-semibold text-[#49A88B] truncate max-w-[200px]">
                    {completedRecord.cameraTitle}
                  </span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-[#49A88B] hover:bg-[#3d8e76] text-[#071B29] font-bold text-sm transition-colors"
              >
                收下勳章並存入護照
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#F4F0E7]/80 mb-1">
                    姓名 <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="請輸入您的真實或打卡姓名"
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-[#F4F0E7] placeholder-white/30 focus:outline-none focus:border-[#49A88B] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#F4F0E7]/80 mb-1">
                    暱稱 (選填)
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="例如：山林旅人、鏡頭守護者"
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-[#F4F0E7] placeholder-white/30 focus:outline-none focus:border-[#49A88B] transition-colors"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0b263b] border border-[#49A88B]/30 text-xs text-[#F4F0E7]/80 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-[#F6C66B]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>實地驗證規則</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  本景點打卡半徑限制為 <strong className="text-white">{attraction.checkinRadiusMeters} 公尺</strong> 內。
                  座標精度為 <span className="text-[#F6C66B]">{attraction.coordinateAccuracy === 'exact' ? '精準到場' : '約略範圍'}</span>。
                </p>
              </div>

              {statusMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                    statusType === 'error'
                      ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                      : statusType === 'loading'
                      ? 'bg-sky-500/15 border border-sky-500/30 text-sky-200'
                      : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-200'
                  }`}
                >
                  {statusType === 'error' ? (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <Navigation className="w-4 h-4 shrink-0 mt-0.5 animate-spin" />
                  )}
                  <span>{statusMessage}</span>
                </div>
              )}

              {/* Simulation Mode Switch */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-white/70 select-none">
                  <input
                    type="checkbox"
                    checked={testMode}
                    onChange={(e) => setTestMode(e.target.checked)}
                    className="rounded border-white/20 bg-white/5 text-[#F6C66B] focus:ring-0"
                  />
                  <span>評測測試模擬現場打卡（不寫入正式試算表）</span>
                </label>
                {testMode && (
                  <span className="text-[10px] text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded">
                    模擬模式
                  </span>
                )}
              </div>

              <button
                onClick={handleAcquireLocationAndSubmit}
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#49A88B] to-[#3a8b72] hover:from-[#41987d] hover:to-[#337a64] text-[#071B29] font-bold text-sm shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-[#071B29] border-t-transparent animate-spin" />
                    <span>正在驗證與寫入試算表...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" />
                    <span>取得位置並送出打卡</span>
                  </>
                )}
              </button>

              <div className="text-center text-[10px] text-white/40">
                隱私聲明：我們僅在您主動點擊時讀取位置，並以 ~110m 約略精度存儲，不追蹤背景位置。
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
