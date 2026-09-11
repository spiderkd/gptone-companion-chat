"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export type CreatureId = "mushroom" | "cloud-sheep" | "lantern" | "potion" | "book-goblin";

type CreaturePreviewProps = {
  id: CreatureId;
  size?: number;
};

type BuildContext = {
  root: THREE.Group;
  add: (object: THREE.Object3D) => THREE.Object3D;
  mat: (color: number, options?: Partial<THREE.MeshPhysicalMaterialParameters>) => THREE.MeshPhysicalMaterial;
};

const CREATURES: Record<CreatureId, { name: string; role: string; accent: string }> = {
  mushroom: {
    name: "Mushroom Familiar",
    role: "Friendly / calm guide",
    accent: "from-red-100 to-emerald-50",
  },
  "cloud-sheep": {
    name: "Cloud Sheep",
    role: "Soft coach / reassurance",
    accent: "from-sky-100 to-white",
  },
  lantern: {
    name: "Lantern Sprite",
    role: "Helpful tutor / guide",
    accent: "from-amber-100 to-violet-50",
  },
  potion: {
    name: "Potion Familiar",
    role: "Creative / experimental",
    accent: "from-fuchsia-100 to-teal-50",
  },
  "book-goblin": {
    name: "Book Goblin",
    role: "Technical / research buddy",
    accent: "from-lime-100 to-stone-50",
  },
};

const creatureIds = Object.keys(CREATURES) as CreatureId[];

function sphere(
  radius: number,
  material: THREE.Material,
  position: [number, number, number],
  scale: [number, number, number] = [1, 1, 1],
) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  return mesh;
}

function capsule(
  radius: number,
  length: number,
  material: THREE.Material,
  position: [number, number, number],
  scale: [number, number, number] = [1, 1, 1],
) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 24, 36), material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  return mesh;
}

function cylinder(
  top: number,
  bottom: number,
  height: number,
  material: THREE.Material,
  position: [number, number, number],
  segments = 48,
) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, segments), material);
  mesh.position.set(...position);
  return mesh;
}

function cone(
  radius: number,
  height: number,
  material: THREE.Material,
  position: [number, number, number],
  segments = 48,
) {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(radius, height, segments), material);
  mesh.position.set(...position);
  return mesh;
}

function box(
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
  position: [number, number, number],
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth, 3, 3, 3), material);
  mesh.position.set(...position);
  return mesh;
}

function addFace(ctx: BuildContext, y = 0.18, z = 0.72, spacing = 0.23) {
  const eye = ctx.mat(0x32263a, { roughness: 0.45, metalness: 0 });
  const blush = ctx.mat(0xffa7a6, { roughness: 0.65, metalness: 0 });
  ctx.add(sphere(0.055, eye, [-spacing, y, z], [0.62, 1.25, 0.35]));
  ctx.add(sphere(0.055, eye, [spacing, y, z], [0.62, 1.25, 0.35]));
  ctx.add(sphere(0.04, blush, [-spacing - 0.16, y - 0.1, z - 0.01], [1.2, 0.7, 0.25]));
  ctx.add(sphere(0.04, blush, [spacing + 0.16, y - 0.1, z - 0.01], [1.2, 0.7, 0.25]));
}

function addGroundGlow(ctx: BuildContext, color: number) {
  const glow = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.92, 96),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -1.12;
  ctx.add(glow);
}

function buildMushroom(ctx: BuildContext) {
  const cream = ctx.mat(0xfff0d8, { roughness: 0.62 });
  const red = ctx.mat(0xe8655b, { roughness: 0.56, clearcoat: 0.35 });
  const leaf = ctx.mat(0x6f9f61, { roughness: 0.66 });
  const white = ctx.mat(0xfff8ef, { roughness: 0.6 });
  ctx.add(sphere(0.58, cream, [0, -0.18, 0], [0.82, 1.06, 0.72]));
  ctx.add(sphere(0.62, red, [0, 0.55, 0], [1.35, 0.52, 1]));
  ctx.add(cylinder(0.55, 0.82, 0.16, red, [0, 0.28, 0], 64));
  for (const [x, y, s] of [
    [-0.32, 0.68, 0.14],
    [0.25, 0.72, 0.17],
    [0.58, 0.48, 0.11],
    [-0.65, 0.46, 0.1],
  ] as const) {
    ctx.add(sphere(s, white, [x, y, 0.54], [1.25, 0.7, 0.18]));
  }
  const collar = ctx.add(sphere(0.18, leaf, [0, 0.08, 0.48], [3.2, 0.42, 0.25]));
  collar.rotation.z = 0.06;
  ctx.add(sphere(0.14, cream, [-0.42, -0.18, 0.05], [0.8, 1.2, 0.65]));
  ctx.add(sphere(0.14, cream, [0.42, -0.18, 0.05], [0.8, 1.2, 0.65]));
  ctx.add(sphere(0.16, cream, [-0.2, -0.83, 0.05], [0.75, 0.65, 0.6]));
  ctx.add(sphere(0.16, cream, [0.2, -0.83, 0.05], [0.75, 0.65, 0.6]));
  addFace(ctx, -0.17, 0.53, 0.2);
  addGroundGlow(ctx, 0x72d28f);
}

function buildCloudSheep(ctx: BuildContext) {
  const wool = ctx.mat(0xfffbf2, { roughness: 0.72 });
  const face = ctx.mat(0xffead5, { roughness: 0.62 });
  const horn = ctx.mat(0xdca75d, { roughness: 0.55 });
  const hoof = ctx.mat(0x5c4a45, { roughness: 0.66 });
  for (const [x, y, s] of [
    [0, 0.05, 0.52],
    [-0.38, 0.02, 0.42],
    [0.38, 0.02, 0.42],
    [-0.2, 0.35, 0.38],
    [0.2, 0.35, 0.38],
    [0, -0.28, 0.42],
  ] as const) {
    ctx.add(sphere(s, wool, [x, y, 0], [1, 0.92, 0.72]));
  }
  ctx.add(sphere(0.36, face, [0, -0.05, 0.6], [0.86, 1.04, 0.65]));
  const leftHorn = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 16, 48, Math.PI * 1.35), horn);
  leftHorn.position.set(-0.38, 0.13, 0.58);
  leftHorn.rotation.set(0.2, 0.15, -1.45);
  ctx.add(leftHorn);
  const rightHorn = leftHorn.clone();
  rightHorn.position.x = 0.38;
  rightHorn.rotation.z = 1.45;
  ctx.add(rightHorn);
  ctx.add(sphere(0.12, hoof, [-0.26, -0.8, 0.1], [0.8, 1, 0.7]));
  ctx.add(sphere(0.12, hoof, [0.26, -0.8, 0.1], [0.8, 1, 0.7]));
  addFace(ctx, -0.05, 0.85, 0.17);
  addGroundGlow(ctx, 0x91cdf7);
}

function buildLantern(ctx: BuildContext) {
  const body = ctx.mat(0xfff0d8, { roughness: 0.58 });
  const cloak = ctx.mat(0x6b62ad, { roughness: 0.48, clearcoat: 0.2 });
  const brass = ctx.mat(0xb97932, { roughness: 0.34, metalness: 0.25 });
  const glow = ctx.mat(0xffc956, { emissive: 0xffb74a, emissiveIntensity: 1.8, roughness: 0.25 });
  ctx.add(capsule(0.46, 0.48, body, [0, -0.18, 0], [0.82, 1.08, 0.72]));
  const brim = cylinder(0.72, 0.82, 0.13, cloak, [0, 0.57, 0], 64);
  brim.scale.z = 0.72;
  ctx.add(brim);
  const hat = cone(0.56, 0.96, cloak, [0.02, 1.02, 0], 64);
  hat.rotation.z = -0.12;
  ctx.add(hat);
  ctx.add(sphere(0.11, glow, [0.43, 1.38, 0.08], [1, 1, 0.35]));
  ctx.add(capsule(0.13, 0.26, body, [-0.46, -0.22, 0.02], [0.62, 1, 0.54]));
  const lamp = new THREE.Group();
  lamp.add(cylinder(0.18, 0.18, 0.38, glow, [0, 0, 0], 32));
  lamp.add(cylinder(0.21, 0.21, 0.05, brass, [0, 0.22, 0], 32));
  lamp.add(cylinder(0.21, 0.21, 0.05, brass, [0, -0.22, 0], 32));
  lamp.add(new THREE.PointLight(0xffc956, 2.6, 3));
  lamp.position.set(-0.74, -0.24, 0.18);
  ctx.root.add(lamp);
  addFace(ctx, -0.12, 0.55, 0.17);
  addGroundGlow(ctx, 0xffc956);
}

function buildPotion(ctx: BuildContext) {
  const body = ctx.mat(0xffedd9, { roughness: 0.58 });
  const hat = ctx.mat(0x7d8d54, { roughness: 0.62 });
  const belt = ctx.mat(0x8b5d3d, { roughness: 0.5 });
  const pink = ctx.mat(0xf36ec7, {
    roughness: 0.12,
    clearcoat: 0.9,
    transparent: true,
    opacity: 0.72,
    emissive: 0x621b55,
    emissiveIntensity: 0.25,
  });
  const glass = ctx.mat(0xfbe7ff, {
    roughness: 0.08,
    transparent: true,
    opacity: 0.42,
    clearcoat: 1,
  });
  ctx.add(sphere(0.54, body, [0, -0.22, 0], [0.86, 1.05, 0.72]));
  const brim = cylinder(0.7, 0.8, 0.12, hat, [0, 0.48, 0], 64);
  brim.scale.z = 0.68;
  ctx.add(brim);
  const coneHat = cone(0.5, 0.76, hat, [0.05, 0.9, 0], 64);
  coneHat.rotation.z = -0.18;
  ctx.add(coneHat);
  ctx.add(cylinder(0.1, 0.1, 0.2, belt, [-0.34, 0.47, 0.1], 24));
  const bottle = new THREE.Group();
  bottle.add(sphere(0.23, glass, [0, -0.05, 0], [0.85, 1, 0.42]));
  bottle.add(sphere(0.2, pink, [0, -0.09, 0.01], [0.8, 0.76, 0.38]));
  bottle.add(cylinder(0.07, 0.1, 0.22, glass, [0, 0.21, 0], 24));
  bottle.add(cylinder(0.075, 0.075, 0.08, belt, [0, 0.36, 0], 18));
  bottle.position.set(-0.62, -0.18, 0.24);
  bottle.rotation.z = 0.18;
  ctx.root.add(bottle);
  ctx.add(capsule(0.12, 0.24, body, [0.42, -0.2, 0.06], [0.65, 1, 0.55]));
  addFace(ctx, -0.2, 0.56, 0.17);
  addGroundGlow(ctx, 0xf36ec7);
}

function buildBookGoblin(ctx: BuildContext) {
  const skin = ctx.mat(0x9fba63, { roughness: 0.62 });
  const ear = ctx.mat(0x8bab54, { roughness: 0.62 });
  const page = ctx.mat(0xf6e2bd, { roughness: 0.58 });
  const cover = ctx.mat(0x6c4a35, { roughness: 0.5, clearcoat: 0.15 });
  const bookEdge = ctx.mat(0xd7a24a, { roughness: 0.42, metalness: 0.1 });
  ctx.add(sphere(0.58, skin, [0, -0.1, 0], [0.92, 1.05, 0.74]));
  const leftEar = cone(0.2, 0.48, ear, [-0.54, 0.12, 0.02], 32);
  leftEar.rotation.set(0, 0, 1.48);
  ctx.add(leftEar);
  const rightEar = cone(0.2, 0.48, ear, [0.54, 0.12, 0.02], 32);
  rightEar.rotation.set(0, 0, -1.48);
  ctx.add(rightEar);
  [0x56456d, 0xbb5b4f, 0x455f86].forEach((color, index) => {
    const book = box(0.62, 0.13, 0.36, ctx.mat(color, { roughness: 0.5 }), [0, 0.62 + index * 0.14, 0]);
    book.rotation.z = index % 2 ? -0.05 : 0.04;
    ctx.add(book);
  });
  const openBook = new THREE.Group();
  const left = box(0.42, 0.5, 0.07, cover, [-0.22, 0, 0]);
  left.rotation.y = -0.2;
  const right = box(0.42, 0.5, 0.07, cover, [0.22, 0, 0]);
  right.rotation.y = 0.2;
  openBook.add(left, right);
  openBook.add(box(0.34, 0.42, 0.075, page, [-0.2, 0.01, 0.035]));
  openBook.add(box(0.34, 0.42, 0.075, page, [0.2, 0.01, 0.035]));
  const spine = cylinder(0.035, 0.035, 0.52, bookEdge, [0, 0, 0.08], 16);
  spine.rotation.x = Math.PI / 2;
  openBook.add(spine);
  openBook.position.set(0, -0.35, 0.62);
  ctx.root.add(openBook);
  ctx.add(sphere(0.12, skin, [-0.42, -0.38, 0.42], [0.8, 1, 0.7]));
  ctx.add(sphere(0.12, skin, [0.42, -0.38, 0.42], [0.8, 1, 0.7]));
  addFace(ctx, -0.04, 0.63, 0.18);
  addGroundGlow(ctx, 0xb4d766);
}

function buildCreature(id: CreatureId, ctx: BuildContext) {
  if (id === "mushroom") buildMushroom(ctx);
  if (id === "cloud-sheep") buildCloudSheep(ctx);
  if (id === "lantern") buildLantern(ctx);
  if (id === "potion") buildPotion(ctx);
  if (id === "book-goblin") buildBookGoblin(ctx);
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => material.dispose());
  });
}

function CreatureCanvas({ id, size = 280 }: CreaturePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let frameId = 0;
    let disposed = false;

    try {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
      renderer.toneMappingExposure = 1.08;

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1.85, 1.85, 1.85, -1.85, 0.1, 30);
      camera.position.set(0, 0.04, 6);
      camera.lookAt(0, 0, 0);

      scene.add(new THREE.HemisphereLight(0xffffff, 0xd9e8ff, 1.8));
      const key = new THREE.DirectionalLight(0xffffff, 3.2);
      key.position.set(3, 4, 5);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xe7f4ff, 1.1);
      fill.position.set(-3, 2, 3);
      scene.add(fill);

      const root = new THREE.Group();
      root.rotation.y = -0.1;
      root.position.y = -0.08;
      scene.add(root);

      const mat = (
        color: number,
        options: Partial<THREE.MeshPhysicalMaterialParameters> = {},
      ) =>
        new THREE.MeshPhysicalMaterial({
          color,
          roughness: 0.5,
          metalness: 0,
          clearcoat: 0.25,
          clearcoatRoughness: 0.5,
          ...options,
        });

      const add = (object: THREE.Object3D) => {
        root.add(object);
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
        return object;
      };

      buildCreature(id, { root, add, mat });

      const clock = new THREE.Clock();
      const offset = Math.random() * Math.PI * 2;
      const animate = () => {
        if (disposed) return;
        const time = clock.getElapsedTime();
        root.position.y = -0.08 + Math.sin(time * 1.55 + offset) * 0.07;
        root.rotation.y = -0.1 + Math.sin(time * 0.85 + offset) * 0.06;
        root.rotation.z = Math.sin(time * 1.2 + offset) * 0.018;
        renderer.render(scene, camera);
        frameId = requestAnimationFrame(animate);
      };

      animate();
      setFailed(false);

      return () => {
        disposed = true;
        cancelAnimationFrame(frameId);
        disposeObject(root);
        renderer.dispose();
      };
    } catch (error) {
      console.error("Failed to render creature preview", error);
      setFailed(true);
    }
  }, [id, size]);

  if (failed) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-500"
        style={{ width: size, height: size }}
      >
        Preview failed
      </div>
    );
  }

  return <canvas ref={canvasRef} className="block" aria-label={`${CREATURES[id].name} preview`} />;
}

export function FantasyCreaturePreview() {
  return (
    <main className="min-h-screen bg-[#f7f6f2] px-6 py-8 text-gray-950">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-gray-500">
            Momo-style procedural mascots
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Fantasy Creature Concepts</h1>
          <p className="max-w-2xl text-sm leading-6 text-gray-600">
            Simple rounded 3D creatures built from primitives, designed to be achievable in code
            before we wire one into the chat.
          </p>
        </header>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {creatureIds.map((id) => {
            const creature = CREATURES[id];

            return (
              <article
                key={id}
                className={`overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-br ${creature.accent} shadow-sm`}
              >
                <div className="flex min-h-[320px] items-center justify-center">
                  <CreatureCanvas id={id} size={300} />
                </div>
                <div className="border-t border-white/70 bg-white/70 px-5 py-4 backdrop-blur">
                  <h2 className="text-lg font-semibold">{creature.name}</h2>
                  <p className="mt-1 text-sm text-gray-600">{creature.role}</p>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
