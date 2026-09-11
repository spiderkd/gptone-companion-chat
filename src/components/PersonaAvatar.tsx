"use client";

import { getPersona } from "@/lib/personas";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTF, GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";

type PersonaAvatarProps = {
  personaId?: string;
  size?: number;
  className?: string;
};

type ModelVisual = {
  url: string;
  accent: number;
  targetSize: number;
  yOffset?: number;
  xOffset?: number;
  rotation?: [number, number, number];
  motion: number;
  animationSpeed?: number;
  waveBones?: string[];
  secondaryBones?: string[];
  hideNames?: string[];
  cameraZoom?: number;
};

const PERSONA_MODELS: Record<string, ModelVisual> = {
  efficient: {
    url: "/avatars/cute_home_robot.glb",
    accent: 0xf59e0b,
    targetSize: 6.2,
    yOffset: -0.18,
    rotation: [0, 0.08, 0],
    motion: 0.9,
    animationSpeed: 0.9,
    waveBones: ["Bone020", "Bone018", "Bone023", "Bone021"],
    hideNames: ["Cylinder001", "M_Suelo"],
    cameraZoom: 1.18,
  },
  friendly: {
    url: "/avatars/cute_cat_in_cute_banana.glb",
    accent: 0x10b981,
    targetSize: 4.2,
    yOffset: -0.15,
    rotation: [0, 0.18, 0],
    motion: 1.15,
    animationSpeed: 0.85,
    waveBones: ["upper_arm.R", "forearm.R", "upper_arm.L", "forearm.L"],
    cameraZoom: 1.05,
  },
  strict: {
    url: "/avatars/the_knight_of_tomorrow.glb",
    accent: 0xef4444,
    targetSize: 4.9,
    yOffset: -0.18,
    rotation: [0, 0.18, 0],
    motion: 0.55,
    animationSpeed: 0.72,
    waveBones: ["DEF_UpperArm.R", "DEF_Forearm.R", "DEF_Hand.R", "DEF_UpperArm.L", "DEF_Forearm.L"],
    secondaryBones: ["DEF_Ear", "DEF_Eye"],
    hideNames: ["Rock", "Cylinder.005", "Sphere.005"],
    cameraZoom: 1.12,
  },
  calm: {
    url: "/avatars/cute_ghost.glb",
    accent: 0x38bdf8,
    targetSize: 2.4,
    yOffset: -0.06,
    rotation: [0, 0.12, 0],
    motion: 0.7,
    animationSpeed: 0.8,
    waveBones: ["Bone.007", "Bone.008", "Bone.009"],
  },
  creative: {
    url: "/avatars/floating_fox.glb",
    accent: 0xa855f7,
    targetSize: 3.15,
    yOffset: -0.04,
    rotation: [0, 0.02, 0],
    motion: 1.35,
    animationSpeed: 1,
    hideNames: ["Star"],
    cameraZoom: 1.2,
  },
  playful: {
    url: "/avatars/pusheen_vs_noodle.glb",
    accent: 0xec4899,
    targetSize: 3.4,
    yOffset: -0.08,
    rotation: [0, 0.12, 0],
    motion: 1.25,
    animationSpeed: 1.05,
  },
  technical: {
    url: "/avatars/cute_robot.glb",
    accent: 0x06b6d4,
    targetSize: 2.2,
    yOffset: -0.08,
    rotation: [0, 0.1, 0],
    motion: 1,
    animationSpeed: 1,
  },
  guardian: {
    url: "/avatars/ssrbs_hololive.glb",
    accent: 0xf59e0b,
    targetSize: 2.5,
    yOffset: -0.08,
    rotation: [0, 0.08, 0],
    motion: 0.95,
    animationSpeed: 0.95,
    secondaryBones: ["Tail", "Ear", "FrontLeg"],
  },
  caretaker: {
    url: "/avatars/autonomous_robot_sweeper.glb",
    accent: 0x84cc16,
    targetSize: 3.7,
    yOffset: -0.06,
    rotation: [0, 0.12, 0],
    motion: 0.85,
    animationSpeed: 0.9,
    waveBones: ["Armature.003", "Armature.002", "Bone_02", "Bone_03"],
  },
  cynical: {
    url: "/avatars/grimmy_the_grim_reaper.glb",
    accent: 0x71717a,
    targetSize: 2.35,
    yOffset: -0.08,
    rotation: [0, 0.1, 0],
    motion: 0.75,
    animationSpeed: 0.85,
    waveBones: ["Bone_003", "Bone_004", "Bone_005"],
  },
};

const FALLBACK_MODEL = PERSONA_MODELS.efficient;
const gltfCache = new Map<string, Promise<GLTF>>();
let sharedLoader: GLTFLoader | null = null;

function getModelVisual(personaId: string): ModelVisual {
  return PERSONA_MODELS[personaId] ?? FALLBACK_MODEL;
}

function getLoader() {
  if (sharedLoader) return sharedLoader;

  THREE.Cache.enabled = true;
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/draco/");
  dracoLoader.preload();

  sharedLoader = new GLTFLoader();
  sharedLoader.setDRACOLoader(dracoLoader);
  return sharedLoader;
}

function loadGLTF(url: string) {
  const cached = gltfCache.get(url);
  if (cached) return cached;

  const promise = new Promise<GLTF>((resolve, reject) => {
    getLoader().load(url, resolve, undefined, reject);
  });

  gltfCache.set(url, promise);
  return promise;
}

function shouldHideObject(object: THREE.Object3D, names: string[] = []) {
  if (!names.length) return false;
  const objectName = object.name.toLowerCase();
  return names.some((name) => objectName.includes(name.toLowerCase()));
}

function prepareModel(model: THREE.Object3D, visual: ModelVisual) {
  model.traverse((object) => {
    if (shouldHideObject(object, visual.hideNames)) {
      object.visible = false;
    }
  });

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z) || 1;

  model.position.sub(center);
  model.scale.setScalar(visual.targetSize / maxDimension);

  if (visual.xOffset) model.position.x += visual.xOffset;
  if (visual.yOffset) model.position.y += visual.yOffset;
  if (visual.rotation) model.rotation.set(...visual.rotation);

  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;

    object.castShadow = true;
    object.receiveShadow = true;
    object.frustumCulled = false;

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if ("envMapIntensity" in material) {
        (material as THREE.MeshStandardMaterial).envMapIntensity = 1.15;
      }
      material.needsUpdate = true;
    });
  });
}

function collectNamedObjects(root: THREE.Object3D, names: string[] = []) {
  const matches: THREE.Object3D[] = [];
  if (!names.length) return matches;
  const lowered = names.map((name) => name.toLowerCase());

  root.traverse((object) => {
    const objectName = object.name.toLowerCase();
    if (lowered.some((name) => objectName.includes(name))) {
      matches.push(object);
    }
  });

  return matches;
}

type PoseObject = {
  object: THREE.Object3D;
  base: THREE.Euler;
};

function capturePoseObjects(objects: THREE.Object3D[]): PoseObject[] {
  return objects.map((object) => ({ object, base: object.rotation.clone() }));
}

function applyCustomInteraction(
  objects: PoseObject[],
  secondaryObjects: PoseObject[],
  time: number,
  hover: number,
  click: number,
) {
  const wave = Math.sin(time * 8.5) * click;
  const hoverWave = Math.sin(time * 2.8) * hover;

  objects.forEach(({ object, base }, index) => {
    const direction = index % 2 === 0 ? 1 : -1;
    object.rotation.x = base.x + 0.22 * click + 0.05 * hoverWave;
    object.rotation.y = base.y;
    object.rotation.z = base.z + direction * (0.42 * click + 0.16 * wave + 0.08 * hoverWave);
  });

  secondaryObjects.forEach(({ object, base }, index) => {
    const direction = index % 2 === 0 ? 1 : -1;
    object.rotation.x = base.x + 0.08 * hoverWave;
    object.rotation.y = base.y;
    object.rotation.z = base.z + direction * (0.12 * hoverWave + 0.18 * click * Math.sin(time * 6));
  });
}

function sanitizeAvatarClip(clip: THREE.AnimationClip) {
  const stableTracks = clip.tracks.filter((track) => !track.name.endsWith(".position"));
  if (!stableTracks.length) return null;
  return new THREE.AnimationClip(clip.name, clip.duration, stableTracks);
}

function makeFallbackOrb(accent: number) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.72, 48, 24),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.08 }),
  );
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 32, 16),
    new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.58 }),
  );
  core.position.z = 0.42;
  group.add(body, core);
  return group;
}

export function PersonaAvatar({ personaId, size = 48, className = "" }: PersonaAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const persona = getPersona(personaId);
  const hoverRef = useRef(0);
  const clickRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let frameId = 0;
    let disposed = false;
    let mixer: THREE.AnimationMixer | null = null;
    let actions: THREE.AnimationAction[] = [];
    let waveObjects: PoseObject[] = [];
    let secondaryObjects: PoseObject[] = [];
    const visual = getModelVisual(persona.id);

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const width = Math.round(size * dpr);
    const height = Math.round(size * dpr);
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;

    const scene = new THREE.Scene();
    const frustum = 1.9 / (visual.cameraZoom ?? 1);
    const camera = new THREE.OrthographicCamera(-frustum, frustum, frustum, -frustum, 0.1, 30);
    camera.position.set(0, 0.1, 6);
    camera.lookAt(0, 0, 0);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xdbeafe, 1.85));

    const rimLight = new THREE.PointLight(visual.accent, 5, 6);
    rimLight.position.set(-1.6, 1.1, 2.4);
    scene.add(rimLight);

    const avatarRoot = new THREE.Group();
    scene.add(avatarRoot);

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: visual.accent,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const hoverRing = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.95, 96), glowMaterial);
    hoverRing.rotation.x = -Math.PI / 2;
    hoverRing.position.y = -1.35;
    avatarRoot.add(hoverRing);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.88, 72),
      new THREE.MeshBasicMaterial({
        color: 0x0f172a,
        transparent: true,
        opacity: 0.09,
        depthWrite: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, -1.44, -0.08);
    avatarRoot.add(shadow);

    const modelHolder = new THREE.Group();
    avatarRoot.add(modelHolder);

    const fallback = makeFallbackOrb(visual.accent);
    modelHolder.add(fallback);

    loadGLTF(visual.url)
      .then((gltf) => {
        if (disposed) return;

        const model = cloneSkeleton(gltf.scene) as THREE.Object3D;
        prepareModel(model, visual);
        modelHolder.remove(fallback);
        modelHolder.add(model);

        waveObjects = capturePoseObjects(collectNamedObjects(model, visual.waveBones).slice(0, 6));
        secondaryObjects = capturePoseObjects(
          collectNamedObjects(model, visual.secondaryBones).slice(0, 10),
        );

        if (gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(model);
          actions = gltf.animations.flatMap((clip) => {
            const avatarClip = sanitizeAvatarClip(clip);
            if (!avatarClip) return [];
            const action = mixer!.clipAction(avatarClip).reset();
            action.timeScale = visual.animationSpeed ?? 1;
            action.play();
            return [action];
          });
        }

        setFailed(false);
      })
      .catch((error) => {
        console.error(`Failed to load persona avatar model: ${visual.url}`, error);
        setFailed(true);
      });

    const shouldReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clock = new THREE.Clock();
    const spinOffset = Math.random() * Math.PI * 2;

    const animate = () => {
      if (disposed) return;

      const delta = clock.getDelta();
      const time = clock.getElapsedTime();
      const motion = shouldReduceMotion ? 0 : visual.motion;
      hoverRef.current = THREE.MathUtils.lerp(hoverRef.current, canvas.matches(":hover") ? 1 : 0, 0.12);
      clickRef.current = Math.max(0, clickRef.current - delta * 1.35);

      actions.forEach((action) => {
        action.timeScale = (visual.animationSpeed ?? 1) * (1 + clickRef.current * 0.55 + hoverRef.current * 0.16);
      });
      mixer?.update(delta);

      const hover = hoverRef.current;
      const click = clickRef.current;
      const pulse = Math.sin(time * 10) * click;

      avatarRoot.position.y = Math.sin(time * 1.65 + spinOffset) * 0.11 * motion + click * 0.08;
      avatarRoot.rotation.y = hover * 0.06;
      avatarRoot.rotation.z = Math.sin(time * 1.18 + spinOffset) * 0.02 * motion + pulse * 0.025;
      avatarRoot.scale.setScalar(1 + hover * 0.04 + click * 0.08);
      hoverRing.scale.setScalar(1 + Math.sin(time * 2.4) * 0.09 * motion + click * 0.18);
      glowMaterial.opacity = 0.18 + Math.max(0, Math.sin(time * 2.2)) * 0.18 + hover * 0.14 + click * 0.16;
      shadow.scale.setScalar(1 + Math.sin(time * 1.65 + spinOffset) * 0.08 * motion + click * 0.12);
      rimLight.intensity = 5 + hover * 1.5 + click * 3;

      applyCustomInteraction(waveObjects, secondaryObjects, time, hover, click);

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      mixer?.stopAllAction();
      hoverRing.geometry.dispose();
      glowMaterial.dispose();
      shadow.geometry.dispose();
      if (Array.isArray(shadow.material)) {
        shadow.material.forEach((material) => material.dispose());
      } else {
        shadow.material.dispose();
      }
      fallback.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
      renderer.dispose();
    };
  }, [persona.id, size]);

  if (failed) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-300 ${className}`}
        style={{ width: size, height: size }}
      >
        {persona.shortName.slice(0, 1)}
      </span>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`block shrink-0 cursor-pointer ${className}`}
      aria-label={`${persona.shortName} animated 3D avatar`}
      role="img"
      onPointerDown={() => {
        clickRef.current = 1;
      }}
      onPointerEnter={() => {
        hoverRef.current = Math.max(hoverRef.current, 0.35);
      }}
    />
  );
}
