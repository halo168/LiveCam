/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Attraction, CameraItem } from '../../types/camera';
import {
  projectLatLngTo3D,
  getProceduralTerrainHeight,
  isPointInTaiwan,
  TAIWAN_COAST_POLYGON,
  TAIWAN_GEO_BOUNDS,
} from '../../utils/geo';
import { TaiwanSvgMap } from './TaiwanSvgMap';
import {
  Sun,
  Sunset,
  Moon,
  ArrowUp,
  ArrowDown,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Compass,
} from 'lucide-react';

export type LightingMode = 'day' | 'sunset' | 'night';

interface Taiwan3DMapProps {
  attractions: Attraction[];
  camerasMap: Map<string, CameraItem>;
  selectedAttractionId: string | null;
  onSelectAttraction: (attraction: Attraction) => void;
  is2DView: boolean;
  onToggle2D: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Module-level reusable math objects for 60fps zero GC
const _raycaster = new THREE.Raycaster();
const _mouse = new THREE.Vector2();
const _targetPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _tempVec3 = new THREE.Vector3();
const _colorA = new THREE.Color();
const _colorB = new THREE.Color();

export const Taiwan3DMap: React.FC<Taiwan3DMapProps> = ({
  attractions,
  camerasMap,
  selectedAttractionId,
  onSelectAttraction,
  is2DView,
  onToggle2D,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [lightingMode, setLightingMode] = useState<LightingMode>('day');
  const [hoveredAttraction, setHoveredAttraction] = useState<Attraction | null>(null);
  const [hasWebGlError, setHasWebGlError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const pinMeshesRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const oceanMeshRef = useRef<THREE.Mesh | null>(null);
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);
  const ambientLightRef = useRef<THREE.HemisphereLight | null>(null);
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);

  const is2DRef = useRef(is2DView);
  const selectedAttractionIdRef = useRef(selectedAttractionId);
  const lightingModeRef = useRef(lightingMode);

  is2DRef.current = is2DView;
  selectedAttractionIdRef.current = selectedAttractionId;
  lightingModeRef.current = lightingMode;

  // Atmosphere & Lighting Mode updates
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (lightingMode === 'day') {
      // 日間清朗: Slate-teal ocean matching image_6cd56aad.png, crisp natural sunlight
      scene.background = new THREE.Color(0x386877);
      scene.fog = new THREE.FogExp2(0x386877, 0.022);
      if (oceanMeshRef.current) {
        (oceanMeshRef.current.material as THREE.MeshStandardMaterial).color.setHex(0x356574);
        (oceanMeshRef.current.material as THREE.MeshStandardMaterial).roughness = 0.35;
      }
      if (ambientLightRef.current) {
        ambientLightRef.current.color.setHex(0xd0edf8);
        ambientLightRef.current.groundColor.setHex(0x285663);
        ambientLightRef.current.intensity = 1.25;
      }
      if (keyLightRef.current) {
        keyLightRef.current.color.setHex(0xfff8eb);
        keyLightRef.current.intensity = 2.6;
        keyLightRef.current.position.set(-8, 14, 5); // WNW sun casting shadows eastward
      }
    } else if (lightingMode === 'sunset') {
      // 金黃夕陽: Warm amber ocean, sunset glow
      scene.background = new THREE.Color(0x753a1a);
      scene.fog = new THREE.FogExp2(0x753a1a, 0.028);
      if (oceanMeshRef.current) {
        (oceanMeshRef.current.material as THREE.MeshStandardMaterial).color.setHex(0x5a2912);
        (oceanMeshRef.current.material as THREE.MeshStandardMaterial).roughness = 0.3;
      }
      if (ambientLightRef.current) {
        ambientLightRef.current.color.setHex(0xfad3a0);
        ambientLightRef.current.groundColor.setHex(0x5a2912);
        ambientLightRef.current.intensity = 1.1;
      }
      if (keyLightRef.current) {
        keyLightRef.current.color.setHex(0xff8c2b);
        keyLightRef.current.intensity = 2.9;
        keyLightRef.current.position.set(-11, 8, 4);
      }
    } else {
      // 璀璨夜景: Dark navy ocean, cyber-glowing night theme
      scene.background = new THREE.Color(0x061521);
      scene.fog = new THREE.FogExp2(0x061521, 0.038);
      if (oceanMeshRef.current) {
        (oceanMeshRef.current.material as THREE.MeshStandardMaterial).color.setHex(0x071b29);
        (oceanMeshRef.current.material as THREE.MeshStandardMaterial).roughness = 0.5;
      }
      if (ambientLightRef.current) {
        ambientLightRef.current.color.setHex(0x286e7a);
        ambientLightRef.current.groundColor.setHex(0x040e17);
        ambientLightRef.current.intensity = 0.7;
      }
      if (keyLightRef.current) {
        keyLightRef.current.color.setHex(0x49a88b);
        keyLightRef.current.intensity = 1.4;
        keyLightRef.current.position.set(-6, 12, 6);
      }
    }
  }, [lightingMode]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect Software WebGL
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch (err) {
      console.warn('WebGL init failed, switching to SVG fallback:', err);
      setHasWebGlError(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x386877);
    scene.fog = new THREE.FogExp2(0x386877, 0.022);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    // Camera angle matching reference image (tilted perspective with full island view)
    camera.position.set(0, 10.5, 10.5);
    cameraRef.current = camera;

    // 改為綁定 container，能完整接收滑鼠滾輪與手機雙指捏合手勢
    const controls = new OrbitControls(camera, container);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;        // 提高阻尼滑順感
    controls.enableZoom = true;           // 明確啟用滾輪/雙指縮放
    controls.zoomSpeed = 1.2;             // 提升滾輪縮放靈敏度
    controls.enablePan = true;            // 允許右鍵/雙指平移，操作更自由
    controls.panSpeed = 0.8;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 2.0;           // 放寬最近距離，讓放大倍率更大
    controls.maxDistance = 35.0;          // 放寬最遠距離，可縮至更小
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Procedural Studio Environment for realistic PBR reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Lighting Rig matching image_6cd56aad.png (Sun from WNW, cool ambient fill)
    const ambientLight = new THREE.HemisphereLight(0xd0edf8, 0x285663, 1.25);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const keyLight = new THREE.DirectionalLight(0xfff8eb, 2.6);
    keyLight.position.set(-8, 14, 5); // West-Northwest sun
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.left = -6;
      keyLight.shadow.camera.right = 6;
      keyLight.shadow.camera.top = 8;
      keyLight.shadow.camera.bottom = -8;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 30;
      keyLight.shadow.bias = -0.0004;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);
    keyLightRef.current = keyLight;

    const rimLight = new THREE.DirectionalLight(0x45a588, 0.9);
    rimLight.position.set(9, 8, -6);
    scene.add(rimLight);

    // --- CONTINUOUS OCEAN SURFACE ---
    const oceanGeo = new THREE.CylinderGeometry(13.5, 13.5, 0.15, 64);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x356574,
      roughness: 0.35,
      metalness: 0.3,
    });
    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.position.y = -0.32;
    oceanMesh.receiveShadow = true;
    scene.add(oceanMesh);
    oceanMeshRef.current = oceanMesh;

    // --- 3D TOPOGRAPHIC TAIWAN RELIEF TERRAIN MESH (MATCHING image_6cd56aad.png) ---
    const terrainGroup = new THREE.Group();
    scene.add(terrainGroup);

    // We build a dense elevation relief grid covering Taiwan's geographic bounds
    const cols = 100; // longitude divisions
    const rows = 180; // latitude divisions

    const minLat = 21.85;
    const maxLat = 25.32;
    const minLng = 120.00;
    const maxLng = 122.05;

    const vertices: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    // Helper color palette matching image_6cd56aad.png
    const cDeepOcean = new THREE.Color(0x285666);
    const cCoastEdge = new THREE.Color(0x4a927a);
    const cPlainsGreen = new THREE.Color(0x65aa81);   // Lush Western plains emerald
    const cMidOchre = new THREE.Color(0xbfa058);      // Foothills warm golden ochre
    const cHighTerracotta = new THREE.Color(0xcc692e); // Mountain ridges copper orange
    const cSummitAmber = new THREE.Color(0xdd823c);   // High peaks sunlit crest

    const gridVertexIndex: number[][] = [];

    for (let r = 0; r <= rows; r++) {
      gridVertexIndex[r] = [];
      const vRatio = r / rows;
      const lat = maxLat - vRatio * (maxLat - minLat); // from North (top) to South (bottom)

      for (let c = 0; c <= cols; c++) {
        const uRatio = c / cols;
        const lng = minLng + uRatio * (maxLng - minLng); // from West to East

        const inside = isPointInTaiwan(lat, lng);
        const { x, z } = projectLatLngTo3D(lat, lng, 0);

        let y = -0.26; // base ocean shelf
        const vertexColor = new THREE.Color();

        if (inside) {
          const elev = getProceduralTerrainHeight(lat, lng);
          y = elev;

          // Color calculation according to elevation height
          if (elev < 0.12) {
            // Coastal plain (0.04 to 0.12)
            const t = Math.max(0, (elev - 0.04) / 0.08);
            vertexColor.copy(cCoastEdge).lerp(cPlainsGreen, t);
          } else if (elev < 0.42) {
            // Foothills and Alishan slopes (0.12 to 0.42)
            const t = (elev - 0.12) / 0.30;
            vertexColor.copy(cPlainsGreen).lerp(cMidOchre, t);
          } else if (elev < 0.82) {
            // Mountain spine (0.42 to 0.82)
            const t = (elev - 0.42) / 0.40;
            vertexColor.copy(cMidOchre).lerp(cHighTerracotta, t);
          } else {
            // Highest summits (Yushan, Xueshan, Central spine)
            const t = Math.min(1, (elev - 0.82) / 0.45);
            vertexColor.copy(cHighTerracotta).lerp(cSummitAmber, t);
          }
        } else {
          // Outside land polygon: subtle ocean shelf color
          vertexColor.copy(cDeepOcean);
        }

        const vIdx = vertices.length / 3;
        gridVertexIndex[r][c] = vIdx;

        vertices.push(x, y, z);
        colors.push(vertexColor.r, vertexColor.g, vertexColor.b);
      }
    }

    // Generate indices only for cells containing land
    for (let r = 0; r < rows; r++) {
      const lat = maxLat - (r / rows) * (maxLat - minLat);
      for (let c = 0; c < cols; c++) {
        const lng = minLng + (c / cols) * (maxLng - minLng);

        // Check if any corner of the quad is on land
        const i00 = gridVertexIndex[r][c];
        const i01 = gridVertexIndex[r][c + 1];
        const i10 = gridVertexIndex[r + 1][c];
        const i11 = gridVertexIndex[r + 1][c + 1];

        const y00 = vertices[i00 * 3 + 1];
        const y01 = vertices[i01 * 3 + 1];
        const y10 = vertices[i10 * 3 + 1];
        const y11 = vertices[i11 * 3 + 1];

        const hasLand = y00 > -0.2 || y01 > -0.2 || y10 > -0.2 || y11 > -0.2;
        if (hasLand) {
          // Two triangles for quad
          indices.push(i00, i10, i01);
          indices.push(i01, i10, i11);
        }
      }
    }

    const terrainGeo = new THREE.BufferGeometry();
    terrainGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    terrainGeo.setIndex(indices);
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.76,
      metalness: 0.12,
      flatShading: false,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = !isSoftwareGl;
    terrainMesh.castShadow = !isSoftwareGl;
    terrainGroup.add(terrainMesh);
    terrainMeshRef.current = terrainMesh;

    // --- ACCURATE COASTLINE CLIFF SKIRT (BEVEL TO OCEAN) ---
    // Connects the 88-point coastline smoothly down to the ocean bed
    const skirtGeo = new THREE.BufferGeometry();
    const skirtVerts: number[] = [];
    const skirtColors: number[] = [];

    const poly = TAIWAN_COAST_POLYGON;
    for (let i = 0; i < poly.length - 1; i++) {
      const [lat1, lng1] = poly[i];
      const [lat2, lng2] = poly[i + 1];

      const p1Top = projectLatLngTo3D(lat1, lng1, 0);
      const p2Top = projectLatLngTo3D(lat2, lng2, 0);
      const topY1 = Math.max(0.04, p1Top.y);
      const topY2 = Math.max(0.04, p2Top.y);
      const bottomY = -0.32;

      // Triangle 1
      skirtVerts.push(p1Top.x, topY1, p1Top.z);
      skirtVerts.push(p1Top.x, bottomY, p1Top.z);
      skirtVerts.push(p2Top.x, topY2, p2Top.z);

      // Triangle 2
      skirtVerts.push(p2Top.x, topY2, p2Top.z);
      skirtVerts.push(p1Top.x, bottomY, p1Top.z);
      skirtVerts.push(p2Top.x, bottomY, p2Top.z);

      for (let k = 0; k < 6; k++) {
        skirtColors.push(cCoastEdge.r * 0.7, cCoastEdge.g * 0.7, cCoastEdge.b * 0.7);
      }
    }

    skirtGeo.setAttribute('position', new THREE.Float32BufferAttribute(skirtVerts, 3));
    skirtGeo.setAttribute('color', new THREE.Float32BufferAttribute(skirtColors, 3));
    skirtGeo.computeVertexNormals();

    const skirtMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.1,
    });
    const skirtMesh = new THREE.Mesh(skirtGeo, skirtMat);
    skirtMesh.receiveShadow = !isSoftwareGl;
    terrainGroup.add(skirtMesh);

    // --- OFFSHORE ISLANDS WITH ACCURATE SHAPE & ELEVATION ---
    const createOffshoreIslet = (
      name: string,
      lat: number,
      lng: number,
      radius: number,
      height: number
    ) => {
      const { x, z } = projectLatLngTo3D(lat, lng);
      const isletGroup = new THREE.Group();
      isletGroup.position.set(x, 0, z);

      const isletGeo = new THREE.ConeGeometry(radius, height, 7);
      const isletMat = new THREE.MeshStandardMaterial({
        color: 0x58a87d,
        roughness: 0.8,
        flatShading: true,
      });
      const cone = new THREE.Mesh(isletGeo, isletMat);
      cone.position.y = height / 2 - 0.05;
      cone.castShadow = !isSoftwareGl;
      isletGroup.add(cone);

      terrainGroup.add(isletGroup);
    };

    createOffshoreIslet('Penghu', 23.568, 119.563, 0.36, 0.12);
    createOffshoreIslet('Green Island', 22.662, 121.492, 0.16, 0.24);
    createOffshoreIslet('Orchid Island', 22.046, 121.554, 0.22, 0.32);
    createOffshoreIslet('Xiaoliuqiu', 22.342, 120.370, 0.12, 0.10);
    createOffshoreIslet('Guishan Island', 24.847, 121.951, 0.15, 0.22);

    // --- INTERACTIVE LANDMARK BEACONS (SLEEK, MODERN & UNOBTRUSIVE) ---
    // Beautiful glowing pins that sit perfectly on the 3D terrain without obscuring the island relief
    const pinsGroup = new THREE.Group();
    scene.add(pinsGroup);

    const meshesMap = new Map<string, THREE.Object3D>();

    // Shared Materials for Beacon Pins
    const pinStemMat = new THREE.MeshStandardMaterial({
      color: 0xf4f0e7,
      metalness: 0.85,
      roughness: 0.2,
    });
    const pinRingGeo = new THREE.RingGeometry(0.10, 0.16, 16);
    pinRingGeo.rotateX(-Math.PI / 2);

    // Category Gemstone Colors
    const getGemColor = (type: string): number => {
      switch (type) {
        case 'city':
          return 0x49a88b; // Jade emerald
        case 'mountain':
          return 0xf6c66b; // Amber gold
        case 'coast':
          return 0x38bdf8; // Ocean cyan
        case 'port':
          return 0xf43f5e; // Marine coral red
        case 'temple':
          return 0xfb923c; // Temple sunset orange
        case 'lake':
          return 0x60a5fa; // Mountain lake sapphire
        case 'station':
          return 0xa855f7; // Amethyst
        default:
          return 0x34d399; // Spring green
      }
    };

    const pinStemGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.32, 8);
    const pinGemGeo = new THREE.SphereGeometry(0.065, 12, 12);

    attractions.forEach((attr) => {
      const pin = new THREE.Group();
      pin.name = attr.attractionId;
      pin.userData = { attraction: attr };

      const { x, y, z } = projectLatLngTo3D(attr.latitude, attr.longitude, 0);
      const groundY = Math.max(0.05, y);
      pin.position.set(x, groundY, z);

      // 1. Needle Stem
      const stem = new THREE.Mesh(pinStemGeo, pinStemMat);
      stem.position.y = 0.16;
      pin.add(stem);

      // 2. Glowing Gem Head
      const gemColor = getGemColor(attr.landmarkType);
      const gemMat = new THREE.MeshStandardMaterial({
        color: gemColor,
        emissive: gemColor,
        emissiveIntensity: 0.55,
        roughness: 0.25,
        metalness: 0.4,
      });
      const gem = new THREE.Mesh(pinGemGeo, gemMat);
      gem.position.y = 0.34;
      pin.add(gem);

      // 3. Ground Pulse Ring
      const ringMat = new THREE.MeshBasicMaterial({
        color: gemColor,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(pinRingGeo, ringMat);
      ring.position.y = 0.015;
      ring.name = 'pulseRing';
      pin.add(ring);

      pinsGroup.add(pin);
      meshesMap.set(attr.attractionId, pin);
    });

    pinMeshesRef.current = meshesMap;

    // --- INTERACTION & RAYCASTING ---
    const handlePointerDown = (event: MouseEvent) => {
      if (!container || !cameraRef.current) return;
      const rect = container.getBoundingClientRect();
      _mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      _mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      _raycaster.setFromCamera(_mouse, cameraRef.current);
      const intersects = _raycaster.intersectObjects(pinsGroup.children, true);

      if (intersects.length > 0) {
        let current: THREE.Object3D | null = intersects[0].object;
        while (current && current.parent && current.parent !== pinsGroup) {
          current = current.parent;
        }
        if (current && current.userData && current.userData.attraction) {
          onSelectAttraction(current.userData.attraction as Attraction);
        }
      }
    };

    const handlePointerMove = (event: MouseEvent) => {
      if (!container || !cameraRef.current) return;
      const rect = container.getBoundingClientRect();
      _mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      _mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      _raycaster.setFromCamera(_mouse, cameraRef.current);
      const intersects = _raycaster.intersectObjects(pinsGroup.children, true);

      if (intersects.length > 0) {
        let current: THREE.Object3D | null = intersects[0].object;
        while (current && current.parent && current.parent !== pinsGroup) {
          current = current.parent;
        }
        if (current && current.userData && current.userData.attraction) {
          setHoveredAttraction(current.userData.attraction as Attraction);
          container.style.cursor = 'pointer';
          return;
        }
      }
      setHoveredAttraction(null);
      container.style.cursor = 'default';
    };

    container.addEventListener('click', handlePointerDown);
    container.addEventListener('mousemove', handlePointerMove);

    const handleResize = () => {
      if (!container || !cameraRef.current) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // --- ANIMATION LOOP (60FPS with Smooth Camera Damping) ---
    let frameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const delta = clock.getDelta();
      const is2D = is2DRef.current;
      const selectedId = selectedAttractionIdRef.current;

      if (is2D) {
        _targetPos.set(0, 16.5, 0.001);
        _targetLookAt.set(0, 0, 0);
        controls.enableRotate = false;
      } else if (selectedId && pinMeshesRef.current.has(selectedId)) {
        const targetMarker = pinMeshesRef.current.get(selectedId)!;
        _tempVec3.setFromMatrixPosition(targetMarker.matrixWorld);
        _targetLookAt.copy(_tempVec3);
        _targetPos.set(_tempVec3.x - 1.2, _tempVec3.y + 4.2, _tempVec3.z + 4.8);
        controls.enableRotate = true;
      } else {
        controls.enableRotate = true;
      }

      if (is2D || selectedId) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetPos.x, 3.5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetPos.y, 3.5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetPos.z, 3.5, delta);

        controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetLookAt.x, 4.0, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetLookAt.y, 4.0, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetLookAt.z, 4.0, delta);
      }

      controls.update();

      const elapsedTime = clock.getElapsedTime();
      pinMeshesRef.current.forEach((obj, id) => {
        const isSelected = id === selectedId;
        const scale = isSelected ? 1.35 : 1.0;
        obj.scale.set(scale, scale, scale);

        // Subtle gentle breathing scale for selected ground ring only
        const ring = obj.getObjectByName('pulseRing') as THREE.Mesh;
        if (ring) {
          const rScale = isSelected ? 1.2 + Math.sin(elapsedTime * 3.0) * 0.15 : 1.0;
          ring.scale.set(rScale, rScale, rScale);
        }
      });

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    setIsLoading(false);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      if (container) {
        container.removeEventListener('click', handlePointerDown);
        container.removeEventListener('mousemove', handlePointerMove);
      }
      scene.clear();
      renderer.dispose();
      terrainGeo.dispose();
      terrainMat.dispose();
      oceanGeo.dispose();
      oceanMat.dispose();
      skirtGeo.dispose();
      skirtMat.dispose();
    };
  }, [attractions]);

  // Screen control action handlers
  const handleMoveNorth = () => {
    if (!controlsRef.current) return;
    controlsRef.current.target.z -= 0.85;
    if (cameraRef.current) cameraRef.current.position.z -= 0.85;
    controlsRef.current.update();
  };

  const handleMoveSouth = () => {
    if (!controlsRef.current) return;
    controlsRef.current.target.z += 0.85;
    if (cameraRef.current) cameraRef.current.position.z += 0.85;
    controlsRef.current.update();
  };

  const handleZoomIn = () => {
    if (!controlsRef.current || !cameraRef.current) return;
    // 使用 dollyIn 縮減相機距離，並同步推進 controls
    controlsRef.current.dollyIn(1.4);
    controlsRef.current.update();
  };

  const handleZoomOut = () => {
    if (!controlsRef.current || !cameraRef.current) return;
    controlsRef.current.dollyOut(1.4);
    controlsRef.current.update();
  };

  const handleResetCamera = () => {
    if (!controlsRef.current || !cameraRef.current) return;
    controlsRef.current.target.set(0, 0, 0);
    cameraRef.current.position.set(0, 10.5, 10.5);
    controlsRef.current.update();
  };

  if (hasWebGlError) {
    return (
      <div className="relative w-full h-full min-h-[500px]">
        <TaiwanSvgMap
          attractions={attractions}
          camerasMap={camerasMap}
          selectedAttractionId={selectedAttractionId}
          hoveredAttractionId={hoveredAttraction?.attractionId || null}
          onSelectAttraction={onSelectAttraction}
          onHoverAttraction={(id) => {
            const attr = attractions.find((a) => a.attractionId === id) || null;
            setHoveredAttraction(attr);
          }}
        />
        <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-md bg-amber-500/90 text-[#071B29] text-xs font-semibold shadow-lg">
          2D 向量地圖模式（已自動降級相容）
        </div>
      </div>
    );
  }

  const hoveredFirstCamera = hoveredAttraction
    ? camerasMap.get(hoveredAttraction.cameraIds[0])
    : null;

  return (
    <div className="relative w-full h-full min-h-[540px] overflow-hidden rounded-2xl border border-white/10 shadow-2xl transition-all duration-300">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing touch-none" />

      {isLoading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#071B29]/90 text-white">
          <div className="w-8 h-8 rounded-full border-2 border-[#49A88B] border-t-transparent animate-spin mb-3" />
          <p className="text-sm tracking-wide text-[#F4F0E7]">載入 3D 台灣高解析立體地貌與景點...</p>
        </div>
      )}

      {/* TOP LEFT: Atmosphere & Lighting Switcher (日間清朗 / 金黃夕陽 / 璀璨夜景) */}
      <div className="absolute top-3.5 left-3.5 z-20 flex flex-wrap items-center gap-2">
        <div className="flex items-center p-1 rounded-xl bg-[#071B29]/80 backdrop-blur-md border border-white/15 shadow-xl">
          <button
            onClick={() => setLightingMode('day')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              lightingMode === 'day'
                ? 'bg-[#386877] text-white shadow-md border border-white/20'
                : 'text-white/70 hover:text-white'
            }`}
            title="日間清朗 - 明亮環境光與中央山脈真實立體陰影"
          >
            <Sun className="w-3.5 h-3.5 text-[#F6C66B]" />
            <span>日間清朗</span>
          </button>

          <button
            onClick={() => setLightingMode('sunset')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              lightingMode === 'sunset'
                ? 'bg-[#99471d] text-white shadow-md border border-white/20'
                : 'text-white/70 hover:text-white'
            }`}
            title="金黃夕陽 - 溫暖金黃方向光"
          >
            <Sunset className="w-3.5 h-3.5 text-[#ffab6b]" />
            <span>金黃夕陽</span>
          </button>

          <button
            onClick={() => setLightingMode('night')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              lightingMode === 'night'
                ? 'bg-[#0f2d3f] text-[#49A88B] border border-[#49A88B]/50 shadow-md'
                : 'text-white/70 hover:text-white'
            }`}
            title="璀璨夜景 - 帶有發光 UI 與燈光效果的暗色主題"
          >
            <Moon className="w-3.5 h-3.5 text-[#49A88B]" />
            <span>璀璨夜景</span>
          </button>
        </div>
      </div>

      {/* TOP RIGHT: 2D / 3D Switcher */}
      <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-2">
        <button
          onClick={onToggle2D}
          className="px-3.5 py-2 text-xs font-bold text-[#071B29] bg-[#F6C66B] hover:bg-[#ebd48a] rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-1.5"
          title="切換 2D 俯視與 3D 透視視角"
        >
          <Compass className="w-4 h-4" />
          <span>{is2DView ? '切換為 3D 透視' : '切換為 2D 俯視'}</span>
        </button>
      </div>

      {/* RIGHT FLANK: On-Screen Navigation Control Button Cluster */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2">
        {/* North (Move Up) */}
        <button
          onClick={handleMoveNorth}
          className="w-10 h-10 rounded-full bg-[#071B29]/90 hover:bg-[#0c2a40] text-[#49A88B] hover:text-white border border-[#49A88B]/40 shadow-xl flex items-center justify-center transition-all active:scale-90"
          title="往北移動中心點"
        >
          <ArrowUp className="w-5 h-5" />
        </button>

        {/* South (Move Down) */}
        <button
          onClick={handleMoveSouth}
          className="w-10 h-10 rounded-full bg-[#071B29]/90 hover:bg-[#0c2a40] text-[#49A88B] hover:text-white border border-[#49A88B]/40 shadow-xl flex items-center justify-center transition-all active:scale-90"
          title="往南移動中心點"
        >
          <ArrowDown className="w-5 h-5" />
        </button>

        <div className="w-6 h-[1px] bg-white/20 my-1" />

        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 rounded-full bg-[#071B29]/90 hover:bg-[#0c2a40] text-white/90 hover:text-white border border-white/20 shadow-xl flex items-center justify-center transition-all active:scale-90"
          title="放大視角 (Zoom In)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 rounded-full bg-[#071B29]/90 hover:bg-[#0c2a40] text-white/90 hover:text-white border border-white/20 shadow-xl flex items-center justify-center transition-all active:scale-90"
          title="縮小視角 (Zoom Out)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Reset Camera View */}
        <button
          onClick={handleResetCamera}
          className="w-10 h-10 rounded-full bg-[#071B29]/90 hover:bg-[#0c2a40] text-[#F6C66B] hover:text-white border border-[#F6C66B]/40 shadow-xl flex items-center justify-center transition-all active:scale-90"
          title="重置視角與中心點"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* BOTTOM CENTER: Collapsible Control Dock Pill */}
      {onToggleCollapse && (
        <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={onToggleCollapse}
            className="px-5 py-2 rounded-full bg-[#071B29]/90 hover:bg-[#0a2336] text-[#F4F0E7] text-xs font-semibold border border-white/20 shadow-2xl backdrop-blur-md flex items-center gap-1.5 transition-all active:scale-95"
          >
            <span>{isCollapsed ? '▲ 展開控制面板' : '▼ 收起控制面板 (全螢幕漫遊)'}</span>
          </button>
        </div>
      )}

      {/* Hovered Tooltip with Thumbnail & Camera Switcher Hint */}
      {hoveredAttraction && (
        <div className="absolute bottom-16 left-6 z-20 pointer-events-none max-w-xs p-3.5 rounded-xl bg-[#071B29]/95 backdrop-blur-md border border-[#49A88B]/40 text-white shadow-2xl transition-all">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs font-semibold text-[#F6C66B]">{hoveredAttraction.city}</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#49A88B]/20 text-[#49A88B] font-mono">
              {hoveredAttraction.cameraIds.length} 支即時鏡頭
            </span>
          </div>

          <h4 className="text-sm font-bold text-[#F4F0E7]">{hoveredAttraction.name}</h4>

          {hoveredFirstCamera && (
            <div className="mt-2 relative rounded-lg overflow-hidden aspect-video w-full bg-black/50 border border-white/10">
              <img
                src={hoveredFirstCamera.thumbnailUrl}
                alt={hoveredFirstCamera.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-[#49A88B] font-mono">
                {hoveredFirstCamera.streamStatus === 'live' ? '● LIVE 直播' : '○ 檢核中'}
              </div>
            </div>
          )}

          <div className="mt-2 text-[10px] text-white/50 flex items-center justify-between">
            <span>座標精度: {hoveredAttraction.coordinateAccuracy === 'exact' ? '精準地標' : '約略景點'}</span>
            <span className="text-[#F6C66B]">點擊進入景點</span>
          </div>
        </div>
      )}
    </div>
  );
};
