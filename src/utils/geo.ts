/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula (WGS-84 sphere approximation).
 * @returns Distance in meters
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's mean radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Format meters to human-readable string (e.g. "320 公尺" or "2.4 公里")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} 公尺`;
  }
  return `${(meters / 1000).toFixed(1)} 公里`;
}

/**
 * Bounds & projection parameters for Taiwan
 * Center: ~23.7° N, 120.95° E
 */
export const TAIWAN_GEO_BOUNDS = {
  centerLat: 23.7,
  centerLng: 120.95,
  minLat: 21.8,
  maxLat: 25.4,
  minLng: 119.5,
  maxLng: 122.2,
  // 3D Scene scale factors
  scaleX: 5.2,
  scaleZ: 5.2,
};

/**
 * Projects real-world Latitude & Longitude into 3D scene world coordinates (X, Z).
 * Note: In Three.js, +X is East, -X is West, -Z is North, +Z is South, +Y is Elevation.
 */
export function projectLatLngTo3D(
  lat: number,
  lng: number,
  elevationOffset = 0
): { x: number; y: number; z: number } {
  const { centerLat, centerLng, scaleX, scaleZ } = TAIWAN_GEO_BOUNDS;

  // Longitudinal distance scaled by cosine of latitude to account for meridian convergence
  const latRad = (centerLat * Math.PI) / 180;
  const x = (lng - centerLng) * Math.cos(latRad) * scaleX;
  const z = -(lat - centerLat) * scaleZ;

  // Approximate terrain elevation in Taiwan based on mountain ridge modeling
  const terrainHeight = getProceduralTerrainHeight(lat, lng);
  const y = terrainHeight + elevationOffset;

  return { x, y, z };
}

/**
 * Authentic 88-point high-resolution coastline polygon of Taiwan main island
 * Accurately tracing capes, harbors, river estuaries, and peninsulas
 */
export const TAIWAN_COAST_POLYGON: [number, number][] = [
  [25.298, 121.535], // Cape Fugui (富貴角)
  [25.250, 121.585], // Shimen / Jinshan (石門金山)
  [25.207, 121.691], // Yehliu (野柳)
  [25.155, 121.755], // Keelung (基隆港)
  [25.140, 121.820], // Badouzih / Shen'ao (八斗子深澳)
  [25.127, 121.918], // Bitou Cape (鼻頭角)
  [25.008, 121.998], // Cape Sandiaojiao (三貂角)
  [25.020, 121.945], // Fulong (福隆)
  [24.965, 121.905], // Dali / Daxi (大里大溪)
  [24.860, 121.835], // Toucheng (頭城)
  [24.715, 121.838], // Yilan / Lanyang estuary (蘭陽溪口)
  [24.595, 121.870], // Suao Port (蘇澳港)
  [24.575, 121.872], // Nanfang'ao (南方澳)
  [24.515, 121.845], // Dong'ao Bay (東澳灣)
  [24.450, 121.815], // Nanao (南澳)
  [24.305, 121.750], // Heping (和平)
  [24.215, 121.685], // Qingshui Cliff (清水斷崖)
  [24.165, 121.655], // Taroko / Chongde (崇德)
  [24.030, 121.635], // Qixingtan (七星潭)
  [23.985, 121.625], // Hualien Port (花蓮港)
  [23.865, 121.605], // Yanliao (鹽寮)
  [23.765, 121.575], // Niushan (牛山)
  [23.595, 121.535], // Fengbin (豐濱)
  [23.490, 121.515], // Shitiping (石梯坪)
  [23.385, 121.465], // Baxiandong / Changbin (長濱)
  [23.125, 121.415], // Sanxiantai (三仙台)
  [23.095, 121.385], // Chenggong (成功)
  [22.875, 121.235], // Dulan (都蘭)
  [22.790, 121.195], // Fugang Port (富岡漁港)
  [22.755, 121.165], // Taitung Beinan River (卑南溪口)
  [22.685, 121.065], // Zhiben (知本)
  [22.610, 121.005], // Taimali (太麻里)
  [22.530, 120.965], // Jialun (金崙)
  [22.345, 120.895], // Dawu (大武)
  [22.250, 120.885], // Daren (達仁)
  [22.195, 120.888], // Xuhai (旭海)
  [22.125, 120.892], // Jiupeng (九棚)
  [21.925, 120.855], // Fengchuisha (風吹砂)
  [21.901, 120.852], // Cape Eluanbi (鵝鑾鼻)
  [21.955, 120.765], // South Bay (南灣)
  [21.920, 120.735], // Maobitou (貓鼻頭)
  [21.995, 120.705], // Baisha / Wanlitong (白砂萬里桐)
  [22.075, 120.705], // Checheng (車城)
  [22.245, 120.655], // Fangshan (枋山)
  [22.365, 120.595], // Fangliao (枋寮)
  [22.425, 120.515], // Linbian (林邊)
  [22.465, 120.445], // Donggang (東港)
  [22.545, 120.355], // Kaohsiung Xiaogang (小港)
  [22.595, 120.275], // Qijin / Kaohsiung Port (旗津高雄港)
  [22.635, 120.260], // Sizihwan / Shoushan (西子灣壽山)
  [22.815, 120.220], // Ziguan / Yongan (梓官永安)
  [22.895, 120.180], // Qieding (茄萣)
  [22.945, 120.170], // Tainan South District (南區)
  [23.000, 120.145], // Anping (安平)
  [23.125, 120.065], // Cigu Lagoon (七股潟湖)
  [23.275, 120.095], // Beimen (北門)
  [23.375, 120.135], // Budai (布袋)
  [23.455, 120.130], // Dongshi (東石)
  [23.575, 120.140], // Kouhu (口湖)
  [23.645, 120.155], // Sihu (四湖)
  [23.705, 120.175], // Taixi (臺西)
  [23.785, 120.215], // Mailiao (麥寮)
  [23.855, 120.265], // Zhuoshui River mouth (濁水溪口)
  [23.885, 120.295], // Dacheng (大城)
  [23.935, 120.315], // Fangyuan (芳苑)
  [23.995, 120.335], // Wanggong (王功)
  [24.065, 120.415], // Lukang (鹿港)
  [24.135, 120.455], // Xianxi (線西)
  [24.265, 120.515], // Taichung Port (台中港)
  [24.315, 120.550], // Gaomei Wetlands (高美濕地)
  [24.395, 120.575], // Dajia Matsu coast (大甲)
  [24.445, 120.635], // Yuanli (苑裡)
  [24.495, 120.675], // Tongxiao (通霄)
  [24.605, 120.735], // Houlong Cape (後龍半天寮)
  [24.695, 120.835], // Zhunan (竹南)
  [24.775, 120.895], // Xiangshan Wetlands (香山濕地)
  [24.850, 120.925], // Nanliao Port (南寮漁港)
  [24.915, 120.975], // Xinfeng (新豐)
  [24.985, 121.025], // Xinwu (新屋)
  [25.045, 121.085], // Guanyin (觀音)
  [25.075, 121.195], // Dayuan (大園)
  [25.120, 121.245], // Zhuwei Port (竹圍漁港)
  [25.135, 121.305], // Linkou (林口)
  [25.155, 121.385], // Bali (八里)
  [25.185, 121.415], // Tamsui River mouth (淡水)
  [25.245, 121.465], // Sanzhi (三芝)
  [25.285, 121.515], // Shimen (石門)
  [25.298, 121.535], // Close loop
];

/**
 * Fast point-in-polygon test (Jordan curve theorem)
 */
export function isPointInTaiwan(lat: number, lng: number): boolean {
  let inside = false;
  const poly = TAIWAN_COAST_POLYGON;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][1], yi = poly[i][0];
    const xj = poly[j][1], yj = poly[j][0];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * High-fidelity procedural elevation of Taiwan matching topographic relief (DEM)
 * Modeled after Taiwan's real geomorphology:
 * - Central Mountain Range (中央山脈): continuous towering spine
 * - Snow Mountain Range (雪山山脈): branching northeast
 * - Jade Mountain Massif (玉山山塊): 3,952m highest peak in East Asia
 * - Alishan Range (阿里山山脈): western forestry foothills
 * - Coastal Mountain Range (海岸山脈): rugged Pacific ridge
 * - Huatung Longitudinal Valley (花東縱谷): narrow tectonic rift depression
 * - Tatun Volcano Group (大屯火山群): northern volcanic peaks
 * - Taipei Basin: tectonic depression
 * - Western alluvial plains: broad gentle slope
 * - Tectonic collision directional ridges (strike ~020°)
 */
export function getProceduralTerrainHeight(lat: number, lng: number): number {
  // Check if within Taiwan main island polygon
  const inside = isPointInTaiwan(lat, lng);
  if (!inside) {
    // Offshore islands check
    // Penghu
    if (Math.hypot(lat - 23.57, lng - 119.58) < 0.25) return 0.08;
    // Green Island (綠島)
    if (Math.hypot(lat - 22.66, lng - 121.49) < 0.08) return 0.16;
    // Orchid Island (蘭嶼)
    if (Math.hypot(lat - 22.05, lng - 121.55) < 0.10) return 0.22;
    // Xiaoliuqiu (小琉球)
    if (Math.hypot(lat - 22.34, lng - 120.37) < 0.05) return 0.07;
    // Guishan Island (龜山島)
    if (Math.hypot(lat - 24.84, lng - 121.95) < 0.06) return 0.18;
    return 0.02; // ocean level
  }

  // 1. Central Mountain Range Spine (中央山脈脊樑)
  // Runs roughly NNE to SSW: lat 22.4 -> 24.6, with spine curve
  const spineLng = 120.96 + (lat - 23.5) * 0.20;
  const distSpine = Math.abs(lng - spineLng);

  // Latitudinal profile along the spine (highest between lat 23.2 and 24.4)
  const spineLatWeight = Math.sin(
    Math.min(Math.max((lat - 22.0) / (24.8 - 22.0), 0), 1) * Math.PI
  );
  const spineFalloff = Math.max(0, 1 - distSpine / 0.52);
  const spineElevation = Math.pow(spineFalloff, 1.6) * spineLatWeight * 0.85;

  // 2. Yushan Massif (玉山主峰 3952m)
  const distYushan = Math.hypot(lat - 23.47, (lng - 120.95) * 1.08);
  const yushanElevation = Math.max(0, 1 - distYushan / 0.22) * 0.42;

  // 3. Xueshan Range (雪山山脈 3886m)
  const distXueshan = Math.hypot(lat - 24.38, (lng - 121.23) * 1.05);
  const xueshanElevation = Math.max(0, 1 - distXueshan / 0.25) * 0.36;

  // 4. Hehuanshan Wuling (合歡山武嶺 3275m)
  const distHehuan = Math.hypot(lat - 24.14, (lng - 121.27) * 1.05);
  const hehuanElevation = Math.max(0, 1 - distHehuan / 0.18) * 0.32;

  // 5. Alishan Range (阿里山山脈 2663m)
  const distAlishan = Math.hypot(lat - 23.51, (lng - 120.78) * 1.15);
  const alishanElevation = Math.max(0, 1 - distAlishan / 0.26) * 0.28;

  // 6. Coastal Mountain Range (海岸山脈) & Huatung Longitudinal Valley (花東縱谷)
  let coastRangeElevation = 0;
  if (lat >= 22.8 && lat <= 24.0) {
    // Coastal range spine along Lng 121.46 ~ 121.52
    const coastRangeLng = 121.46 + (lat - 23.0) * 0.05;
    const distCoastRange = Math.abs(lng - coastRangeLng);
    if (distCoastRange < 0.18) {
      coastRangeElevation = Math.max(0, 1 - distCoastRange / 0.18) * 0.25;
    }
  }

  // Huatung Valley depression between Central Range and Coastal Range
  let valleyTroughFactor = 1.0;
  if (lat >= 22.8 && lat <= 24.0) {
    const valleyLng = 121.32 + (lat - 23.0) * 0.08;
    const distValley = Math.abs(lng - valleyLng);
    if (distValley < 0.10) {
      // Form a narrow alluvial rift trough
      valleyTroughFactor = 0.35 + 0.65 * (distValley / 0.10);
    }
  }

  // 7. Tatun Volcano Group & Yangmingshan (大屯山/七星山/陽明山)
  const distTatun = Math.hypot(lat - 25.18, (lng - 121.55) * 1.1);
  const tatunElevation = Math.max(0, 1 - distTatun / 0.16) * 0.22;

  // 8. Taipei Basin (台北盆地 - 低平盆地)
  let basinFactor = 1.0;
  const distTaipei = Math.hypot(lat - 25.04, (lng - 121.51) * 1.1);
  if (distTaipei < 0.12) {
    basinFactor = 0.2 + 0.8 * (distTaipei / 0.12);
  }

  // 9. Directional Tectonic Ridge Ripples (aligned ~20° strike)
  // Mimics the authentic corrugated mountain folds and river gorges seen in satellite relief
  const rad = (20 * Math.PI) / 180;
  const u = (lng - 120.95) * Math.cos(rad) + (lat - 23.7) * Math.sin(rad);
  const v = -(lng - 120.95) * Math.sin(rad) + (lat - 23.7) * Math.cos(rad);
  const ridgeNoise =
    Math.sin(u * 55.0) * Math.cos(v * 28.0) * 0.045 +
    Math.sin(u * 110.0 + v * 40.0) * 0.025;

  // Combine elevations
  let totalElevation =
    spineElevation +
    yushanElevation +
    xueshanElevation +
    hehuanElevation +
    alishanElevation +
    coastRangeElevation +
    tatunElevation;

  totalElevation *= valleyTroughFactor * basinFactor;
  totalElevation += ridgeNoise * Math.min(totalElevation * 1.8, 1.0);

  // Western plain baseline and coast slope
  const basePlains = 0.04;
  return Math.max(0.04, basePlains + totalElevation);
}

/**
 * Privacy Protection: Truncates GPS coordinates to 3 decimal places (~110m accuracy)
 * Prevents pinpoint user surveillance while remaining accurate for scenic spots.
 */
export function truncateCoordinatesForPrivacy(
  lat: number,
  lng: number
): { approxLat: number; approxLng: number; approxString: string } {
  const approxLat = Math.round(lat * 1000) / 1000;
  const approxLng = Math.round(lng * 1000) / 1000;
  return {
    approxLat,
    approxLng,
    approxString: `${approxLat.toFixed(3)}°N, ${approxLng.toFixed(3)}°E`,
  };
}

/**
 * Security: Prevents Spreadsheet Formula Injection (CSV/Sheet Injection)
 * Escapes values starting with '=', '+', '-', '@'
 */
export function sanitizeForSpreadsheet(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (
    str.startsWith('=') ||
    str.startsWith('+') ||
    str.startsWith('-') ||
    str.startsWith('@') ||
    str.startsWith('\t') ||
    str.startsWith('\r')
  ) {
    return `'${str}`;
  }
  return str;
}
