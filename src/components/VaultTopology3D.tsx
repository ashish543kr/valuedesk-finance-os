import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Crosshair, Radar, Sparkles } from 'lucide-react';
import { DeskState, SsiIndexQuote, SsiSymbol } from '../types/finance';
import { formatPct, formatUsd } from '../utils/formatters';

interface VaultTopology3DProps {
  indexQuotes: Record<SsiSymbol, SsiIndexQuote>;
  state: DeskState;
  onSelectMint: (symbol: SsiSymbol) => void;
}

type CameraMode = 'orbit' | 'top' | 'core' | 'follow';

interface NodeMeta {
  symbol: SsiSymbol;
  role: string;
  color: number;
  hex: string;
  orbitRadius: number;
  speed: number;
  phaseOffset: number;
  baseTilt: number;
}

const NODE_SPECS: NodeMeta[] = [
  {
    symbol: 'MAG7.ssi',
    role: 'Flagship Core',
    color: 0xea431f,
    hex: '#EA431F',
    orbitRadius: 2.95,
    speed: 0.34,
    phaseOffset: 0.4,
    baseTilt: 0.14,
  },
  {
    symbol: 'USSI',
    role: 'Delta-Neutral Shield',
    color: 0x0284c7,
    hex: '#0284C7',
    orbitRadius: 3.75,
    speed: 0.25,
    phaseOffset: 2.0,
    baseTilt: -0.1,
  },
  {
    symbol: 'DEFI.ssi',
    role: 'Protocol Engine',
    color: 0x0d9488,
    hex: '#0D9488',
    orbitRadius: 4.55,
    speed: 0.2,
    phaseOffset: 3.8,
    baseTilt: 0.12,
  },
  {
    symbol: 'MEME.ssi',
    role: 'High-Beta Interceptor',
    color: 0xd97706,
    hex: '#D97706',
    orbitRadius: 5.3,
    speed: 0.42,
    phaseOffset: 5.1,
    baseTilt: -0.16,
  },
];

const _vec3 = new THREE.Vector3();
const _targetVec = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _packetPos = new THREE.Vector3();
const _packetDir = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createCommandDeckTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 512; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.5;
    for (let r = 64; r <= 240; r += 56) {
      ctx.beginPath();
      ctx.arc(256, 256, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.strokeStyle = '#ea431f';
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(256, 256, 120, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function buildCitadelCore(): {
  root: THREE.Group;
  innerCore: THREE.Mesh;
  ringPrimary: THREE.Mesh;
  ringAccent: THREE.Mesh;
  ringSky: THREE.Mesh;
  shieldMesh: THREE.Mesh;
} {
  const root = new THREE.Group();

  const plinthGeo = new THREE.CylinderGeometry(1.12, 1.42, 0.34, 8);
  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.72,
    roughness: 0.72,
  });
  const plinth = new THREE.Mesh(plinthGeo, plinthMat);
  plinth.position.y = -1.46;
  root.add(plinth);

  const collarGeo = new THREE.CylinderGeometry(1.06, 1.12, 0.1, 8);
  const collarMat = new THREE.MeshStandardMaterial({
    color: 0xea431f,
    emissive: 0xea431f,
    emissiveIntensity: 0.45,
    metalness: 0.45,
    roughness: 0.28,
  });
  const collar = new THREE.Mesh(collarGeo, collarMat);
  collar.position.y = -1.24;
  root.add(collar);

  const innerGeo = new THREE.IcosahedronGeometry(0.84, 0);
  const innerMat = new THREE.MeshPhysicalMaterial({
    color: 0x334155,
    emissive: 0xea431f,
    emissiveIntensity: 0.22,
    metalness: 0.78,
    roughness: 0.18,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  });
  const innerCore = new THREE.Mesh(innerGeo, innerMat);
  root.add(innerCore);

  const wireGeo = new THREE.EdgesGeometry(innerGeo);
  const wireMat = new THREE.LineBasicMaterial({
    color: 0xf8fafc,
    transparent: true,
    opacity: 0.65,
  });
  innerCore.add(new THREE.LineSegments(wireGeo, wireMat));

  const shieldGeo = new THREE.IcosahedronGeometry(1.14, 1);
  const shieldMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
  root.add(shieldMesh);

  const ringPrimaryGeo = new THREE.TorusGeometry(1.48, 0.068, 14, 64);
  const ringPrimaryMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.88,
    roughness: 0.2,
  });
  const ringPrimary = new THREE.Mesh(ringPrimaryGeo, ringPrimaryMat);
  ringPrimary.rotation.x = Math.PI * 0.36;
  root.add(ringPrimary);

  const ringAccentGeo = new THREE.TorusGeometry(1.24, 0.048, 12, 48);
  const ringAccentMat = new THREE.MeshStandardMaterial({
    color: 0xea431f,
    emissive: 0xea431f,
    emissiveIntensity: 0.8,
    metalness: 0.52,
    roughness: 0.22,
  });
  const ringAccent = new THREE.Mesh(ringAccentGeo, ringAccentMat);
  ringAccent.rotation.y = Math.PI * 0.25;
  ringAccent.rotation.x = -Math.PI * 0.28;
  root.add(ringAccent);

  const ringSkyGeo = new THREE.TorusGeometry(1.66, 0.032, 10, 56);
  const ringSkyMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.65,
    metalness: 0.6,
    roughness: 0.25,
  });
  const ringSky = new THREE.Mesh(ringSkyGeo, ringSkyMat);
  ringSky.rotation.x = Math.PI * 0.45;
  ringSky.rotation.z = Math.PI * 0.2;
  root.add(ringSky);

  const spireGeo = new THREE.ConeGeometry(0.24, 0.56, 6);
  const spireMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.82,
    roughness: 0.26,
  });
  const spire = new THREE.Mesh(spireGeo, spireMat);
  spire.position.y = 1.24;
  root.add(spire);

  const beaconGeo = new THREE.OctahedronGeometry(0.16, 0);
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea431f,
    emissiveIntensity: 1.4,
    roughness: 0.15,
  });
  const beacon = new THREE.Mesh(beaconGeo, beaconMat);
  beacon.position.y = 1.66;
  root.add(beacon);

  return {
    root,
    innerCore,
    ringPrimary,
    ringAccent,
    ringSky,
    shieldMesh,
  };
}

function buildVaultShip(spec: NodeMeta): {
  group: THREE.Group;
  crystal: THREE.Mesh;
  gimbalRing: THREE.Mesh;
  thruster: THREE.Mesh;
} {
  const group = new THREE.Group();
  group.userData.symbol = spec.symbol;

  const hullGeo = new THREE.OctahedronGeometry(0.42, 0);
  const hullMat = new THREE.MeshPhysicalMaterial({
    color: spec.color,
    emissive: spec.color,
    emissiveIntensity: 0.38,
    metalness: 0.3,
    roughness: 0.15,
    clearcoat: 0.95,
    clearcoatRoughness: 0.1,
  });
  const crystal = new THREE.Mesh(hullGeo, hullMat);
  crystal.scale.set(1, 0.85, 1.38);
  crystal.userData.symbol = spec.symbol;
  group.add(crystal);

  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0.14);
  wingShape.lineTo(0.62, -0.08);
  wingShape.lineTo(0.5, -0.26);
  wingShape.lineTo(0, -0.14);
  wingShape.closePath();

  const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.68,
    roughness: 0.65,
  });

  const rightWing = new THREE.Mesh(wingGeo, wingMat);
  rightWing.rotation.x = Math.PI / 2;
  rightWing.position.set(0.18, 0.02, 0.04);
  rightWing.userData.symbol = spec.symbol;
  group.add(rightWing);

  const leftWing = new THREE.Mesh(wingGeo, wingMat);
  leftWing.rotation.x = Math.PI / 2;
  leftWing.rotation.y = Math.PI;
  leftWing.position.set(-0.18, 0.02, -0.04);
  leftWing.userData.symbol = spec.symbol;
  group.add(leftWing);

  const gimbalGeo = new THREE.TorusGeometry(0.7, 0.038, 10, 32);
  const gimbalMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    metalness: 0.86,
    roughness: 0.22,
  });
  const gimbalRing = new THREE.Mesh(gimbalGeo, gimbalMat);
  gimbalRing.rotation.x = Math.PI / 2;
  gimbalRing.userData.symbol = spec.symbol;
  group.add(gimbalRing);

  const nacelleGeo = new THREE.CylinderGeometry(0.13, 0.2, 0.34, 8);
  const nacelleMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.78,
    roughness: 0.45,
  });
  const nacelle = new THREE.Mesh(nacelleGeo, nacelleMat);
  nacelle.rotation.x = Math.PI / 2;
  nacelle.position.set(0, 0, -0.52);
  nacelle.userData.symbol = spec.symbol;
  group.add(nacelle);

  const thrusterGeo = new THREE.ConeGeometry(0.12, 0.32, 8);
  const thrusterMat = new THREE.MeshStandardMaterial({
    color: spec.color,
    emissive: spec.color,
    emissiveIntensity: 1.4,
    roughness: 0.1,
  });
  const thruster = new THREE.Mesh(thrusterGeo, thrusterMat);
  thruster.rotation.x = -Math.PI / 2;
  thruster.position.set(0, 0, -0.8);
  thruster.userData.symbol = spec.symbol;
  group.add(thruster);

  return { group, crystal, gimbalRing, thruster };
}

export function VaultTopology3D({
  indexQuotes,
  state,
  onSelectMint,
}: VaultTopology3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<SsiSymbol>('MAG7.ssi');
  const [cameraMode, setCameraMode] = useState<CameraMode>('orbit');
  const [paused, setPaused] = useState(false);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [alphaScoreUsd, setAlphaScoreUsd] = useState(1420);
  const [scanActive, setScanActive] = useState(false);

  const latestPropsRef = useRef({
    indexQuotes,
    state,
    paused,
    cameraMode,
    selectedSymbol,
  });
  latestPropsRef.current = {
    indexQuotes,
    state,
    paused,
    cameraMode,
    selectedSymbol,
  };

  const presetTriggerRef = useRef<(mode: CameraMode) => void>(() => {});
  const pulseTriggerRef = useRef<() => void>(() => {});

  function handleTriggerScan() {
    pulseTriggerRef.current();
    setScanCount((c) => c + 1);
    const activeQuote = indexQuotes[selectedSymbol];
    const bonus = Math.round(180 + (activeQuote?.yieldAprPct ?? 8) * 24);
    setAlphaScoreUsd((s) => s + bonus);
    setScanActive(true);
    window.setTimeout(() => setScanActive(false), 900);
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        pulseTriggerRef.current();
        setScanCount((c) => c + 1);
        setAlphaScoreUsd((s) => s + 340);
        setScanActive(true);
        window.setTimeout(() => setScanActive(false), 900);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        setSelectedSymbol((prev) => {
          const i = NODE_SPECS.findIndex((s) => s.symbol === prev);
          return NODE_SPECS[(i + 1) % NODE_SPECS.length].symbol;
        });
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        setSelectedSymbol((prev) => {
          const i = NODE_SPECS.findIndex((s) => s.symbol === prev);
          return NODE_SPECS[(i - 1 + NODE_SPECS.length) % NODE_SPECS.length].symbol;
        });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
        preserveDrawingBuffer: true,
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    let currentWidth = Math.max(300, container.clientWidth);
    let currentHeight = Math.max(280, container.clientHeight);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(currentWidth, currentHeight);
    renderer.domElement.style.display = 'block';
    renderer.shadowMap.enabled = false;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1120);
    scene.fog = new THREE.FogExp2(0x0b1120, 0.016);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(42, currentWidth / currentHeight, 0.1, 120);
    camera.position.set(0, 5.6, 10.4);
    camera.lookAt(0, -0.2, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, -0.2, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.minDistance = 3.6;
    controls.maxDistance = 16;
    controls.maxPolarAngle = Math.PI * 0.48;

    const ambientLight = new THREE.AmbientLight(0xf8fafc, 0.55);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xf1f5f9, 0x0b1120, 1.2);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1e6, 2.5);
    keyLight.position.set(6, 10, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.55);
    rimLight.position.set(-7, 5, -6);
    scene.add(rimLight);

    const coreLight = new THREE.PointLight(0xea431f, 3.6, 14, 1.4);
    coreLight.position.set(0, 0.4, 0);
    scene.add(coreLight);

    const deckTex = createCommandDeckTexture();
    const deckGeo = new THREE.CylinderGeometry(6.8, 7.2, 0.24, 48);
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: deckTex,
      roughness: 0.72,
      metalness: 0.18,
    });
    const commandDeck = new THREE.Mesh(deckGeo, deckMat);
    commandDeck.position.y = -1.78;
    scene.add(commandDeck);

    const outerRimGeo = new THREE.TorusGeometry(6.85, 0.045, 10, 64);
    const outerRimMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.85,
      roughness: 0.24,
    });
    const outerRim = new THREE.Mesh(outerRimGeo, outerRimMat);
    outerRim.rotation.x = Math.PI / 2;
    outerRim.position.y = -1.63;
    scene.add(outerRim);

    const starCount = 110;
    const starGeo = new THREE.OctahedronGeometry(0.055, 0);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const starField = new THREE.InstancedMesh(starGeo, starMat, starCount);
    const starPalette = [
      new THREE.Color(0x94a3b8),
      new THREE.Color(0x38bdf8),
      new THREE.Color(0xf97316),
      new THREE.Color(0xe2e8f0),
    ];
    for (let i = 0; i < starCount; i++) {
      const r = 7.5 + (i % 9) * 1.4;
      const theta = i * 2.39996;
      const y = ((i % 13) - 5) * 0.75;
      _dummy.position.set(Math.cos(theta) * r, y, Math.sin(theta) * r);
      const s = 0.6 + (i % 4) * 0.3;
      _dummy.scale.set(s, s, s);
      _dummy.rotation.set(i * 0.5, i * 0.3, 0);
      _dummy.updateMatrix();
      starField.setMatrixAt(i, _dummy.matrix);
      starField.setColorAt(i, starPalette[i % starPalette.length]);
    }
    starField.instanceMatrix.needsUpdate = true;
    if (starField.instanceColor) starField.instanceColor.needsUpdate = true;
    starField.computeBoundingSphere();
    scene.add(starField);

    const core = buildCitadelCore();
    scene.add(core.root);

    const pulseGeo = new THREE.TorusGeometry(1, 0.038, 10, 64);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
    });
    const pulseRing = new THREE.Mesh(pulseGeo, pulseMat);
    pulseRing.rotation.x = Math.PI / 2;
    pulseRing.position.y = -1.52;
    pulseRing.visible = false;
    scene.add(pulseRing);

    const shipRigs: ReturnType<typeof buildVaultShip>[] = [];
    const shadowDiscs: THREE.Mesh[] = [];
    const tetherGeometries: THREE.BufferGeometry[] = [];
    const raycastTargets: THREE.Object3D[] = [];
    const trackMeshes: THREE.Mesh[] = [];

    for (const spec of NODE_SPECS) {
      const trackGeo = new THREE.TorusGeometry(spec.orbitRadius, 0.016, 8, 72);
      const trackMat = new THREE.MeshBasicMaterial({
        color: 0x475569,
        transparent: true,
        opacity: 0.72,
      });
      const trackMesh = new THREE.Mesh(trackGeo, trackMat);
      trackMesh.rotation.x = Math.PI / 2;
      trackMesh.position.y = -1.62;
      scene.add(trackMesh);
      trackMeshes.push(trackMesh);

      const tetherPositions = new Float32Array(6);
      const tetherGeo = new THREE.BufferGeometry();
      tetherGeo.setAttribute('position', new THREE.BufferAttribute(tetherPositions, 3));
      const tetherMat = new THREE.LineBasicMaterial({
        color: spec.color,
        transparent: true,
        opacity: 0.55,
      });
      const tetherLine = new THREE.Line(tetherGeo, tetherMat);
      tetherLine.frustumCulled = false;
      scene.add(tetherLine);
      tetherGeometries.push(tetherGeo);

      const discGeo = new THREE.RingGeometry(0.28, 0.58, 24);
      const discMat = new THREE.MeshBasicMaterial({
        color: spec.color,
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = -1.58;
      scene.add(disc);
      shadowDiscs.push(disc);

      const rig = buildVaultShip(spec);
      scene.add(rig.group);
      shipRigs.push(rig);
      raycastTargets.push(rig.group);
    }

    const packetCount = 28;
    const packetGeo = new THREE.OctahedronGeometry(0.085, 0);
    const packetMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const packetInstances = new THREE.InstancedMesh(packetGeo, packetMat, packetCount);
    packetInstances.frustumCulled = false;
    for (let i = 0; i < packetCount; i++) {
      const spec = NODE_SPECS[i % NODE_SPECS.length];
      packetInstances.setColorAt(i, new THREE.Color(spec.color));
    }
    if (packetInstances.instanceColor) packetInstances.instanceColor.needsUpdate = true;
    scene.add(packetInstances);

    const desiredCamPos = new THREE.Vector3(0, 5.6, 10.4);
    const desiredTarget = new THREE.Vector3(0, -0.2, 0);
    let camTransitionActive = false;
    let pulseProgress = -1;

    presetTriggerRef.current = (mode) => {
      if (mode === 'orbit') {
        desiredCamPos.set(0, 5.6, 10.4);
        desiredTarget.set(0, -0.2, 0);
        camTransitionActive = true;
      } else if (mode === 'top') {
        desiredCamPos.set(0, 12.2, 1.8);
        desiredTarget.set(0, -0.4, 0);
        camTransitionActive = true;
      } else if (mode === 'core') {
        desiredCamPos.set(0, 2.3, 4.9);
        desiredTarget.set(0, 0, 0);
        camTransitionActive = true;
      } else {
        camTransitionActive = false;
      }
    };

    pulseTriggerRef.current = () => {
      pulseProgress = 0;
      pulseRing.visible = true;
    };

    const onControlStart = () => {
      camTransitionActive = false;
    };
    controls.addEventListener('start', onControlStart);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let lastHoverCheck = 0;

    function updatePointer(e: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function onPointerDown(e: PointerEvent) {
      updatePointer(e);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(raycastTargets, true);
      if (hits.length > 0) {
        const sym = hits[0].object.userData.symbol as SsiSymbol | undefined;
        if (sym) {
          setSelectedSymbol(sym);
        }
      }
    }

    function onPointerMove(e: PointerEvent) {
      const now = Date.now();
      if (now - lastHoverCheck < 65) return;
      lastHoverCheck = now;
      updatePointer(e);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(raycastTargets, true);
      renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglUnavailable(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(300, Math.round(entry.contentRect.width));
      const h = Math.max(280, Math.round(entry.contentRect.height));
      if (w === currentWidth && h === currentHeight) return;
      currentWidth = w;
      currentHeight = h;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    });
    resizeObserver.observe(container);

    let lastTimestamp = performance.now();
    let elapsedSim = 0;
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 85);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const syncState = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (syncState === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 85);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const now = performance.now();
      const delta = Math.min(0.1, Math.max(0.001, (now - lastTimestamp) / 1000));
      lastTimestamp = now;

      const {
        state: liveState,
        indexQuotes: liveQuotes,
        paused: isPaused,
        cameraMode: activeCamMode,
        selectedSymbol: activeSym,
      } = latestPropsRef.current;

      if (!isPaused) {
        elapsedSim += delta;
        core.innerCore.rotation.y += delta * 0.42;
        core.shieldMesh.rotation.y -= delta * 0.25;
        core.ringPrimary.rotation.z += delta * 0.55;
        core.ringAccent.rotation.y -= delta * 0.65;
        core.ringSky.rotation.z -= delta * 0.38;
        starField.rotation.y += delta * 0.025;
      }

      if (pulseProgress >= 0) {
        pulseProgress += delta * 1.15;
        if (pulseProgress >= 1) {
          pulseProgress = -1;
          pulseRing.visible = false;
          pulseMat.opacity = 0;
        } else {
          const radius = 0.9 + pulseProgress * 6.0;
          pulseRing.scale.set(radius, radius, 1);
          pulseMat.opacity = (1 - pulseProgress) * 0.85;
        }
      }

      const boostMult = pulseProgress >= 0 ? 2.4 : 1;

      NODE_SPECS.forEach((spec, idx) => {
        const rig = shipRigs[idx];
        const disc = shadowDiscs[idx];
        const angle = spec.phaseOffset + elapsedSim * spec.speed;
        const held = liveState.positions[spec.symbol]?.quantity ?? 0;
        const nav = liveQuotes[spec.symbol]?.nav ?? 1;
        const heldUsd = held * nav;
        const isSelected = activeSym === spec.symbol;
        const baseScale = THREE.MathUtils.clamp(0.84 + heldUsd / 95000, 0.84, 1.5);
        const targetScale = isSelected ? baseScale * 1.14 : baseScale;

        const nx = Math.cos(angle) * spec.orbitRadius;
        const ny = 0.08 + Math.sin(elapsedSim * 1.6 + idx * 1.3) * 0.26;
        const nz = Math.sin(angle) * spec.orbitRadius;

        rig.group.position.set(nx, ny, nz);

        const nextAngle = angle + 0.05;
        const tx = Math.cos(nextAngle) * spec.orbitRadius;
        const tz = Math.sin(nextAngle) * spec.orbitRadius;
        rig.group.lookAt(tx, ny, tz);
        rig.group.rotateZ(spec.baseTilt + Math.sin(elapsedSim * 2 + idx) * 0.08);

        _vec3.set(targetScale, targetScale, targetScale);
        rig.group.scale.lerp(_vec3, 0.16);

        if (!isPaused) {
          rig.gimbalRing.rotation.z += delta * 1.3 * boostMult;
          const thrustScale = 0.85 + Math.sin(elapsedSim * 18 + idx) * 0.22;
          rig.thruster.scale.set(1, thrustScale * boostMult, 1);
        }

        const hullMat = rig.crystal.material as THREE.MeshPhysicalMaterial;
        hullMat.emissiveIntensity = isSelected
          ? 0.72 + (pulseProgress >= 0 ? 0.5 : 0)
          : 0.34;

        disc.position.set(nx, -1.58, nz);
        const discScale = targetScale * (0.95 + Math.sin(elapsedSim * 3 + idx) * 0.08);
        disc.scale.set(discScale, discScale, 1);

        const tetherAttr = tetherGeometries[idx].getAttribute('position') as THREE.BufferAttribute;
        tetherAttr.setXYZ(1, nx, ny, nz);
        tetherAttr.needsUpdate = true;

        const trackMat = trackMeshes[idx].material as THREE.MeshBasicMaterial;
        trackMat.color.setHex(isSelected ? spec.color : 0x475569);
        trackMat.opacity = isSelected ? 0.92 : 0.6;
      });

      for (let i = 0; i < packetCount; i++) {
        const shipIdx = i % NODE_SPECS.length;
        const shipPos = shipRigs[shipIdx].group.position;
        const progress = ((elapsedSim * 0.55 * boostMult + i * 0.142) % 1);
        _packetPos.lerpVectors(shipPos, _vec3.set(0, 0.1, 0), progress);
        _packetDir.subVectors(_vec3.set(0, 0.1, 0), shipPos).normalize();
        _dummy.position.copy(_packetPos);
        _dummy.lookAt(_packetPos.x + _packetDir.x, _packetPos.y + _packetDir.y, _packetPos.z + _packetDir.z);
        const pScale = 0.7 + Math.sin(progress * Math.PI) * 0.55;
        _dummy.scale.set(pScale * 0.8, pScale * 0.8, pScale * 1.7);
        _dummy.updateMatrix();
        packetInstances.setMatrixAt(i, _dummy.matrix);
      }
      packetInstances.instanceMatrix.needsUpdate = true;

      if (activeCamMode === 'follow') {
        const selectedIdx = Math.max(
          0,
          NODE_SPECS.findIndex((s) => s.symbol === activeSym)
        );
        const shipPos = shipRigs[selectedIdx].group.position;
        const damp = 1 - Math.exp(-5.2 * delta);
        _targetVec.copy(shipPos);
        controls.target.lerp(_targetVec, damp);

        const radialDirX = shipPos.x === 0 ? 1 : shipPos.x;
        const radialDirZ = shipPos.z === 0 ? 1 : shipPos.z;
        const len = Math.hypot(radialDirX, radialDirZ) || 1;
        desiredCamPos.set(
          shipPos.x + (radialDirX / len) * 2.8,
          shipPos.y + 1.9,
          shipPos.z + (radialDirZ / len) * 2.8
        );
        camera.position.lerp(desiredCamPos, damp);
      } else if (camTransitionActive) {
        const damp = 1 - Math.exp(-5.5 * delta);
        camera.position.lerp(desiredCamPos, damp);
        controls.target.lerp(desiredTarget, damp);
        if (camera.position.distanceTo(desiredCamPos) < 0.05) {
          camTransitionActive = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlStart);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      envTex.dispose();
      deckTex.dispose();

      scene.traverse((obj) => {
        if (
          obj instanceof THREE.Mesh ||
          obj instanceof THREE.Line ||
          obj instanceof THREE.LineSegments ||
          obj instanceof THREE.InstancedMesh
        ) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, []);

  const selectedQuote = indexQuotes[selectedSymbol];
  const selectedHeld = state.positions[selectedSymbol]?.quantity ?? 0;
  const selectedHeldUsd = selectedHeld * (selectedQuote?.nav ?? 1);
  const selectedSpec = NODE_SPECS.find((s) => s.symbol === selectedSymbol) ?? NODE_SPECS[0];

  function handleCameraMode(mode: CameraMode) {
    setCameraMode(mode);
    presetTriggerRef.current(mode);
  }

  return (
    <section
      aria-label="3D ValueChain Finance Command Arena"
      className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-950 dark:border-slate-800"
    >
      <div className="pointer-events-none absolute top-3.5 left-4 z-10 flex flex-col gap-0.5 rounded-lg bg-slate-950/90 px-3 py-2 border border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-white">
          <Radar className="h-3.5 w-3.5 text-orange-500" />
          <span>ValueChain L1 Command Arena</span>
        </div>
        <div className="font-mono text-[10px] text-slate-400">
          Click Vault Ships · Press Space to Scan · Arrow Keys Switch
        </div>
      </div>

      <div className="pointer-events-none absolute top-3.5 right-4 z-10 flex items-center gap-3 rounded-lg bg-slate-950/90 px-3 py-1.5 border border-slate-800 font-mono text-[11px]">
        <div>
          <span className="text-slate-400">Scans </span>
          <span className="font-semibold text-white">{scanCount}</span>
        </div>
        <span className="text-slate-700" aria-hidden="true">·</span>
        <div>
          <span className="text-slate-400">Sim Alpha </span>
          <span className="font-semibold text-emerald-400">{formatUsd(alphaScoreUsd)}</span>
        </div>
      </div>

      {webglUnavailable ? (
        <div className="flex h-[340px] items-center justify-center bg-slate-900 p-6 text-center text-sm text-slate-300">
          3D WebGL viewport unavailable in this browser context. Select a vault from the table below.
        </div>
      ) : (
        <div
          ref={mountRef}
          data-testid="vault-topology-3d"
          data-selected-vault={selectedSymbol}
          data-camera-mode={cameraMode}
          className="h-[340px] w-full select-none"
        />
      )}

      <div className="border-t border-slate-800 bg-slate-900 px-4 py-3 text-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {NODE_SPECS.map((spec) => {
              const active = selectedSymbol === spec.symbol;
              return (
                <button
                  key={spec.symbol}
                  type="button"
                  onClick={() => setSelectedSymbol(spec.symbol)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-xs font-medium transition-colors ${
                    active
                      ? 'bg-slate-800 text-white ring-1 ring-slate-600'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-xs"
                    style={{ backgroundColor: spec.hex }}
                    aria-hidden="true"
                  />
                  {spec.symbol}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleTriggerScan}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                scanActive
                  ? 'bg-sky-500 text-slate-950'
                  : 'bg-slate-800 text-sky-400 hover:bg-sky-600 hover:text-white'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Yield Scan
            </button>

            {(['orbit', 'top', 'core', 'follow'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleCameraMode(mode)}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                  cameraMode === mode
                    ? 'bg-slate-800 text-white ring-1 ring-slate-600'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode === 'follow' && <Crosshair className="h-3 w-3 text-orange-400" />}
                {mode}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="rounded-md border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              {paused ? 'Resume' : 'Pause'}
            </button>
          </div>
        </div>

        {selectedQuote && (
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono font-semibold" style={{ color: selectedSpec.hex }}>
                {selectedQuote.symbol}
              </span>
              <span className="text-slate-400">{selectedSpec.role}</span>
              <span className="font-mono text-slate-200">NAV ${selectedQuote.nav.toFixed(4)}</span>
              <span
                className={`font-mono ${
                  selectedQuote.change24hPct >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {formatPct(selectedQuote.change24hPct)}
              </span>
              <span className="font-mono text-sky-400">
                {selectedQuote.yieldAprPct.toFixed(1)}% APR
              </span>
              <span className="font-mono text-slate-400">
                Held: {formatUsd(selectedHeldUsd)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onSelectMint(selectedSymbol)}
              className="rounded-md bg-orange-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-orange-500"
            >
              Mint {selectedSymbol}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
