import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ACADEMY_DOOR_POSITION, STATION_POSITIONS, STATION_SEATS } from '../domain/academyMap';
import { learningChallenges, type LearningChallenge } from '../domain/learning';
import { GameAudio } from './GameAudio';

export type LocomotionState = 'idle' | 'walk' | 'run' | 'jump';
export type CameraMode = 'cinematic' | 'third-close' | 'first-person';
export type TimePreset = 'day' | 'dusk' | 'night';
export type WeatherPreset = 'clear' | 'rain' | 'heat' | 'snow';

export interface WorldMapState {
  x: number;
  z: number;
  yaw: number;
}

export interface RuntimeCallbacks {
  onReady: () => void;
  onError: (message: string) => void;
  onNearby: (id: string | null) => void;
  onMapUpdate: (state: WorldMapState) => void;
  onInteract: (id: string) => void;
  onDialogue: (speaker: string, text: string) => void;
  onDoorState: (isOpen: boolean) => void;
  onLocomotion: (state: LocomotionState) => void;
}

interface Station {
  challenge: LearningChallenge;
  group: THREE.Group;
  position: THREE.Vector3;
  seat: THREE.Vector3;
  facing: number;
}

interface StaticBoxCollider {
  position: [number, number, number];
  halfExtents: [number, number, number];
}

interface AiCharacter {
  id: number;
  speaker: string;
  dialogue: string;
  behavior: 'seated' | 'wander';
  group: THREE.Group;
  mixer: THREE.AnimationMixer;
  idle: THREE.AnimationAction | null;
  walk: THREE.AnimationAction | null;
  activeAction: THREE.AnimationAction | null;
  home: THREE.Vector3;
  target: THREE.Vector3;
  wait: number;
  speed: number;
  phase: number;
}

interface ParticleOrbit {
  centerX: number;
  centerZ: number;
  radius: number;
  phase: number;
  speed: number;
  height: number;
}

const PLAYER_START_POSITION: [number, number] = [-6, 11];
const ACADEMY_DOOR_INTERACTION_RADIUS = 4.5;
const PLAYER_VISUAL_HEIGHT = 1.22;
const PLAYER_CAPSULE_RADIUS = 0.26;
const PLAYER_CAPSULE_HALF_HEIGHT = PLAYER_VISUAL_HEIGHT / 2 - PLAYER_CAPSULE_RADIUS;
const PLAYER_BODY_CENTER_HEIGHT = PLAYER_CAPSULE_HALF_HEIGHT + PLAYER_CAPSULE_RADIUS;
const ASSET_BASE = `${import.meta.env.BASE_URL}assets/models/`;
const AI_POSITIONS: [number, number][] = [
  [-3.1, 13.4], [-1.4, 12.5], [-3, -9.6],
  [-0.1, -9.6], [-1.2, -19.1], [2.9, -19.1],
  [-4.5, 8], [-0.5, 8], [3.7, 7],
  [-4.5, -6.5], [3.8, -6.5], [-4.2, -17],
  [-0.2, -17], [3.8, -17], [0, -3],
];
const AI_VARIANTS = [
  { speaker: 'MIRA · TEKNISI', dialogue: 'Terminal ini aktif kembali. Gunakan frasa sandi unik dan aktifkan MFA sebelum masuk.', outfit: 0x4f9483, pants: 0x293d53, hair: 0x30252a, accent: 0xd1a65f },
  { speaker: 'KAI · PROGRAMMER', dialogue: 'Aplikasi yang baik hanya meminta izin yang benar-benar diperlukan. Tolak akses yang tidak relevan.', outfit: 0x5577a6, pants: 0x30374b, hair: 0x342b29, accent: 0xa6c9e8 },
  { speaker: 'NOVA · JARINGAN', dialogue: 'Sebelum membuka tautan mendesak, periksa pengirim dan verifikasi lewat kanal resmi.', outfit: 0xb47c48, pants: 0x3f3b39, hair: 0x443126, accent: 0xe9c579 },
  { speaker: 'SERA · ARSIP DATA', dialogue: 'Cadangan 3-2-1 yang terpisah dan diuji membuat pemulihan lebih dapat diandalkan.', outfit: 0x82649d, pants: 0x37364d, hair: 0x302535, accent: 0xcbb1e2 },
  { speaker: 'ELIO · RESPON INSIDEN', dialogue: 'Laporkan lewat jalur resmi, batasi dampak, dan simpan bukti tanpa menyebarkan data pribadi.', outfit: 0xb96762, pants: 0x41384a, hair: 0x3c2929, accent: 0xe5b69a },
];

const PALETTE = [0x58748a, 0x7d8f97, 0x477f83, 0x9a806a, 0x526884];

export class GameRuntime {
  private readonly loader = new FBXLoader();
  private readonly audio = new GameAudio();
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(54, 1, 0.1, 180);
  private readonly clock = new THREE.Clock();
  private readonly cameraTarget = new THREE.Vector3();
  private readonly desiredCamera = new THREE.Vector3();
  private readonly cameraDirection = new THREE.Vector3();
  private readonly cameraFollowPrevious = new THREE.Vector3(
    PLAYER_START_POSITION[0],
    PLAYER_BODY_CENTER_HEIGHT,
    PLAYER_START_POSITION[1],
  );
  private readonly cameraLead = new THREE.Vector3();
  private readonly cameraLeadTarget = new THREE.Vector3();
  private readonly cameraRaycaster = new THREE.Raycaster();
  private readonly playerPosition = new THREE.Vector3(
    PLAYER_START_POSITION[0],
    PLAYER_BODY_CENTER_HEIGHT,
    PLAYER_START_POSITION[1],
  );
  private readonly moveDirection = new THREE.Vector3();
  private readonly moveInput = new THREE.Vector2();
  private readonly pressed = new Set<string>();
  private readonly stations: Station[] = [];
  private readonly aiCharacters: AiCharacter[] = [];
  private readonly completed = new Set<string>();
  private readonly staticBoxColliders: StaticBoxCollider[] = [];
  private readonly levelTextures = new Map<string, THREE.CanvasTexture>();
  private readonly animationClips = new Map<string, THREE.AnimationClip>();
  private readonly cameraOccluders: THREE.Mesh[] = [];
  private readonly outdoorClouds: THREE.Group[] = [];
  private readonly skyColors = {
    day: { sky: 0x9bc6d8, fog: 0x92b5be, ambient: 1.8, sun: 2.8, sunColor: 0xffe6c6 },
    dusk: { sky: 0xc98e83, fog: 0xb98983, ambient: 1.15, sun: 2.05, sunColor: 0xffb77d },
    night: { sky: 0x172842, fog: 0x233349, ambient: 0.62, sun: 0.72, sunColor: 0x9bb7ff },
  };
  private renderer: THREE.WebGLRenderer | null = null;
  private composer: EffectComposer | null = null;
  private particleCloud: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> | null = null;
  private particleOrbits: ParticleOrbit[] = [];
  private particlePulse = 0;
  private ambientLight: THREE.HemisphereLight | null = null;
  private sunLight: THREE.DirectionalLight | null = null;
  private fillLight: THREE.PointLight | null = null;
  private rainEffect: THREE.LineSegments | null = null;
  private snowEffect: THREE.Points | null = null;
  private rainPositions = new Float32Array(0);
  private rainSpeeds = new Float32Array(0);
  private snowPositions = new Float32Array(0);
  private snowSpeeds = new Float32Array(0);
  private timePreset: TimePreset = 'day';
  private weatherPreset: WeatherPreset = 'clear';
  private mapUpdateTimer = 0;
  private physics: RAPIER.World | null = null;
  private playerBody: RAPIER.RigidBody | null = null;
  private playerCollider: RAPIER.Collider | null = null;
  private characterController: RAPIER.KinematicCharacterController | null = null;
  private doorCollider: RAPIER.Collider | null = null;
  private playerVisual: THREE.Group | null = null;
  private characterModel: THREE.Group | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private readonly actions = new Map<string, THREE.AnimationAction>();
  private activeAction: THREE.AnimationAction | null = null;
  private aria: THREE.Group | null = null;
  private doorPivot: THREE.Group | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private animationFrame = 0;
  private host: HTMLElement | null = null;
  private callbacks: RuntimeCallbacks | null = null;
  private initialized = false;
  private playing = false;
  private sprintHeld = false;
  private crouchHeld = false;
  private doorOpen = false;
  private doorOpenTime = 0;
  private jumpQueued = false;
  private verticalVelocity = 0;
  private grounded = true;
  private jumpPhase: 'up' | 'float' | 'down' = 'up';
  private jumpElapsed = 0;
  private bumpPoseTime = 0;
  private bumpCooldown = 0;
  private interactionPoseTime = 0;
  private footstepTimer = 0;
  private cameraYaw = Math.PI;
  private cameraYawTarget = Math.PI;
  private cameraPitch = 0.27;
  private cameraPitchTarget = 0.27;
  private cameraDistance = 2.2;
  private cameraMode: CameraMode = 'cinematic';
  private readonly cameraShoulder = 0.24;
  private workstationReturn: {
    position: THREE.Vector3;
    rotation: number;
    rotationX: number;
    scaleY: number;
    cameraDistance: number;
    cameraYaw: number;
    cameraYawTarget: number;
    cameraPitch: number;
    cameraPitchTarget: number;
  } | null = null;
  private workstationDisplacedNpcs: AiCharacter[] = [];
  private cameraCollisionTimer = 0;
  private cameraObstructionDistance: number | null = null;
  private cutsceneShot = -1;
  private dragPointer: number | null = null;
  private lastPointer = { x: 0, y: 0 };
  private nearestId: string | null = null;
  private currentLocomotion: LocomotionState = 'idle';
  private readonly onKeyDown = (event: KeyboardEvent) => this.handleKeyDown(event);
  private readonly onKeyUp = (event: KeyboardEvent) => this.handleKeyUp(event);

  async start(host: HTMLElement, callbacks: RuntimeCallbacks): Promise<void> {
    this.host = host;
    this.callbacks = callbacks;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
    this.renderer.setSize(host.clientWidth, host.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.domElement.className = 'game-canvas';
    host.appendChild(this.renderer.domElement);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(
      new UnrealBloomPass(new THREE.Vector2(host.clientWidth, host.clientHeight), 0.18, 0.38, 0.88),
    );
    this.composer.addPass(new SMAAPass(host.clientWidth, host.clientHeight));
    this.composer.addPass(new OutputPass());
    this.composer.setSize(host.clientWidth, host.clientHeight);

    this.scene.background = new THREE.Color(0x9bc6d8);
    this.scene.fog = new THREE.Fog(0x92b5be, 55, 190);
    this.camera.position.set(PLAYER_START_POSITION[0] + 0.24, 2.35, PLAYER_START_POSITION[1] - 2.1);
    this.camera.lookAt(PLAYER_START_POSITION[0], 1.7, PLAYER_START_POSITION[1]);
    this.createLights();
    this.createWorld();
    this.setEnvironment(this.timePreset, this.weatherPreset);
    this.bindInput(this.renderer.domElement);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    await RAPIER.init();
    this.createPhysics();
    await Promise.all([this.loadLevel(), this.loadCharacter()]);
    this.initialized = true;
    this.callbacks?.onReady();
    this.clock.start();
    this.animationFrame = requestAnimationFrame(this.tick);
  }

  setPlaying(playing: boolean): void {
    this.playing = playing;
    this.pressed.clear();
    this.moveInput.set(0, 0);
    this.sprintHeld = false;
    this.crouchHeld = false;
  }

  setMoveInput(x: number, z: number): void {
    this.moveInput.set(THREE.MathUtils.clamp(x, -1, 1), THREE.MathUtils.clamp(z, -1, 1));
  }

  setSprint(held: boolean): void {
    this.sprintHeld = held;
  }

  setCrouch(held: boolean): void {
    this.crouchHeld = held;
  }

  setAudioEnabled(enabled: boolean): void {
    this.audio.setEnabled(enabled);
  }

  setCameraMode(mode: CameraMode): void {
    const leavingCutscene = this.cutsceneShot >= 0;
    this.cameraMode = mode;
    this.cutsceneShot = -1;
    if (leavingCutscene) this.cameraYawTarget = Math.PI;
    this.cameraDistance = mode === 'cinematic' ? 2.2 : mode === 'third-close' ? 1.72 : 0.08;
    this.cameraPitchTarget = mode === 'cinematic' ? 0.27 : mode === 'third-close' ? 0.2 : 0.04;
    this.cameraCollisionTimer = 0;
    if (this.playerVisual) this.playerVisual.visible = mode !== 'first-person';
  }

  setCutsceneShot(index: number): void {
    this.cutsceneShot = index;
    this.cameraMode = 'cinematic';
    this.cameraDistance = 7.2;
    this.cameraYawTarget = index * 0.48;
    this.cameraPitchTarget = [0.34, 0.22, 0.42, 0.27][index % 4] ?? 0.27;
    if (this.playerVisual) this.playerVisual.visible = true;
  }

  setEnvironment(time: TimePreset, weather: WeatherPreset): void {
    this.timePreset = time;
    this.weatherPreset = weather;
    const palette = this.skyColors[time];
    const hotTint = weather === 'heat';
    const sky = hotTint ? 0xd3c391 : palette.sky;
    const fog = hotTint ? 0xb7a67d : palette.fog;
    this.scene.background = new THREE.Color(sky);
    if (this.scene.fog instanceof THREE.Fog) this.scene.fog.color.setHex(fog);
    if (this.ambientLight) {
      this.ambientLight.intensity = time === 'day' ? palette.ambient : palette.ambient * 0.85;
      this.ambientLight.color.setHex(time === 'night' ? 0x8197c0 : time === 'dusk' ? 0xffc7a2 : 0xc8e9ff);
    }
    if (this.sunLight) {
      this.sunLight.color.setHex(hotTint ? 0xffd28e : palette.sunColor);
      this.sunLight.intensity = weather === 'rain' ? palette.sun * 0.56 : weather === 'heat' ? palette.sun * 1.2 : palette.sun;
      this.sunLight.position.set(
        time === 'dusk' ? -20 : time === 'night' ? 5 : -14,
        time === 'night' ? 16 : time === 'dusk' ? 10 : 25,
        time === 'dusk' ? -18 : time === 'night' ? -8 : 16,
      );
    }
    if (this.fillLight) {
      this.fillLight.intensity = time === 'night' ? 12 : weather === 'rain' ? 20 : 32;
    }
    if (this.rainEffect) this.rainEffect.visible = weather === 'rain';
    if (this.snowEffect) this.snowEffect.visible = weather === 'snow';
    if (weather === 'rain' && this.fillLight) this.fillLight.color.setHex(0x779bb7);
    else if (this.fillLight) this.fillLight.color.setHex(time === 'night' ? 0x7787c5 : 0x59d8ce);
  }

  enterWorkstation(id: string): void {
    const station = this.stations.find((item) => item.challenge.id === id);
    if (!station || !this.playerBody || !this.playerVisual || this.workstationReturn) return;
    this.workstationReturn = {
      position: this.playerPosition.clone(),
      rotation: this.playerVisual.rotation.y,
      rotationX: this.playerVisual.rotation.x,
      scaleY: this.playerVisual.scale.y,
      cameraDistance: this.cameraDistance,
      cameraYaw: this.cameraYaw,
      cameraYawTarget: this.cameraYawTarget,
      cameraPitch: this.cameraPitch,
      cameraPitchTarget: this.cameraPitchTarget,
    };
    this.playerPosition.set(station.seat.x, PLAYER_BODY_CENTER_HEIGHT, station.seat.z);
    this.playerBody.setTranslation({
      x: station.seat.x,
      y: PLAYER_BODY_CENTER_HEIGHT,
      z: station.seat.z,
    }, true);
    this.playerVisual.position.set(station.seat.x, 0.045, station.seat.z);
    this.playerVisual.rotation.y = station.facing;
    this.playerVisual.rotation.x = -0.06;
    this.playerVisual.scale.y = 0.82;
    this.workstationDisplacedNpcs = this.aiCharacters.filter(
      (npc) => npc.group.position.distanceTo(station.seat) < 1.05,
    );
    this.workstationDisplacedNpcs.forEach((npc) => {
      npc.group.visible = false;
    });
    this.cameraFollowPrevious.copy(this.playerPosition);
    this.cameraLead.set(0, 0, 0);
    this.cameraLeadTarget.set(0, 0, 0);
    this.cameraYaw = station.facing + Math.PI;
    this.cameraYawTarget = station.facing + Math.PI;
    this.cameraPitchTarget = 0.13;
    this.cameraDistance = 1.65;
    this.setLocomotion('idle');
  }

  exitWorkstation(): void {
    if (!this.workstationReturn || !this.playerBody || !this.playerVisual) return;
    const {
      position,
      rotation,
      rotationX,
      scaleY,
      cameraDistance,
      cameraYaw,
      cameraYawTarget,
      cameraPitch,
      cameraPitchTarget,
    } = this.workstationReturn;
    this.workstationReturn = null;
    this.workstationDisplacedNpcs.forEach((npc) => {
      npc.group.visible = true;
    });
    this.workstationDisplacedNpcs = [];
    this.playerPosition.copy(position);
    this.playerBody.setTranslation({ x: position.x, y: position.y, z: position.z }, true);
    this.playerVisual.position.set(position.x, position.y - PLAYER_BODY_CENTER_HEIGHT + 0.045, position.z);
    this.playerVisual.rotation.y = rotation;
    this.playerVisual.rotation.x = rotationX;
    this.playerVisual.scale.y = scaleY;
    this.cameraFollowPrevious.copy(position);
    this.cameraLead.set(0, 0, 0);
    this.cameraLeadTarget.set(0, 0, 0);
    this.cameraDistance = cameraDistance;
    this.cameraYaw = cameraYaw;
    this.cameraYawTarget = cameraYawTarget;
    this.cameraPitch = cameraPitch;
    this.cameraPitchTarget = cameraPitchTarget;
  }

  jump(): void {
    if (!this.playing || !this.grounded) return;
    this.jumpQueued = true;
    this.audio.playJump();
  }

  interact(): void {
    if (!this.playing || !this.nearestId) return;
    this.interactionPoseTime = 0.72;
    if (this.nearestId.startsWith('ai:')) {
      const npcId = Number(this.nearestId.slice(3));
      const npc = this.aiCharacters.find((character) => character.id === npcId);
      if (npc) {
        this.audio.playInteract();
        this.callbacks?.onDialogue(npc.speaker, npc.dialogue);
      }
      return;
    }
    if (this.nearestId === 'academy-door') {
      if (!this.completed.has('credentials')) {
        this.audio.playLocked();
        this.callbacks?.onInteract('academy-door-locked');
        return;
      }
      this.audio.playDoor();
      this.openAcademyDoor();
      return;
    }
    if (this.completed.has(this.nearestId)) return;
    this.audio.playInteract();
    this.callbacks?.onInteract(this.nearestId);
  }

  completeChallenge(id: string): void {
    this.completed.add(id);
    const station = this.stations.find((item) => item.challenge.id === id);
    if (!station) return;
    this.particlePulse = 1.4;
    this.audio.playMilestone();
    const ring = station.group.getObjectByName('station-ring');
    if (ring instanceof THREE.Mesh) {
      const material = ring.material as THREE.MeshStandardMaterial;
      material.color.setHex(0x66d4ad);
      material.emissive.setHex(0x225d4b);
    }
  }

  dispose(): void {
    this.initialized = false;
    this.playing = false;
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.resizeObserver?.disconnect();
    this.composer?.dispose();
    this.composer = null;
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
    if (this.particleCloud) {
      this.particleCloud.geometry.dispose();
      this.particleCloud.material.map?.dispose();
      this.particleCloud.material.dispose();
      this.particleCloud = null;
    }
    this.audio.dispose();
    if (this.characterController && this.physics) {
      this.physics.removeCharacterController(this.characterController);
      this.characterController = null;
    }
    this.playerBody = null;
    this.playerCollider = null;
    this.doorCollider = null;
    this.physics = null;
    this.renderer = null;
    this.physics = null;
  }

  private readonly tick = (): void => {
    if (!this.initialized || !this.renderer) return;
    const delta = Math.min(this.clock.getDelta(), 1 / 24);
    if (this.playing) this.updatePlayer(delta);
    this.updateAria(delta);
    this.updateDoor(delta);
    this.updateCamera(delta);
    this.updateParticles(delta);
    this.updateWeatherEffects(delta);
    for (const [index, cloud] of this.outdoorClouds.entries()) {
      cloud.position.x += delta * (0.18 + (index % 3) * 0.05);
      if (cloud.position.x > 74) cloud.position.x = -74;
    }
    this.updateNearbyStation();
    this.mapUpdateTimer -= delta;
    if (this.mapUpdateTimer <= 0) {
      this.callbacks?.onMapUpdate({
        x: this.playerPosition.x,
        z: this.playerPosition.z,
        yaw: this.cameraYaw,
      });
      this.mapUpdateTimer = 0.1;
    }
    this.mixer?.update(delta);
    this.updateAiCharacters(delta);
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
    this.animationFrame = requestAnimationFrame(this.tick);
  };

  private createLights(): void {
    this.ambientLight = new THREE.HemisphereLight(0xc8e9ff, 0x29343b, 1.8);
    this.scene.add(this.ambientLight);
    const key = new THREE.DirectionalLight(0xffe6c6, 3.1);
    this.sunLight = key;
    key.position.set(-14, 25, 16);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -34;
    key.shadow.camera.right = 34;
    key.shadow.camera.top = 34;
    key.shadow.camera.bottom = -34;
    this.scene.add(key);
    const fill = new THREE.PointLight(0x59d8ce, 32, 46, 2);
    this.fillLight = fill;
    fill.position.set(0, 8, 1);
    this.scene.add(fill);
  }

  private createWorld(): void {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 90),
      new THREE.MeshStandardMaterial({ color: 0x303d43, roughness: 0.96, metalness: 0.05 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const grid = new THREE.GridHelper(80, 40, 0x647b79, 0x435252);
    grid.position.y = 0.018;
    const gridMaterial = grid.material as THREE.Material;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.22;
    this.scene.add(grid);

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(21, 22, 1.4, 64),
      new THREE.MeshStandardMaterial({ color: 0x43555a, roughness: 0.8, metalness: 0.14 }),
    );
    platform.position.set(0, -0.83, 0);
    platform.receiveShadow = true;
    platform.castShadow = true;
    this.scene.add(platform);
    this.createOutdoorGarden();
    this.createWeatherEffects();

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(3.1, 3.5, 0.2, 48),
      new THREE.MeshStandardMaterial({ color: 0x557273, roughness: 0.55, metalness: 0.25, emissive: 0x182b2a }),
    );
    hub.position.set(0, 0.04, 14);
    this.scene.add(hub);
    this.addAcademyArchitecture();
    this.addAcademyPerimeter();
    this.addAcademyDoor();
  }

  private createOutdoorGarden(): void {
    const lawn = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 150),
      new THREE.MeshStandardMaterial({ color: 0x536d4c, roughness: 0.96 }),
    );
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(0, 0.006, -96);
    lawn.receiveShadow = true;
    this.scene.add(lawn);

    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(7.5, 145),
      new THREE.MeshStandardMaterial({ color: 0xaaa18b, roughness: 0.9 }),
    );
    path.rotation.x = -Math.PI / 2;
    path.position.set(-5.9, 0.014, -96);
    path.receiveShadow = true;
    this.scene.add(path);

    const pathEdgeMaterial = new THREE.MeshStandardMaterial({ color: 0x74866b, roughness: 0.88 });
    for (const x of [-10.05, -1.75]) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 144), pathEdgeMaterial);
      edge.position.set(x, 0.055, -96);
      this.scene.add(edge);
    }

    const mountainPalette = [0x526b67, 0x637b73, 0x4e6264, 0x718078];
    const mountainSpots: [number, number, number, number][] = [
      [-90, -150, 42, 76], [-48, -162, 34, 60], [-4, -170, 47, 86],
      [48, -163, 38, 70], [92, -151, 46, 80],
    ];
    mountainSpots.forEach(([x, z, radius, height], index) => {
      const mountain = new THREE.Group();
      const peak = new THREE.Mesh(
        new THREE.ConeGeometry(radius, height, 7, 2),
        new THREE.MeshStandardMaterial({ color: mountainPalette[index % mountainPalette.length], roughness: 1 }),
      );
      peak.position.y = height / 2 - 0.1;
      mountain.add(peak);
      const snowCap = new THREE.Mesh(
        new THREE.ConeGeometry(radius * 0.34, height * 0.34, 7, 1),
        new THREE.MeshStandardMaterial({ color: 0xd7e0d6, roughness: 0.92 }),
      );
      snowCap.position.y = height * 0.79;
      mountain.add(snowCap);
      mountain.position.set(x, -0.02, z);
      this.scene.add(mountain);
    });

    const treeSpots: [number, number, 'pine' | 'palm' | 'broadleaf', number][] = [
      [-28, -34, 'pine', 1], [-19, -43, 'palm', 0.9], [-31, -53, 'broadleaf', 1.05],
      [-22, -66, 'pine', 1.2], [-34, -80, 'palm', 0.82], [-23, -94, 'pine', 1.1],
      [12, -32, 'pine', 0.9], [22, -41, 'palm', 0.9], [31, -50, 'broadleaf', 0.95],
      [17, -63, 'pine', 1.1], [29, -74, 'palm', 0.8], [21, -88, 'broadleaf', 1.05],
      [35, -99, 'pine', 1.2], [-12, -39, 'broadleaf', 0.78], [9, -53, 'palm', 0.85],
      [-15, -75, 'pine', 0.88], [12, -95, 'pine', 0.9],
    ];
    for (const [x, z, type, scale] of treeSpots) this.addGardenTree(x, z, type, scale);

    for (let index = 0; index < 7; index += 1) {
      const cloud = new THREE.Group();
      const material = new THREE.MeshStandardMaterial({
        color: 0xe7f0ed,
        roughness: 1,
        transparent: true,
        opacity: 0.76,
      });
      for (let puff = 0; puff < 4; puff += 1) {
        const cloudPuff = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), material);
        cloudPuff.position.set((puff - 1.5) * 1.3, Math.sin(puff * 1.7) * 0.42, Math.cos(puff) * 0.5);
        cloudPuff.scale.set(2.4 - (puff % 2) * 0.25, 0.82, 1.25);
        cloud.add(cloudPuff);
      }
      cloud.position.set(-55 + index * 17, 26 + (index % 3) * 6, -55 - (index % 4) * 23);
      this.scene.add(cloud);
      this.outdoorClouds.push(cloud);
    }
  }

  private addGardenTree(
    x: number,
    z: number,
    type: 'pine' | 'palm' | 'broadleaf',
    scale: number,
  ): void {
    const tree = new THREE.Group();
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: type === 'palm' ? 0x8c704a : 0x5c4938, roughness: 1 });
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(type === 'palm' ? 0.18 : 0.24, type === 'palm' ? 0.34 : 0.4, 3.2, 7),
      trunkMaterial,
    );
    trunk.position.y = 1.6;
    trunk.castShadow = true;
    tree.add(trunk);
    if (type === 'pine') {
      const foliage = new THREE.MeshStandardMaterial({ color: 0x345944, roughness: 1 });
      for (let tier = 0; tier < 4; tier += 1) {
        const crown = new THREE.Mesh(new THREE.ConeGeometry(1.75 - tier * 0.3, 2.6, 8), foliage);
        crown.position.y = 2.1 + tier * 1.05;
        crown.castShadow = tier < 2;
        tree.add(crown);
      }
    } else if (type === 'palm') {
      trunk.rotation.z = -0.08;
      const leaves = new THREE.MeshStandardMaterial({ color: 0x56834e, roughness: 0.9, side: THREE.DoubleSide });
      for (let leaf = 0; leaf < 7; leaf += 1) {
        const angle = (leaf / 7) * Math.PI * 2;
        const frond = new THREE.Mesh(new THREE.ConeGeometry(0.32, 3.8, 5), leaves);
        frond.position.set(Math.sin(angle) * 1.15, 3.4, Math.cos(angle) * 1.15);
        frond.rotation.z = Math.cos(angle) * 0.9;
        frond.rotation.x = Math.sin(angle) * 0.9;
        tree.add(frond);
      }
    } else {
      const canopy = new THREE.MeshStandardMaterial({ color: 0x54794f, roughness: 1 });
      for (let puff = 0; puff < 5; puff += 1) {
        const crown = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), canopy);
        crown.position.set(Math.cos(puff * 1.25) * 0.75, 3.1 + (puff % 2) * 0.55, Math.sin(puff * 1.25) * 0.75);
        crown.castShadow = puff === 0;
        tree.add(crown);
      }
    }
    tree.scale.setScalar(scale);
    tree.position.set(x, 0, z);
    this.scene.add(tree);
    this.staticBoxColliders.push({ position: [x, 1.4, z], halfExtents: [0.32 * scale, 1.4 * scale, 0.32 * scale] });
  }

  private createWeatherEffects(): void {
    const rainCount = 340;
    this.rainPositions = new Float32Array(rainCount * 6);
    this.rainSpeeds = new Float32Array(rainCount);
    for (let index = 0; index < rainCount; index += 1) {
      this.rainPositions[index * 6] = (Math.random() - 0.5) * 34;
      this.rainPositions[index * 6 + 1] = Math.random() * 18;
      this.rainPositions[index * 6 + 2] = (Math.random() - 0.5) * 34;
      this.rainPositions[index * 6 + 3] = this.rainPositions[index * 6]!;
      this.rainPositions[index * 6 + 4] = this.rainPositions[index * 6 + 1] - 0.42;
      this.rainPositions[index * 6 + 5] = this.rainPositions[index * 6 + 2]!;
      this.rainSpeeds[index] = 18 + Math.random() * 9;
    }
    const rainGeometry = new THREE.BufferGeometry();
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    this.rainEffect = new THREE.LineSegments(
      rainGeometry,
      new THREE.LineBasicMaterial({ color: 0x9fcee0, transparent: true, opacity: 0.45 }),
    );
    this.rainEffect.visible = false;
    this.scene.add(this.rainEffect);

    const snowCount = 480;
    this.snowPositions = new Float32Array(snowCount * 3);
    this.snowSpeeds = new Float32Array(snowCount);
    for (let index = 0; index < snowCount; index += 1) {
      this.snowPositions[index * 3] = (Math.random() - 0.5) * 34;
      this.snowPositions[index * 3 + 1] = Math.random() * 18;
      this.snowPositions[index * 3 + 2] = (Math.random() - 0.5) * 34;
      this.snowSpeeds[index] = 1.2 + Math.random() * 2.3;
    }
    const snowGeometry = new THREE.BufferGeometry();
    snowGeometry.setAttribute('position', new THREE.BufferAttribute(this.snowPositions, 3));
    this.snowEffect = new THREE.Points(
      snowGeometry,
      new THREE.PointsMaterial({ color: 0xf0f6ff, size: 0.12, transparent: true, opacity: 0.84, sizeAttenuation: true }),
    );
    this.snowEffect.visible = false;
    this.scene.add(this.snowEffect);
  }

  private addAcademyPerimeter(): void {
    const fenceMaterial = new THREE.MeshStandardMaterial({ color: 0x485b4d, roughness: 0.86, metalness: 0.16 });
    const railMaterial = new THREE.MeshStandardMaterial({ color: 0x81947a, roughness: 0.62, metalness: 0.35 });
    const addHorizontalFence = (z: number, startX: number, endX: number): void => {
      const length = endX - startX;
      const centerX = (startX + endX) / 2;
      const hedge = new THREE.Mesh(new THREE.BoxGeometry(length, 0.9, 0.36), fenceMaterial);
      hedge.position.set(centerX, 0.45, z);
      hedge.castShadow = true;
      hedge.receiveShadow = true;
      this.scene.add(hedge);
      for (const y of [1.25, 2.65]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(length, 0.12, 0.15), railMaterial);
        rail.position.set(centerX, y, z);
        this.scene.add(rail);
      }
      for (let x = startX; x <= endX; x += 2.4) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.9, 0.18), railMaterial);
        post.position.set(x, 1.45, z);
        this.scene.add(post);
      }
      this.staticBoxColliders.push({ position: [centerX, 2, z], halfExtents: [length / 2, 2, 0.22] });
    };
    const addSideFence = (x: number): void => {
      const length = 50;
      const centerZ = -1;
      const hedge = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.9, length), fenceMaterial);
      hedge.position.set(x, 0.45, centerZ);
      this.scene.add(hedge);
      for (const y of [1.25, 2.65]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, length), railMaterial);
        rail.position.set(x, y, centerZ);
        this.scene.add(rail);
      }
      for (let z = -26; z <= 24; z += 2.4) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.9, 0.14), railMaterial);
        post.position.set(x, 1.45, z);
        this.scene.add(post);
      }
      this.staticBoxColliders.push({ position: [x, 2, centerZ], halfExtents: [0.22, 2, length / 2] });
    };
    addSideFence(-24);
    addSideFence(24);
    addHorizontalFence(24, -24, 24);
    addHorizontalFence(-26, -24, -8.7);
    addHorizontalFence(-26, -3.1, 24);

    const gateMaterial = new THREE.MeshStandardMaterial({
      color: 0x9db08d,
      roughness: 0.48,
      metalness: 0.28,
      emissive: 0x1b2b1d,
    });
    for (const x of [-8.65, -3.15]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.42, 4.1, 0.46), gateMaterial);
      post.position.set(x, 2.05, -26);
      post.castShadow = true;
      this.scene.add(post);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(5.9, 0.36, 0.46), gateMaterial);
    lintel.position.set(-5.9, 4.05, -26);
    this.scene.add(lintel);
  }

  private addAcademyArchitecture(): void {
    const buildingMaterial = new THREE.MeshStandardMaterial({ color: 0x59676b, roughness: 0.72, metalness: 0.16 });
    const trimMaterial = new THREE.MeshStandardMaterial({
      color: 0x78beb4,
      roughness: 0.45,
      metalness: 0.3,
      emissive: 0x17413b,
    });
    for (const [x, z, width, height, depth] of [
      [-17, -8, 8, 9, 7],
      [17, -7, 8, 11, 8],
      [-15, 13, 7, 8, 6],
      [15, 14, 8, 9, 7],
      [0, -18, 12, 12, 7],
    ]) {
      const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), buildingMaterial.clone());
      building.position.set(x, height / 2 - 0.05, z);
      building.castShadow = true;
      building.receiveShadow = true;
      this.scene.add(building);
      this.staticBoxColliders.push({ position: [x, height / 2, z], halfExtents: [width / 2, height / 2, depth / 2] });
      const top = new THREE.Mesh(new THREE.BoxGeometry(width * 0.74, 0.18, depth + 0.12), trimMaterial);
      top.position.set(x, height - 0.2, z);
      this.scene.add(top);
      for (let floor = 1; floor < Math.floor(height / 2.5); floor += 1) {
        const windows = new THREE.Mesh(new THREE.BoxGeometry(width * 0.74, 0.16, 0.12), trimMaterial);
        windows.position.set(x, floor * 2.5, z + depth / 2 + 0.07);
        this.scene.add(windows);
      }
    }

    for (const [x, z] of [
      [-18, -18],
      [-18, 18],
      [18, -18],
      [18, 18],
    ]) {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.32, 3.2, 8),
        new THREE.MeshStandardMaterial({ color: 0x879080, roughness: 0.68, metalness: 0.14 }),
      );
      pillar.position.set(x, 1.6, z);
      pillar.castShadow = true;
      this.scene.add(pillar);
      this.staticBoxColliders.push({
        position: [pillar.position.x, pillar.position.y, pillar.position.z],
        halfExtents: [0.34, 1.6, 0.34],
      });
    }

    const portal = new THREE.Group();
    const archMat = new THREE.MeshStandardMaterial({
      color: 0x90b9af,
      roughness: 0.44,
      metalness: 0.25,
      emissive: 0x244d43,
    });
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.52, 5.2, 0.65), archMat);
    left.position.set(-2.2, 2.6, 0);
    const right = left.clone();
    right.position.x = 2.2;
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.6, 0.7), archMat);
    lintel.position.set(0, 5.1, 0);
    portal.add(left, right, lintel);
    portal.position.set(0, 0, -18);
    this.scene.add(portal);
    const gateLight = new THREE.PointLight(0x74d9c0, 22, 17);
    gateLight.position.set(0, 3.2, -18);
    this.scene.add(gateLight);
  }

  private addAcademyDoor(): void {
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x657d72,
      roughness: 0.38,
      metalness: 0.42,
      emissive: 0x10251c,
    });
    const doorMaterial = new THREE.MeshStandardMaterial({
      color: 0x786447,
      roughness: 0.68,
      metalness: 0.18,
    });
    const trimMaterial = new THREE.MeshStandardMaterial({
      color: 0xd3ad69,
      roughness: 0.3,
      metalness: 0.58,
      emissive: 0x3e2d12,
    });
    const frame = new THREE.Group();
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.26, 3.5, 0.42), frameMaterial);
    left.position.set(-1.63, 1.75, 0);
    const right = left.clone();
    right.position.x = 1.63;
    const header = new THREE.Mesh(new THREE.BoxGeometry(3.52, 0.3, 0.46), frameMaterial);
    header.position.set(0, 3.55, 0);
    frame.add(left, right, header);

    const pivot = new THREE.Group();
    pivot.position.set(-1.48, 0, 0);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(2.94, 3.12, 0.17), doorMaterial);
    panel.position.set(1.47, 1.56, 0);
    panel.castShadow = true;
    panel.receiveShadow = true;
    pivot.add(panel);

    const inset = new THREE.Mesh(new THREE.BoxGeometry(2.42, 2.48, 0.045), frameMaterial);
    inset.position.set(1.47, 1.62, 0.11);
    pivot.add(inset);
    const accent = new THREE.Mesh(new THREE.BoxGeometry(0.13, 1.86, 0.05), trimMaterial);
    accent.position.set(0.58, 1.62, 0.145);
    pivot.add(accent);
    const handle = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 8), trimMaterial);
    handle.position.set(2.58, 1.55, 0.18);
    pivot.add(handle);

    const keypad = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.58, 0.13),
      new THREE.MeshStandardMaterial({ color: 0x344c47, roughness: 0.35, metalness: 0.35 }),
    );
    keypad.position.set(2.08, 1.23, 0.36);
    const keypadLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.075, 0.035),
      new THREE.MeshBasicMaterial({ color: 0x89d7aa }),
    );
    keypadLight.position.set(2.08, 1.38, 0.44);

    const door = new THREE.Group();
    door.position.set(ACADEMY_DOOR_POSITION[0], 0, ACADEMY_DOOR_POSITION[1]);
    door.scale.set(0.55, 0.72, 1);
    door.add(frame, pivot, keypad, keypadLight);
    const label = this.createTextSprite('SECURITY WING');
    label.position.set(0, 4.12, 0.1);
    label.scale.set(3.6, 0.66, 1);
    door.add(label);
    this.scene.add(door);
    this.doorPivot = pivot;
  }

  private createPhysics(): void {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    world.timestep = 1 / 60;
    const floor = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.25, 0));
    world.createCollider(RAPIER.ColliderDesc.cuboid(120, 0.25, 120), floor);

    const worldBoundaries: StaticBoxCollider[] = [
      { position: [0, 8, -108], halfExtents: [42, 8, 0.5] },
      { position: [0, 8, 26], halfExtents: [42, 8, 0.5] },
      { position: [-42, 8, -41], halfExtents: [0.5, 8, 67] },
      { position: [42, 8, -41], halfExtents: [0.5, 8, 67] },
    ];
    for (const collider of [...worldBoundaries, ...this.staticBoxColliders]) {
      const wall = world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(...collider.position),
      );
      world.createCollider(RAPIER.ColliderDesc.cuboid(...collider.halfExtents), wall);
    }

    const doorBody = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(
        ACADEMY_DOOR_POSITION[0],
        1.13,
        ACADEMY_DOOR_POSITION[1],
      ),
    );
    this.doorCollider = world.createCollider(RAPIER.ColliderDesc.cuboid(0.81, 1.13, 0.12), doorBody);

    this.playerBody = world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
        this.playerPosition.x,
        PLAYER_BODY_CENTER_HEIGHT,
        this.playerPosition.z,
      ),
    );
    this.playerCollider = world.createCollider(
      RAPIER.ColliderDesc.capsule(PLAYER_CAPSULE_HALF_HEIGHT, PLAYER_CAPSULE_RADIUS),
      this.playerBody,
    );
    this.characterController = world.createCharacterController(0.035);
    this.characterController.setMaxSlopeClimbAngle(Math.PI / 4);
    this.characterController.enableAutostep(0.28, 0.2, true);
    this.characterController.enableSnapToGround(0.18);
    this.physics = world;
  }

  private addLevelColliders(level: THREE.Group): void {
    const physics = this.physics;
    if (!physics) return;
    level.updateMatrixWorld(true);
    level.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if (/^(kompuer|komputer|computer|meja|kursi|lemari)/i.test(object.name)) {
        const bounds = new THREE.Box3().setFromObject(object);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        if (size.x > 0.1 && size.y > 0.1 && size.z > 0.1) {
          const body = physics.createRigidBody(
            RAPIER.RigidBodyDesc.fixed().setTranslation(center.x, center.y, center.z),
          );
          physics.createCollider(
            RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2),
            body,
          );
        }
        return;
      }
      if (!/^(dinding|wall|lantai_?\d+|floor|ground)/i.test(object.name)) return;
      const geometry = object.geometry;
      const position = geometry.getAttribute('position');
      if (!position || position.count < 3) return;
      const worldVertices = new Float32Array(position.count * 3);
      const vertex = new THREE.Vector3();
      for (let index = 0; index < position.count; index += 1) {
        vertex.fromBufferAttribute(position, index).applyMatrix4(object.matrixWorld);
        vertex.toArray(worldVertices, index * 3);
      }

      const sourceIndexCount = geometry.index?.count ?? position.count;
      const indices: number[] = [];
      for (let index = 0; index + 2 < sourceIndexCount; index += 3) {
        const a = geometry.index?.getX(index) ?? index;
        const b = geometry.index?.getX(index + 1) ?? index + 1;
        const c = geometry.index?.getX(index + 2) ?? index + 2;
        const centerX = (worldVertices[a * 3]! + worldVertices[b * 3]! + worldVertices[c * 3]!) / 3;
        const centerY = (worldVertices[a * 3 + 1]! + worldVertices[b * 3 + 1]! + worldVertices[c * 3 + 1]!) / 3;
        const centerZ = (worldVertices[a * 3 + 2]! + worldVertices[b * 3 + 2]! + worldVertices[c * 3 + 2]!) / 3;
        const isDoorway =
          /^(dinding|wall)/i.test(object.name) &&
          centerY >= 0 &&
          centerY < 2.45 &&
          Math.abs(centerX - ACADEMY_DOOR_POSITION[0]) < 1.05 &&
          Math.abs(centerZ - ACADEMY_DOOR_POSITION[1]) < 0.32;
        if (!isDoorway) indices.push(a, b, c);
      }
      if (indices.length < 3) return;
      try {
        const body = physics.createRigidBody(RAPIER.RigidBodyDesc.fixed());
        physics.createCollider(RAPIER.ColliderDesc.trimesh(worldVertices, Uint32Array.from(indices)), body);
      } catch (error) {
        console.error(`Collider level gagal dibuat untuk ${object.name}.`, error);
      }
    });
  }

  private async loadLevel(): Promise<void> {
    try {
      const level = await this.loader.loadAsync(`${ASSET_BASE}level/academy.fbx`);
      const bounds = new THREE.Box3().setFromObject(level);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      if (!Number.isFinite(size.x) || size.length() === 0) throw new Error('Model level tidak memiliki geometri.');

      level.scale.setScalar(42 / Math.max(size.x, size.z, size.y * 1.5));
      level.position.set(-center.x * level.scale.x, -bounds.min.y * level.scale.y, -center.z * level.scale.z);
      level.position.z -= 3;
      level.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const name = object.name.toLowerCase();
        this.cameraOccluders.push(object);
        if (name === 'pintu_terkunci_' || /^pintu_masuk_(kiri|kanan)$/.test(name)) object.visible = false;
        const category = this.materialCategoryForName(name);
        if (/layar|monitor|screen|display/.test(name)) {
          const texture = this.computerScreenTexture();
          object.material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            map: texture,
            emissive: 0x66e4cd,
            emissiveMap: texture,
            emissiveIntensity: 0.8,
            roughness: 0.42,
            metalness: 0.04,
          });
        } else {
          object.material = new THREE.MeshStandardMaterial({
            color: this.materialColorForName(name),
            map: this.levelTexture(category),
            emissive: /komputer|computer/.test(name) ? 0x0b2824 : 0x000000,
            emissiveIntensity: /komputer|computer/.test(name) ? 0.28 : 0,
            roughness: category === 'glass' ? 0.32 : category === 'metal' ? 0.4 : 0.78,
            metalness: category === 'metal' ? 0.38 : category === 'glass' ? 0.2 : 0.05,
            flatShading: false,
          });
        }
        const setDoubleSided = (material: THREE.Material) => {
          material.side = THREE.DoubleSide;
        };
        if (Array.isArray(object.material)) object.material.forEach(setDoubleSided);
        else setDoubleSided(object.material);
        object.castShadow = true;
        object.receiveShadow = true;
        object.geometry.computeVertexNormals();
      });
      this.scene.add(level);
      level.traverse((object) => {
        if (!(object instanceof THREE.Mesh) || !/komputer|computer/i.test(object.name)) return;
        const position = object.getWorldPosition(new THREE.Vector3());
        const light = new THREE.PointLight(0x61d8c6, 1.8, 4, 2);
        light.position.set(position.x, position.y + 0.75, position.z);
        this.scene.add(light);
      });
      this.addLevelColliders(level);
    } catch (error) {
      console.error('Gagal memuat model level academy.fbx.', error);
      this.callbacks?.onError('Model level FBX gagal dimuat. Area akademi tetap bisa dimainkan dengan lingkungan warna pengganti.');
    }

    learningChallenges.forEach((challenge, index) => {
      const [x, z] = STATION_POSITIONS[index] ?? [0, 0];
      const position = new THREE.Vector3(x, 0, z);
      const seat = STATION_SEATS[index] ?? { x, z: z + 1.05, facing: Math.PI };
      const group = this.createStation(challenge, position, index);
      this.scene.add(group);
      this.stations.push({
        challenge,
        group,
        position,
        seat: new THREE.Vector3(seat.x, 0, seat.z),
        facing: seat.facing,
      });
    });
    this.createAmbientParticles();
  }

  private materialColorForName(name: string): number {
    if (/glass|window|jendela|kaca/.test(name)) return 0x9abdb7;
    if (/lantai|floor|ground/.test(name)) return 0x8c8a78;
    if (/dinding|wall|tembok/.test(name)) return 0x9b9b8a;
    if (/pintu|door|meja|kursi|lemari/.test(name)) return 0x876b50;
    if (/lift|metal|besi|angka|tombol/.test(name)) return 0x778783;
    if (/tanaman|daun|rumput/.test(name)) return 0x728966;
    if (/kompuer|komputer|computer|monitor|tv/.test(name)) return 0x465b63;
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0;
    return PALETTE[Math.abs(hash) % PALETTE.length] ?? PALETTE[0]!;
  }

  private materialCategoryForName(name: string): string {
    if (/glass|window|jendela|kaca/.test(name)) return 'glass';
    if (/lantai|floor|ground/.test(name)) return 'floor';
    if (/pintu|door|meja|kursi|lemari/.test(name)) return 'wood';
    if (/lift|metal|besi|angka|tombol/.test(name)) return 'metal';
    if (/tanaman|daun|rumput/.test(name)) return 'organic';
    return 'wall';
  }

  private levelTexture(category: string): THREE.CanvasTexture {
    const cached = this.levelTextures.get(category);
    if (cached) return cached;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D tidak tersedia untuk material level.');
    context.fillStyle = '#e5e5e5';
    context.fillRect(0, 0, canvas.width, canvas.height);

    let seed = category.split('').reduce((value, char) => value * 31 + char.charCodeAt(0), 17);
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    for (let i = 0; i < 780; i += 1) {
      const shade = Math.round(196 + random() * 48);
      context.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${0.08 + random() * 0.12})`;
      const size = category === 'organic' ? 2 + random() * 5 : 1 + random() * 3;
      context.fillRect(random() * 256, random() * 256, size, size);
    }

    if (category === 'floor') {
      context.strokeStyle = 'rgba(86, 91, 83, 0.24)';
      context.lineWidth = 2;
      for (let offset = 0; offset <= 256; offset += 64) {
        context.beginPath();
        context.moveTo(offset, 0);
        context.lineTo(offset, 256);
        context.moveTo(0, offset);
        context.lineTo(256, offset);
        context.stroke();
      }
    } else if (category === 'wall') {
      context.strokeStyle = 'rgba(88, 98, 91, 0.2)';
      context.lineWidth = 3;
      for (let offset = 0; offset <= 256; offset += 64) {
        context.strokeRect(8, offset + 8, 112, 52);
        context.strokeRect(136, offset + 8, 112, 52);
      }
    } else if (category === 'wood') {
      context.strokeStyle = 'rgba(99, 69, 43, 0.17)';
      context.lineWidth = 2;
      for (let offset = 0; offset <= 256; offset += 13) {
        context.beginPath();
        context.moveTo(0, offset + random() * 5);
        context.bezierCurveTo(80, offset - 6, 166, offset + 7, 256, offset + random() * 4);
        context.stroke();
      }
    } else if (category === 'metal') {
      context.strokeStyle = 'rgba(53, 74, 72, 0.2)';
      context.lineWidth = 2;
      for (let offset = 16; offset < 256; offset += 48) {
        context.strokeRect(12, offset, 232, 24);
        context.fillStyle = 'rgba(63, 105, 94, 0.24)';
        context.fillRect(22, offset + 8, 7, 7);
        context.fillRect(227, offset + 8, 7, 7);
      }
    } else if (category === 'glass') {
      context.fillStyle = 'rgba(119, 170, 159, 0.16)';
      for (let offset = 0; offset < 256; offset += 48) context.fillRect(0, offset, 256, 8);
    } else {
      context.strokeStyle = 'rgba(77, 104, 68, 0.18)';
      for (let i = 0; i < 70; i += 1) {
        const x = random() * 256;
        const y = random() * 256;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + (random() - 0.5) * 24, y + 8 + random() * 20);
        context.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    this.levelTextures.set(category, texture);
    return texture;
  }

  private computerScreenTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 160;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D tidak tersedia untuk layar komputer.');
    context.fillStyle = '#071a1c';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#43a891';
    context.fillRect(16, 18, 92, 6);
    context.fillRect(16, 38, 154, 3);
    context.fillRect(16, 49, 124, 3);
    context.fillRect(16, 60, 176, 3);
    context.fillStyle = '#27746e';
    context.fillRect(16, 85, 224, 52);
    context.fillStyle = '#82e3bf';
    context.fillRect(25, 96, 118, 4);
    context.fillRect(25, 108, 183, 3);
    context.fillRect(25, 119, 142, 3);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }

  private createStation(challenge: LearningChallenge, position: THREE.Vector3, index: number): THREE.Group {
    const group = new THREE.Group();
    group.position.copy(position);
    group.userData.id = challenge.id;
    const colors = [0x79c4b4, 0xd5a36d, 0x81a8d7, 0xd39179, 0xc3a0dc];
    const accent = colors[index % colors.length] ?? 0x79c4b4;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.028, 8, 40),
      new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.32 }),
    );
    ring.name = 'station-ring';
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.035;
    group.add(ring);
    const label = this.createTextSprite(challenge.station.toUpperCase());
    label.position.y = 2.05;
    label.scale.set(2.4, 0.48, 1);
    group.add(label);
    return group;
  }

  private createAmbientParticles(): void {
    const count = this.stations.length * 10;
    const positions = new Float32Array(count * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
    );

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D tidak tersedia untuk partikel ambience.');
    const glow = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    glow.addColorStop(0, 'rgba(230, 255, 242, 1)');
    glow.addColorStop(0.25, 'rgba(158, 238, 198, 0.8)');
    glow.addColorStop(1, 'rgba(115, 214, 174, 0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, 32, 32);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.PointsMaterial({
      color: 0xb9f3d0,
      size: 0.28,
      map: texture,
      transparent: true,
      opacity: 0.56,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const cloud = new THREE.Points(geometry, material);
    cloud.frustumCulled = false;
    this.scene.add(cloud);
    this.particleCloud = cloud;
    this.particleOrbits = Array.from({ length: count }, (_value, index) => {
      const station = this.stations[index % this.stations.length]!;
      return {
        centerX: station.position.x,
        centerZ: station.position.z,
        radius: 0.62 + (index % 5) * 0.16,
        phase: index * 2.399,
        speed: 0.18 + (index % 4) * 0.035,
        height: 0.72 + (index % 6) * 0.25,
      };
    });
  }

  private updateParticles(delta: number): void {
    if (!this.particleCloud) return;
    this.particlePulse = Math.max(0, this.particlePulse - delta);
    this.particleCloud.material.opacity = 0.48 + this.particlePulse * 0.18;
    const positions = this.particleCloud.geometry.getAttribute('position') as THREE.BufferAttribute;
    const values = positions.array as Float32Array;
    const time = this.clock.elapsedTime;
    this.particleOrbits.forEach((particle, index) => {
      const angle = time * particle.speed + particle.phase;
      values[index * 3] = particle.centerX + Math.cos(angle) * particle.radius;
      values[index * 3 + 1] = particle.height + Math.sin(time * 0.58 + particle.phase) * 0.2;
      values[index * 3 + 2] = particle.centerZ + Math.sin(angle) * particle.radius;
    });
    positions.needsUpdate = true;
  }

  private updateWeatherEffects(delta: number): void {
    const centerX = this.playerPosition.x;
    const centerZ = this.playerPosition.z;
    if (this.rainEffect?.visible) {
      this.rainEffect.position.set(centerX, 0, centerZ);
      for (let index = 0; index < this.rainSpeeds.length; index += 1) {
        const offset = index * 6;
        this.rainPositions[offset + 1] = (this.rainPositions[offset + 1] ?? 0) - this.rainSpeeds[index]! * delta;
        if (this.rainPositions[offset + 1]! < 0) {
          this.rainPositions[offset] = (Math.random() - 0.5) * 34;
          this.rainPositions[offset + 1] = 15 + Math.random() * 7;
          this.rainPositions[offset + 2] = (Math.random() - 0.5) * 34;
        }
        this.rainPositions[offset + 3] = this.rainPositions[offset]!;
        this.rainPositions[offset + 4] = this.rainPositions[offset + 1]! - 0.42;
        this.rainPositions[offset + 5] = this.rainPositions[offset + 2]!;
      }
      const position = this.rainEffect.geometry.getAttribute('position') as THREE.BufferAttribute;
      position.needsUpdate = true;
    }
    if (this.snowEffect?.visible) {
      this.snowEffect.position.set(centerX, 0, centerZ);
      for (let index = 0; index < this.snowSpeeds.length; index += 1) {
        const offset = index * 3;
        this.snowPositions[offset + 1] = (this.snowPositions[offset + 1] ?? 0) - this.snowSpeeds[index]! * delta;
        this.snowPositions[offset] = (this.snowPositions[offset] ?? 0) + Math.sin(this.clock.elapsedTime + index) * 0.25 * delta;
        if (this.snowPositions[offset + 1]! < 0) {
          this.snowPositions[offset] = (Math.random() - 0.5) * 34;
          this.snowPositions[offset + 1] = 14 + Math.random() * 8;
          this.snowPositions[offset + 2] = (Math.random() - 0.5) * 34;
        }
      }
      const position = this.snowEffect.geometry.getAttribute('position') as THREE.BufferAttribute;
      position.needsUpdate = true;
    }
  }

  private createTextSprite(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D tidak tersedia untuk label stasiun.');
    context.fillStyle = 'rgba(12, 23, 31, 0.82)';
    context.beginPath();
    context.roundRect(8, 8, 496, 80, 18);
    context.fill();
    context.font = '600 32px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#e8f4ed';
    context.fillText(text, 256, 49);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
    return sprite;
  }

  private async loadCharacter(): Promise<void> {
    try {
      const model = await this.loader.loadAsync(`${ASSET_BASE}character/player.fbx`);
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      if (!Number.isFinite(size.y) || size.y === 0) throw new Error('Model karakter tidak memiliki tinggi yang valid.');
      model.scale.setScalar(PLAYER_VISUAL_HEIGHT / size.y);
      model.position.set(-bounds.getCenter(new THREE.Vector3()).x * model.scale.x, -bounds.min.y * model.scale.y, -bounds.getCenter(new THREE.Vector3()).z * model.scale.z);
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const name = object.name.toLowerCase();
        if (name === 'cube') {
          object.material = [
            this.characterMaterial(0x356b69, 0.72),
            this.characterMaterial(0xc89155, 0.58),
          ];
        } else {
          let color = 0x356b69;
          let roughness = 0.72;
          if (/rambut|hair/.test(name)) {
            color = 0x30252a;
            roughness = 0.84;
          } else if (/mata|pupil|kepala002/.test(name)) {
            color = 0x292a29;
            roughness = 0.38;
          } else if (/kepala001/.test(name)) {
            color = 0xf0dfc7;
            roughness = 0.3;
          } else if (/tangan|hand|arm|skin|face|head|kepala/.test(name)) {
            color = 0xc98763;
            roughness = 0.8;
          } else if (/kaki|leg|shoe|boot/.test(name)) {
            color = 0x293d53;
            roughness = 0.78;
          } else if (/accessory|badge|zip/.test(name)) {
            color = 0xd1a65f;
            roughness = 0.45;
          }
          object.material = this.characterMaterial(color, roughness);
        }
        object.castShadow = true;
        object.receiveShadow = true;
      });
      this.playerVisual = new THREE.Group();
      this.playerVisual.add(model);
      this.playerVisual.position.set(this.playerPosition.x, 0.03, this.playerPosition.z);
      this.scene.add(this.playerVisual);
      this.characterModel = model;
      this.mixer = new THREE.AnimationMixer(model);
      await this.loadAnimations();
      this.createAiCharacters(model);
      this.playAnimation('idle', 0);
    } catch (error) {
      console.error('Gagal memuat model karakter.', error);
      this.callbacks?.onError('Model karakter FBX gagal dimuat. Kontrol dan misi tetap tersedia.');
      this.createFallbackCharacter();
    }
    this.createAria();
  }

  private async loadAnimations(): Promise<void> {
    const clips: [string, string][] = [
      ['idle', 'character_idle.fbx'],
      ['walk', 'character_walk.fbx'],
      ['run', 'character_run.fbx'],
      ['jumpUp', 'character_jump_up.fbx'],
      ['jumpFloat', 'character_jump_idle.fbx'],
      ['jumpDown', 'character_jump_down.fbx'],
    ];
    await Promise.all(
      clips.map(async ([name, file]) => {
        try {
          const asset = await this.loader.loadAsync(`${ASSET_BASE}animations/${file}`);
          const sourceClip = asset.animations[0];
          const tracks = sourceClip?.tracks.filter((track) => !/^Armature\.(position|quaternion|scale)$/.test(track.name));
          if (!sourceClip || sourceClip.duration <= 0.05 || !tracks?.length) {
            console.warn(`Animasi ${file} tidak memiliki keyframe yang bisa diputar; pose gameplay akan digunakan.`);
            return;
          }
          const clip = new THREE.AnimationClip(name, sourceClip.duration, tracks);
          this.animationClips.set(name, clip);
          this.actions.set(name, this.mixer!.clipAction(clip));
        } catch (error) {
          console.error(`Gagal memuat animasi ${file}.`, error);
        }
      }),
    );
  }

  private createAiCharacters(model: THREE.Group): void {
    AI_POSITIONS.forEach(([x, z], index) => {
      const variant = AI_VARIANTS[Math.floor(index / 3)] ?? AI_VARIANTS[0]!;
      const behavior = index < 6 ? 'seated' : 'wander';
      const npcModel = cloneSkeleton(model);
      if (behavior === 'seated') npcModel.position.y -= 0.36;
      npcModel.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const name = object.name.toLowerCase();
        object.castShadow = true;
        object.receiveShadow = true;
        if (name === 'cube') {
          object.material = [
            this.characterMaterial(variant.outfit, 0.72),
            this.characterMaterial(variant.accent, 0.58),
          ];
          return;
        }
        let color = variant.outfit;
        let roughness = 0.72;
        if (/rambut|hair/.test(name)) {
          color = variant.hair;
          roughness = 0.84;
        } else if (/mata|pupil|kepala002/.test(name)) {
          color = 0x292a29;
          roughness = 0.38;
        } else if (/kepala001|tangan|hand|skin|face|head|kepala/.test(name)) {
          color = 0xc98763;
          roughness = 0.8;
        } else if (/kaki|leg|shoe|boot/.test(name)) {
          color = variant.pants;
          roughness = 0.78;
        } else if (/accessory|badge|zip/.test(name)) {
          color = variant.accent;
          roughness = 0.45;
        }
        object.material = this.characterMaterial(color, roughness);
        object.castShadow = true;
        object.receiveShadow = true;
      });

      const group = new THREE.Group();
      group.add(npcModel);
      group.position.set(x, 0.03, z);
      if (behavior === 'seated') {
        const chair = this.createChair(variant.outfit);
        group.add(chair);
        const deskIndex = Math.floor(index / 2);
        const desks: [number, number][] = [[-1.4, 14.87], [-1.29, -10.44], [0.89, -20.38]];
        const [deskX, deskZ] = desks[deskIndex] ?? desks[0]!;
        group.rotation.y = Math.atan2(deskX - x, deskZ - z);
      }
      this.scene.add(group);
      const mixer = new THREE.AnimationMixer(npcModel);
      const idleClip = this.animationClips.get('idle');
      const walkClip = this.animationClips.get('walk');
      const idle = idleClip ? mixer.clipAction(idleClip) : null;
      const walk = walkClip ? mixer.clipAction(walkClip) : null;
      idle?.play();
      this.aiCharacters.push({
        id: index,
        speaker: variant.speaker,
        dialogue: variant.dialogue,
        behavior,
        group,
        mixer,
        idle,
        walk,
        activeAction: idle,
        home: new THREE.Vector3(x, 0.03, z),
        target: new THREE.Vector3(x, 0.03, z),
        wait: (index % 4) * 0.7,
        speed: 0.7 + (index % 3) * 0.12,
        phase: index * 0.73,
      });
    });
  }

  private createChair(color: number): THREE.Group {
    const chair = new THREE.Group();
    const frame = new THREE.MeshStandardMaterial({ color: 0x334347, roughness: 0.62, metalness: 0.24 });
    const cushion = new THREE.MeshStandardMaterial({ color, roughness: 0.78 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 0.58), cushion);
    seat.position.set(0, 0.53, -0.3);
    chair.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.72, 0.1), cushion);
    back.position.set(0, 0.9, -0.57);
    chair.add(back);
    for (const x of [-0.22, 0.22]) {
      for (const z of [-0.5, -0.1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.5, 0.055), frame);
        leg.position.set(x, 0.25, z);
        chair.add(leg);
      }
    }
    chair.traverse((object) => {
      if (object instanceof THREE.Mesh) object.castShadow = true;
    });
    return chair;
  }

  private characterMaterial(color: number, roughness: number): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness: 0.04,
      vertexColors: false,
    });
  }

  private createFallbackCharacter(): void {
    const body = new THREE.Group();
    const suit = new THREE.MeshStandardMaterial({ color: 0x709a8e, roughness: 0.7 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xc79c78, roughness: 0.82 });
    const trousers = new THREE.MeshStandardMaterial({ color: 0x293d53, roughness: 0.78 });
    const hair = new THREE.MeshStandardMaterial({ color: 0x30252a, roughness: 0.84 });
    const eyes = new THREE.MeshStandardMaterial({ color: 0x252a29, roughness: 0.35 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.58, 4, 8), suit);
    torso.position.y = 0.92;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), skin);
    head.position.y = 1.62;
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.255, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.48), hair);
    hairCap.position.set(0, 1.7, -0.02);
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), eyes);
    leftEye.position.set(-0.085, 1.65, 0.225);
    const rightEye = leftEye.clone();
    rightEye.position.x = 0.085;
    const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.46, 3, 8), suit);
    leftArm.position.set(-0.39, 0.98, 0);
    leftArm.rotation.z = -0.12;
    const rightArm = leftArm.clone();
    rightArm.position.x = 0.39;
    rightArm.rotation.z = 0.12;
    const leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.42, 3, 8), trousers);
    leftLeg.position.set(-0.16, 0.31, 0);
    const rightLeg = leftLeg.clone();
    rightLeg.position.x = 0.16;
    body.add(torso, head, hairCap, leftEye, rightEye, leftArm, rightArm, leftLeg, rightLeg);
    body.position.set(this.playerPosition.x, 0, this.playerPosition.z);
    this.playerVisual = body;
    this.scene.add(body);
  }

  private createAria(): void {
    const aria = new THREE.Group();
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 24, 18),
      new THREE.MeshStandardMaterial({ color: 0x83d7ca, roughness: 0.25, metalness: 0.35, emissive: 0x255c58 }),
    );
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.115, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xf0fbdd }),
    );
    eye.position.set(0, 0.05, 0.36);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.025, 8, 44),
      new THREE.MeshStandardMaterial({ color: 0xa2e9dd, emissive: 0x53958a }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.16;
    aria.add(shell, eye, ring);
    const light = new THREE.PointLight(0x75e3d2, 4.8, 8);
    aria.add(light);
    aria.position.set(1.8, 2.1, 14.8);
    aria.userData.ring = ring;
    this.scene.add(aria);
    this.aria = aria;
  }

  private bindInput(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      this.dragPointer = event.pointerId;
      this.lastPointer = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (this.dragPointer !== event.pointerId || !this.playing) return;
      const dx = event.clientX - this.lastPointer.x;
      const dy = event.clientY - this.lastPointer.y;
      this.lastPointer = { x: event.clientX, y: event.clientY };
      this.cameraYawTarget -= dx * 0.0045;
      this.cameraPitchTarget = THREE.MathUtils.clamp(this.cameraPitchTarget + dy * 0.003, -0.18, 0.72);
    });
    const endDrag = (event: PointerEvent) => {
      if (this.dragPointer === event.pointerId) this.dragPointer = null;
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener(
      'wheel',
      (event) => {
        this.cameraDistance = THREE.MathUtils.clamp(this.cameraDistance + event.deltaY * 0.008, 2.2, 8);
      },
      { passive: true },
    );
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    const key = event.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift', 'c'].includes(key)) {
      event.preventDefault();
    }
    if (key === 'e' && !this.pressed.has(key)) this.interact();
    if (key === ' ' && !this.pressed.has(key)) this.jump();
    this.pressed.add(key);
  }

  private handleKeyUp(event: KeyboardEvent): void {
    this.pressed.delete(event.key.toLowerCase());
  }

  private updatePlayer(delta: number): void {
    if (!this.playerBody || !this.playerCollider || !this.characterController || !this.physics) return;
    const forward = Number(this.pressed.has('w') || this.pressed.has('arrowup')) -
      Number(this.pressed.has('s') || this.pressed.has('arrowdown')) -
      this.moveInput.y;
    const strafe = Number(this.pressed.has('d') || this.pressed.has('arrowright')) -
      Number(this.pressed.has('a') || this.pressed.has('arrowleft')) +
      this.moveInput.x;
    const inputLength = Math.hypot(strafe, forward);
    const magnitude = Math.min(inputLength, 1);
    this.moveDirection.set(0, 0, 0);
    if (magnitude > 0) {
      const normalizedForward = forward / inputLength;
      const normalizedStrafe = strafe / inputLength;
      this.moveDirection.set(
        -Math.sin(this.cameraYaw) * normalizedForward + Math.cos(this.cameraYaw) * normalizedStrafe,
        0,
        -Math.cos(this.cameraYaw) * normalizedForward - Math.sin(this.cameraYaw) * normalizedStrafe,
      );
    }
    const crouching = this.crouchHeld || this.pressed.has('c');
    const running = (this.pressed.has('shift') || this.sprintHeld) && magnitude > 0 && !crouching;
    const speed = crouching ? 2 : running ? 8.2 : 4.6;
    const position = this.playerBody.translation();
    this.bumpCooldown = Math.max(0, this.bumpCooldown - delta);
    this.bumpPoseTime = Math.max(0, this.bumpPoseTime - delta);
    this.interactionPoseTime = Math.max(0, this.interactionPoseTime - delta);
    if (this.grounded) {
      this.verticalVelocity = 0;
      if (this.jumpQueued) {
        this.verticalVelocity = 6.9;
        this.grounded = false;
        this.jumpQueued = false;
        this.jumpPhase = 'up';
        this.jumpElapsed = 0;
      }
    }
    if (!this.grounded) {
      this.verticalVelocity -= 18 * delta;
      this.jumpElapsed += delta;
      if (this.jumpPhase === 'up' && this.jumpElapsed > 0.22) {
        this.jumpPhase = 'float';
        this.playAnimation('jumpFloat');
      } else if (this.jumpPhase !== 'down' && this.verticalVelocity < -1.7) {
        this.jumpPhase = 'down';
        this.playAnimation('jumpDown');
      }
    }
    const desiredMovement = {
      x: this.moveDirection.x * speed * delta * magnitude,
      y: this.verticalVelocity * delta,
      z: this.moveDirection.z * speed * delta * magnitude,
    };
    this.characterController.computeColliderMovement(this.playerCollider, desiredMovement);
    const movement = this.characterController.computedMovement();
    const requestedHorizontal = Math.hypot(desiredMovement.x, desiredMovement.z);
    const resolvedHorizontal = Math.hypot(movement.x, movement.z);
    let hitWall = false;
    if (requestedHorizontal - resolvedHorizontal > 0.015) {
      for (let index = 0; index < this.characterController.numComputedCollisions(); index += 1) {
        const collision = this.characterController.computedCollision(index);
        if (collision && Math.abs(collision.normal1.y) < 0.65) {
          hitWall = true;
          break;
        }
      }
    }
    if (hitWall && this.bumpCooldown === 0) {
      this.bumpCooldown = 0.7;
      this.bumpPoseTime = 0.5;
      this.audio.playCollision();
    }
    this.playerBody.setNextKinematicTranslation({
      x: position.x + movement.x,
      y: position.y + movement.y,
      z: position.z + movement.z,
    });
    this.physics.step();
    const resolved = this.playerBody.translation();
    this.playerPosition.set(resolved.x, resolved.y, resolved.z);
    this.grounded = this.characterController.computedGrounded();
    if (this.grounded && this.verticalVelocity < 0) {
      this.verticalVelocity = 0;
      this.jumpQueued = false;
    }

    if (this.playerVisual) {
      this.playerVisual.position.set(resolved.x, resolved.y - PLAYER_BODY_CENTER_HEIGHT + 0.045, resolved.z);
      if (magnitude > 0.08) {
        const targetRotation = Math.atan2(this.moveDirection.x, this.moveDirection.z);
        this.playerVisual.rotation.y = THREE.MathUtils.damp(this.playerVisual.rotation.y, targetRotation, 10, delta);
      }
      const targetScaleY = crouching ? 0.72 : !this.grounded ? 1.04 : 1;
      this.playerVisual.scale.y = THREE.MathUtils.damp(this.playerVisual.scale.y, targetScaleY, 8, delta);
      const bump = this.bumpPoseTime > 0 ? Math.sin((this.bumpPoseTime / 0.5) * Math.PI) * 0.2 : 0;
      const reach = this.interactionPoseTime > 0
        ? Math.sin((this.interactionPoseTime / 0.72) * Math.PI) * 0.1
        : 0;
      this.playerVisual.rotation.x = THREE.MathUtils.damp(this.playerVisual.rotation.x, bump + reach, 9, delta);
    }

    if (!this.grounded) this.setLocomotion('jump');
    else if (magnitude < 0.08) this.setLocomotion('idle');
    else this.setLocomotion(running ? 'run' : 'walk');

    if (this.grounded && resolvedHorizontal > 0.012 && magnitude > 0.08) {
      this.footstepTimer -= delta;
      if (this.footstepTimer <= 0) {
        this.audio.playFootstep(running);
        this.footstepTimer = crouching ? 0.68 : running ? 0.32 : 0.48;
      }
    } else {
      this.footstepTimer = 0;
    }
  }

  private setLocomotion(state: LocomotionState): void {
    if (this.currentLocomotion === state) return;
    this.currentLocomotion = state;
    this.callbacks?.onLocomotion(state);
    this.playAnimation(state === 'jump' ? 'idle' : state);
  }

  private playAnimation(name: string, duration = 0.38): void {
    const next = this.actions.get(name);
    if (!next || next === this.activeAction) return;
    next.enabled = true;
    next.setEffectiveTimeScale(name === 'walk' ? 1.35 : name === 'run' ? 1.8 : 1);
    next.setEffectiveWeight(1);
    next.reset();
    next.setLoop(name.startsWith('jump') ? THREE.LoopOnce : THREE.LoopRepeat, name.startsWith('jump') ? 1 : Infinity);
    if (this.activeAction) this.activeAction.crossFadeTo(next, duration, false);
    else next.fadeIn(duration);
    next.play();
    this.activeAction = next;
  }

  private updateCamera(delta: number): void {
    this.cameraYaw = THREE.MathUtils.damp(this.cameraYaw, this.cameraYawTarget, 8, delta);
    this.cameraPitch = THREE.MathUtils.damp(this.cameraPitch, this.cameraPitchTarget, 8, delta);
    this.cameraLeadTarget.copy(this.playerPosition).sub(this.cameraFollowPrevious);
    this.cameraFollowPrevious.copy(this.playerPosition);
    this.cameraLeadTarget.multiplyScalar(Math.min(0.18 / Math.max(delta, 0.001), 12));
    this.cameraLeadTarget.y = 0;
    this.cameraLeadTarget.clampLength(0, 0.62);
    if (this.workstationReturn) this.cameraLeadTarget.set(0, 0, 0);
    this.cameraLead.lerp(this.cameraLeadTarget, 1 - Math.exp(-5 * delta));
    if (this.cameraMode === 'first-person') {
      this.desiredCamera.set(
        this.playerPosition.x + Math.sin(this.cameraYaw) * 0.08,
        this.playerPosition.y + 0.55,
        this.playerPosition.z + Math.cos(this.cameraYaw) * 0.08,
      );
      this.cameraDirection.set(
        -Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch),
        Math.sin(this.cameraPitch),
        -Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch),
      );
      this.cameraTarget.copy(this.desiredCamera).addScaledVector(this.cameraDirection, 8);
      this.camera.position.lerp(this.desiredCamera, 1 - Math.exp(-12 * delta));
      this.camera.lookAt(this.cameraTarget);
      return;
    }

    const horizontalDistance = Math.cos(this.cameraPitch) * this.cameraDistance;
    this.desiredCamera.set(
      this.playerPosition.x + Math.sin(this.cameraYaw) * horizontalDistance - Math.cos(this.cameraYaw) * this.cameraShoulder,
      this.playerPosition.y + 1.15 + Math.sin(this.cameraPitch) * this.cameraDistance,
      this.playerPosition.z + Math.cos(this.cameraYaw) * horizontalDistance + Math.sin(this.cameraYaw) * this.cameraShoulder,
    );
    const cameraBob = this.cameraLeadTarget.lengthSq() > 0.003
      ? Math.sin(this.clock.elapsedTime * 8.5) * 0.025
      : 0;
    this.cameraTarget.set(
      this.playerPosition.x + this.cameraLead.x,
      this.playerPosition.y + 1.1 - (this.crouchHeld || this.pressed.has('c') ? 0.28 : 0) + cameraBob,
      this.playerPosition.z + this.cameraLead.z,
    );
    this.cameraDirection.copy(this.desiredCamera).sub(this.cameraTarget);
    const desiredDistance = this.cameraDirection.length();
    this.cameraDirection.normalize();
    this.cameraCollisionTimer -= delta;
    if (this.cameraCollisionTimer <= 0) {
      this.cameraRaycaster.set(this.cameraTarget, this.cameraDirection);
      this.cameraRaycaster.far = desiredDistance;
      const obstruction = this.cameraRaycaster.intersectObjects(this.cameraOccluders, false)[0];
      this.cameraObstructionDistance = obstruction ? Math.max(0.9, obstruction.distance - 0.3) : null;
      this.cameraCollisionTimer = 0.08;
    }
    if (this.cameraObstructionDistance !== null && this.cameraObstructionDistance < desiredDistance) {
      this.desiredCamera.copy(this.cameraTarget).addScaledVector(this.cameraDirection, this.cameraObstructionDistance);
      if (this.camera.position.distanceTo(this.cameraTarget) > this.cameraObstructionDistance + 0.35) {
        this.camera.position.copy(this.desiredCamera);
      } else {
        this.camera.position.lerp(this.desiredCamera, 1 - Math.exp(-10 * delta));
      }
    } else {
      this.camera.position.lerp(this.desiredCamera, 1 - Math.exp(-6 * delta));
    }
    this.camera.lookAt(this.cameraTarget);
  }

  private updateAria(delta: number): void {
    if (!this.aria) return;
    const time = this.clock.elapsedTime;
    const followPosition = new THREE.Vector3(
      this.playerPosition.x + 1.6 + Math.sin(time * 0.7) * 0.35,
      this.playerPosition.y + 1.5 + Math.sin(time * 2.1) * 0.18,
      this.playerPosition.z + 0.8,
    );
    this.aria.position.lerp(followPosition, 1 - Math.exp(-2.5 * delta));
    const ring = this.aria.userData.ring as THREE.Mesh | undefined;
    if (ring) ring.rotation.z += delta * 0.75;
  }

  private updateAiCharacters(delta: number): void {
    for (const npc of this.aiCharacters) {
      npc.mixer.update(delta);
      if (npc.behavior === 'seated') {
        this.setAiAnimation(npc, npc.idle);
        continue;
      }
      if (npc.wait > 0) {
        npc.wait -= delta;
        if (npc.wait > 0) continue;
      }

      const direction = npc.target.clone().sub(npc.group.position);
      const distance = direction.length();
      if (distance < 0.12) {
        if (npc.target.distanceTo(npc.home) < 0.01) {
          npc.phase += 1.1 + (npc.speed - 0.35);
          const radius = 0.65 + (npc.phase % 0.7);
          npc.target.set(
            npc.home.x + Math.cos(npc.phase) * radius,
            npc.home.y,
            npc.home.z + Math.sin(npc.phase) * radius,
          );
        } else {
          npc.wait = 1.8 + (npc.phase % 1.5);
          npc.target.copy(npc.home);
          this.setAiAnimation(npc, npc.idle);
          continue;
        }
      }
      direction.subVectors(npc.target, npc.group.position).normalize();
      npc.group.position.addScaledVector(direction, Math.min(npc.target.distanceTo(npc.group.position), npc.speed * delta));
      npc.group.rotation.y = Math.atan2(direction.x, direction.z);
      this.setAiAnimation(npc, npc.walk);
    }
  }

  private setAiAnimation(npc: AiCharacter, next: THREE.AnimationAction | null): void {
    if (!next || next === npc.activeAction) return;
    next.reset();
    next.enabled = true;
    next.setEffectiveWeight(1);
    next.setEffectiveTimeScale(next === npc.walk ? 1.2 : 1);
    if (npc.activeAction) npc.activeAction.crossFadeTo(next, 0.42, false);
    else next.fadeIn(0.42);
    next.play();
    npc.activeAction = next;
  }

  private updateNearbyStation(): void {
    const activeChallenge = learningChallenges.find((challenge) => !this.completed.has(challenge.id));
    const activeStation = this.stations.find((item) => item.challenge.id === activeChallenge?.id);
    const stationDistance = activeStation
      ? Math.hypot(
        this.playerPosition.x - activeStation.position.x,
        this.playerPosition.z - activeStation.position.z,
      )
      : Number.POSITIVE_INFINITY;
    const station = activeStation && stationDistance < 3.5
      ? { station: activeStation, distance: stationDistance }
      : undefined;
    const doorDistance = Math.hypot(
      this.playerPosition.x - ACADEMY_DOOR_POSITION[0],
      this.playerPosition.z - ACADEMY_DOOR_POSITION[1],
    );
    const taskOptions: { id: string; distance: number }[] = [];
    if (station) taskOptions.push({ id: station.station.challenge.id, distance: station.distance });
    if (!this.doorOpen && doorDistance < ACADEMY_DOOR_INTERACTION_RADIUS) {
      taskOptions.push({ id: 'academy-door', distance: doorDistance });
    }
    taskOptions.sort((a, b) => a.distance - b.distance);
    const nearestAi = taskOptions.length
      ? null
      : this.aiCharacters
        .map((npc) => ({
          npc,
          distance: Math.hypot(
            this.playerPosition.x - npc.group.position.x,
            this.playerPosition.z - npc.group.position.z,
          ),
        }))
        .filter(({ distance }) => distance < 2.6)
        .sort((a, b) => a.distance - b.distance)[0];
    const next = taskOptions[0]?.id ?? (nearestAi ? `ai:${nearestAi.npc.id}` : null);
    if (next !== this.nearestId) {
      this.nearestId = next;
      this.callbacks?.onNearby(next);
    }

    for (const station of this.stations) {
      const pulse = station.group.getObjectByName('station-ring');
      if (pulse) pulse.rotation.z += 0.003;
    }
  }

  private openAcademyDoor(): void {
    if (this.doorOpen || !this.doorPivot || !this.physics) return;
    this.doorOpen = true;
    this.doorOpenTime = 0;
    if (this.doorCollider) {
      this.physics.removeCollider(this.doorCollider, true);
      this.doorCollider = null;
    }
    this.callbacks?.onDoorState(true);
  }

  private updateDoor(delta: number): void {
    if (!this.doorOpen || !this.doorPivot) return;
    this.doorOpenTime = Math.min(this.doorOpenTime + delta, 0.9);
    const progress = this.doorOpenTime / 0.9;
    const eased = progress * progress * (3 - 2 * progress);
    this.doorPivot.rotation.y = -1.42 * eased;
  }

  private resize(): void {
    if (!this.renderer || !this.host) return;
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(width, height, false);
    this.composer?.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
