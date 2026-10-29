/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CameraItem, Attraction } from '../types/camera';
import camerasJson from './cameras.json';
import attractionsJson from './attractions.json';

export const CAMERAS: CameraItem[] = camerasJson as CameraItem[];
export const ATTRACTIONS: Attraction[] = attractionsJson as Attraction[];

export function getInitialCameras(): CameraItem[] {
  return CAMERAS;
}

export function getInitialAttractions(): Attraction[] {
  return ATTRACTIONS;
}
