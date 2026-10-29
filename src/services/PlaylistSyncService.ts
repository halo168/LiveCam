/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CameraItem, Attraction, SyncStats } from '../types/camera';

export const TARGET_PLAYLIST_ID = 'PLPHAdGv_-C_60UemaeORmThSvCPluiTtv';
export const TARGET_PLAYLIST_URL = `https://www.youtube.com/playlist?list=${TARGET_PLAYLIST_ID}`;

/**
 * PlaylistSyncService: Handles YouTube Data API v3 sync on backend/node,
 * with pagination, videos.list live verification, fallback preservation,
 * and geocoding into attractions.
 */
export class PlaylistSyncService {
  /**
   * Performs real YouTube Data API v3 synchronization
   * @param apiKey YouTube Data API v3 Key
   */
  public static async syncFromYouTubeApi(apiKey: string): Promise<{
    cameras: CameraItem[];
    stats: SyncStats;
  }> {
    if (!apiKey) {
      throw new Error('未提供 YOUTUBE_API_KEY。請於伺服器環境變數或管理員後台輸入金鑰。');
    }

    const playlistItems: any[] = [];
    let nextPageToken: string | undefined = undefined;

    // 1. Fetch playlist items with full pagination
    do {
      const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
      url.searchParams.set('part', 'snippet,status,contentDetails');
      url.searchParams.set('maxResults', '50');
      url.searchParams.set('playlistId', TARGET_PLAYLIST_ID);
      url.searchParams.set('key', apiKey);
      if (nextPageToken) {
        url.searchParams.set('pageToken', nextPageToken);
      }

      const res = await fetch(url.toString());
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`YouTube playlistItems API 錯誤 (${res.status}): ${errorText}`);
      }

      const data = await res.json();
      if (Array.isArray(data.items)) {
        playlistItems.push(...data.items);
      }
      nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    // Extract video IDs (batches of 50 for videos.list)
    const videoIds = playlistItems
      .map((item) => item.contentDetails?.videoId || item.snippet?.resourceId?.videoId)
      .filter(Boolean);

    // 2. Fetch video details via videos.list to check liveStreamingDetails, status, embeddable
    const videoDetailsMap = new Map<string, any>();
    for (let i = 0; i < videoIds.length; i += 50) {
      const batchIds = videoIds.slice(i, i + 50);
      const videoUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
      videoUrl.searchParams.set('part', 'snippet,status,liveStreamingDetails,contentDetails');
      videoUrl.searchParams.set('id', batchIds.join(','));
      videoUrl.searchParams.set('key', apiKey);

      const videoRes = await fetch(videoUrl.toString());
      if (videoRes.ok) {
        const videoData = await videoRes.json();
        if (Array.isArray(videoData.items)) {
          videoData.items.forEach((v: any) => videoDetailsMap.set(v.id, v));
        }
      }
    }

    // 3. Assemble camera items with strict live & embeddability separation
    const cameras: CameraItem[] = playlistItems.map((item, idx) => {
      const vid = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
      const details = videoDetailsMap.get(vid);

      const title = details?.snippet?.title || item.snippet?.title || `鏡頭 [${vid}]`;
      const description = details?.snippet?.description || item.snippet?.description || '';
      const thumb =
        details?.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.high?.url ||
        `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;

      // Live verification: only liveBroadcastContent === 'live' or active liveStreamingDetails
      const isLiveBroadcast = details?.snippet?.liveBroadcastContent === 'live';
      const hasActiveStream = Boolean(
        details?.liveStreamingDetails?.actualStartTime && !details?.liveStreamingDetails?.actualEndTime
      );
      const isLive = isLiveBroadcast || hasActiveStream;

      // Embeddability verification
      const isEmbeddable = details?.status?.embeddable !== false;

      return {
        cameraId: `cam-${vid}`,
        videoId: vid,
        playlistItemId: item.id || `pl-item-${idx + 1}`,
        title,
        description,
        thumbnailUrl: thumb,
        streamStatus: isLive ? 'live' : 'standby',
        embeddable: isEmbeddable,
        videoUrl: `https://www.youtube.com/watch?v=${vid}`,
        lastCheckedAt: new Date().toISOString(),
        attractionId: null, // assigned by geocoder
      };
    });

    const stats: SyncStats = {
      totalPlaylistVideos: cameras.length,
      liveConfirmedCount: cameras.filter((c) => c.streamStatus === 'live').length,
      embeddableCount: cameras.filter((c) => c.embeddable).length,
      geocodedAttractionsCount: 0,
      pendingGeocodeCount: cameras.length,
      offlineCount: cameras.filter((c) => c.streamStatus === 'offline').length,
      lastSyncTime: new Date().toISOString(),
    };

    return { cameras, stats };
  }

  /**
   * Computes statistics from loaded cameras and attractions
   */
  public static computeStats(cameras: CameraItem[], attractions: Attraction[]): SyncStats {
    const liveConfirmedCount = cameras.filter((c) => c.streamStatus === 'live').length;
    const embeddableCount = cameras.filter((c) => c.embeddable).length;
    const geocodedCameraCount = cameras.filter((c) => c.attractionId !== null).length;
    const pendingGeocodeCount = cameras.length - geocodedCameraCount;
    const offlineCount = cameras.filter((c) => c.streamStatus === 'offline').length;

    const latestCheck = cameras.reduce((latest, c) => {
      return c.lastCheckedAt > latest ? c.lastCheckedAt : latest;
    }, cameras[0]?.lastCheckedAt || new Date().toISOString());

    return {
      totalPlaylistVideos: cameras.length,
      liveConfirmedCount,
      embeddableCount,
      geocodedAttractionsCount: attractions.length,
      pendingGeocodeCount,
      offlineCount,
      lastSyncTime: latestCheck,
    };
  }
}
