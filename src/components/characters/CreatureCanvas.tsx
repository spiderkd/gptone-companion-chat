"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createCreature, type CreatureId } from "./creatureModels";
import { CHARACTERS as creatures } from "@/lib/characters";

export function CreatureCanvas({
  id,
  paused,
  thinking,
  transitionPhase = "idle",
  onTransitionComplete,
}: {
  id: CreatureId;
  paused: boolean;
  thinking: boolean;
  transitionPhase?: "idle" | "exit" | "enter";
  onTransitionComplete?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const thinkingRef = useRef(thinking);
  const hoverRef = useRef(false);
  const focusRef = useRef(false);
  const pointerRef = useRef(0);
  const reactRef = useRef<(() => void) | null>(null);
  const [failed, setFailed] = useState(false);
  const transitionRef = useRef({ phase: transitionPhase, elapsed: 0, completed: false });
  const transitionCompleteRef = useRef(onTransitionComplete);
  useEffect(() => {
    transitionCompleteRef.current = onTransitionComplete;
  }, [onTransitionComplete]);
  useEffect(() => {
    transitionRef.current = {
      phase: transitionPhase,
      elapsed: 0,
      completed: false,
    };
    if (failed && transitionPhase !== "idle") transitionCompleteRef.current?.();
  }, [transitionPhase, failed]);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    thinkingRef.current = thinking;
  }, [thinking]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: THREE.WebGLRenderer | undefined;
    let frame = 0;
    let visible = true;
    let reaction = -10;
    let time = 0;
    let previous = performance.now();
    const scene = new THREE.Scene();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    let environment: THREE.WebGLRenderTarget | undefined;
    let observer: ResizeObserver | undefined;
    let intersection: IntersectionObserver | undefined;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = false;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      const pmrem = new THREE.PMREMGenerator(renderer);
      const room = new RoomEnvironment();
      environment = pmrem.fromScene(room, 0.04);
      scene.environment = environment.texture;
      scene.environmentIntensity = 0.35;
      room.dispose();
      pmrem.dispose();
      const camera = new THREE.OrthographicCamera(-1.65, 1.65, 1.9, -1.4, 0.1, 30);
      camera.position.set(0.25, 0.8, 8);
      camera.lookAt(0, 0.3, 0);
      scene.add(new THREE.HemisphereLight(0xfff4e4, 0x7a798a, 1.0));
      const key = new THREE.DirectionalLight(0xfff1db, 3.4);
      key.position.set(-3, 5, 5);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      Object.assign(key.shadow.camera, {
        left: -2.5,
        right: 2.5,
        top: 3,
        bottom: -2,
        near: 0.1,
        far: 15,
      });
      key.shadow.normalBias = 0.035;
      key.shadow.bias = -0.0002;
      key.shadow.radius = 4;
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xe1e8ff, 1.2);
      fill.position.set(3, 2, -2);
      scene.add(fill);
      const { root, eyes, prop } = createCreature(id);
      const happyFace = root.getObjectByName("expression-happy")!;
      const curiousFace = root.getObjectByName("expression-curious")!;
      const thinkingFace = root.getObjectByName("expression-thinking")!;
      const eyePositions = eyes.map((eye) => eye.position.clone());
      const wings = [-1, 1].map((side) => root.getObjectByName(`wing-${side}`));
      const phase = creatures.findIndex((creature) => creature.id === id) * 1.37;
      scene.add(root);
      const propAngle = prop?.rotation.z ?? 0;
      const shadowCanvas = document.createElement("canvas");
      shadowCanvas.width = 128;
      shadowCanvas.height = 128;
      const context = shadowCanvas.getContext("2d")!;
      const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, "rgba(45,36,50,0.25)");
      gradient.addColorStop(0.5, "rgba(45,36,50,0.10)");
      gradient.addColorStop(1, "rgba(45,36,50,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 128, 128);
      const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 1.2),
        new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -1.15;
      scene.add(ground);
      ground.userData.disposeTexture = shadowTexture;
      observer = new ResizeObserver(() => {
        const width = canvas.clientWidth,
          height = canvas.clientHeight;
        if (!width || !height) return;
        renderer!.setSize(width, height, false);
        const aspect = width / height;
        camera.left = -1.68 * Math.max(1, aspect);
        camera.right = -camera.left;
        camera.top = 1.88 / Math.min(1, aspect);
        camera.bottom = -camera.top;
        camera.updateProjectionMatrix();
        renderer!.render(scene, camera);
      });
      observer.observe(canvas);
      intersection = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
      });
      intersection.observe(canvas);
      reactRef.current = () => {
        if (!pausedRef.current) reaction = time;
      };
      const render = () => {
        const now = performance.now();
        const delta = Math.min((now - previous) / 1000, 0.05);
        previous = now;
        if (visible && !document.hidden) {
          if (!pausedRef.current) {
            time += delta;
            const motionTime = reducedMotion.matches ? 0 : time;
            const elapsed = time - reaction;
            const thoughtful = thinkingRef.current;
            const happy = !thoughtful && elapsed >= 0 && elapsed < 2;
            const curious = !thoughtful && !happy && (hoverRef.current || focusRef.current);
            happyFace.visible = happy;
            curiousFace.visible = curious;
            thinkingFace.visible = thoughtful;
            const bounce =
              !reducedMotion.matches && happy
                ? Math.abs(Math.sin(elapsed * Math.PI * 2)) * Math.exp(-elapsed * 2.2) * 0.15
                : 0;
            const breath = reducedMotion.matches ? 0 : Math.sin(motionTime * 1.8 + phase);
            root.position.y =
              (["lantern", "mermaid", "grim-reaper"].includes(id)
                ? breath * 0.065
                : (breath + 1) * 0.012) + bounce;
            wings.forEach((wing, index) => {
              if (wing)
                wing.rotation.y = reducedMotion.matches
                  ? 0
                  : Math.sin(motionTime * 2.5 + phase) *
                    (happy ? 0.32 : 0.14) *
                    (index === 0 ? -1 : 1);
            });
            root.scale.set(1 - breath * 0.008, 1 + breath * 0.018, 1 - breath * 0.008);
            // Ease out, hold a three-quarter glance, then return to the front.
            const cycle = (motionTime + phase) % 11;
            const glance =
              cycle < 3
                ? 0
                : cycle < 4.5
                  ? THREE.MathUtils.smoothstep(cycle, 3, 4.5)
                  : cycle < 6
                    ? 1
                    : 1 - THREE.MathUtils.smoothstep(cycle, 6, 7.5);
            const direction = Math.floor((motionTime + phase) / 11) % 2 ? -1 : 1;
            const targetTurn = reducedMotion.matches
              ? 0
              : curious
                ? pointerRef.current * 0.22
                : thoughtful
                  ? -0.14
                  : glance * THREE.MathUtils.degToRad(23) * direction;
            const targetTilt = reducedMotion.matches
              ? 0
              : curious
                ? -0.085
                : thoughtful
                  ? 0.07
                  : Math.sin(motionTime * 1.2 + phase) * 0.018;
            const blend = reducedMotion.matches ? 1 : 1 - Math.exp(-delta * 7);
            root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, targetTurn, blend);
            root.rotation.z = THREE.MathUtils.lerp(root.rotation.z, targetTilt, blend);
            const blink = (motionTime + phase) % 4.7;
            eyes.forEach((eye, index) => {
              eye.visible = !happy;
              const closure =
                !reducedMotion.matches && blink > 4.48
                  ? Math.max(0.08, Math.abs(blink - 4.59) / 0.11)
                  : 1;
              eye.scale.y =
                0.112 * closure * (thoughtful ? 0.65 : curious && index === 0 ? 1.2 : 1);
              eye.position.x =
                eyePositions[index].x +
                (curious ? pointerRef.current * 0.025 : thoughtful ? -0.023 : 0);
              eye.position.y = eyePositions[index].y + (thoughtful ? 0.02 : 0);
            });
            if (prop)
              prop.rotation.z =
                propAngle +
                (reducedMotion.matches
                  ? 0
                  : Math.sin(motionTime * 1.8 + phase) * 0.05 +
                    (happy ? Math.sin(elapsed * Math.PI * 2) * Math.exp(-elapsed) * 0.18 : 0));
            canvas.dataset.expression = happy
              ? "happy"
              : curious
                ? "curious"
                : thoughtful
                  ? "thinking"
                  : "idle";
            canvas.dataset.turn = THREE.MathUtils.radToDeg(root.rotation.y).toFixed(2);
            const transition = transitionRef.current;
            canvas.dataset.transition = transition.phase;
            if (transition.phase !== "idle") {
              // Count rendered time so shader setup and background tabs cannot skip the turn.
              transition.elapsed += delta;
              const progress = reducedMotion.matches ? 1 : Math.min(1, transition.elapsed / 0.45);
              const eased = THREE.MathUtils.smoothstep(progress, 0, 1);
              root.rotation.y =
                transition.phase === "exit" ? Math.PI * eased : -Math.PI * (1 - eased);
              root.scale.multiplyScalar(
                transition.phase === "exit" ? 1 - eased * 0.16 : 0.84 + eased * 0.16,
              );
              canvas.dataset.turn = THREE.MathUtils.radToDeg(root.rotation.y).toFixed(2);
              if (progress === 1 && !transition.completed) {
                transition.completed = true;
                transitionCompleteRef.current?.();
              }
            }
          }
          renderer!.render(scene, camera);
        }
        frame = requestAnimationFrame(render);
      };
      render();
    } catch (error) {
      console.error("Creature preview could not start", error);
      setFailed(true);
    }
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      intersection?.disconnect();
      reactRef.current = null;
      scene.traverse((object) => {
        object.userData.disposeTexture?.dispose();
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          (Array.isArray(object.material) ? object.material : [object.material]).forEach((m) =>
            materials.add(m),
          );
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      environment?.dispose();
      renderer?.dispose();
    };
  }, [id]);
  return (
    <button
      type="button"
      aria-label={`Greet ${creatures.find((c) => c.id === id)?.name}`}
      onClick={() => reactRef.current?.()}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") hoverRef.current = true;
      }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        pointerRef.current = THREE.MathUtils.clamp(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -1,
          1,
        );
      }}
      onPointerLeave={() => {
        hoverRef.current = false;
        pointerRef.current = 0;
      }}
      onFocus={(event) => {
        focusRef.current = event.currentTarget.matches(":focus-visible");
      }}
      onBlur={() => {
        focusRef.current = false;
      }}
      className="relative block aspect-square w-full cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
      {failed && (
        <span className="absolute inset-0 flex items-center justify-center text-sm text-red-700">
          3D preview unavailable
        </span>
      )}
    </button>
  );
}
