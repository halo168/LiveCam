/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RegionKey = 'north' | 'central' | 'south' | 'east' | 'islands';

export type StreamStatus = 'live' | 'upcoming' | 'standby' | 'offline' | 'unknown';

export type LandmarkType =
  | 'city'
  | 'mountain'
  | 'coast'
  | 'port'
  | 'lake'
  | 'temple'
  | 'station'
  | 'other';

export type CoordinateAccuracy = 'exact' | 'approximate';

/**
 * Camera item extracted directly from the designated YouTube playlist
 */
export interface CameraItem {
  cameraId: string;
  videoId: string;
  playlistItemId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  streamStatus: StreamStatus;
  embeddable: boolean;
  videoUrl: string;
  lastCheckedAt: string;
  attractionId: string | null;
}

export type CameraSpot = CameraItem;

/**
 * Scenic attraction clustered from verified live cameras
 */
export interface Attraction {
  attractionId: string;
  name: string;
  city: string;
  region: RegionKey;
  latitude: number;
  longitude: number;
  coordinateSource: string;
  coordinateAccuracy: CoordinateAccuracy;
  landmarkType: LandmarkType;
  cameraIds: string[];
  checkinEnabled: boolean;
  checkinRadiusMeters: number;
}

export interface CheckinSubmission {
  name: string;
  nickname?: string;
  attractionId: string;
  cameraId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  requestId: string;
  clientTimestamp: string;
  isSimulated?: boolean;
}

export interface CheckinRecord {
  recordId: string;
  timestamp: string;
  name: string;
  nickname?: string;
  attractionId: string;
  attractionName: string;
  cameraId: string;
  cameraTitle: string;
  region: RegionKey;
  approxLocation: string;
  accuracy: number;
  distanceMeters: number;
  requestId: string;
  verified: boolean;
}

export interface CheckinResponse {
  success: boolean;
  verified: boolean;
  recordId?: string;
  message: string;
  distanceMeters?: number;
  allowedRadius?: number;
  timestamp?: string;
  record?: CheckinRecord;
  error?: string;
}

export interface TravelerProfile {
  userId: string;
  displayName: string;
  nickname: string;
  firstJoined: string;
  checkins: CheckinRecord[];
  unlockedAttractionIds: string[];
}

export interface SyncStats {
  totalPlaylistVideos: number;
  liveConfirmedCount: number;
  embeddableCount: number;
  geocodedAttractionsCount: number;
  pendingGeocodeCount: number;
  offlineCount: number;
  lastSyncTime: string;
}
