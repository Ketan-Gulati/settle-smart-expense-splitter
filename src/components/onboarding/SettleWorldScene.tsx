import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import * as THREE from 'three/src/Three.js';
import gsap from 'gsap';

export type SceneInteractionState =
  | 'idle'
  | 'email_focused'
  | 'password_focused'
  | 'google_hover'
  | 'otp_hover'
  | 'submitting'
  | 'success';

interface SettleWorldSceneProps {
  interactionState?: SceneInteractionState;
  onSceneReady?: () => void;
}

export const SettleWorldScene: React.FC<SettleWorldSceneProps> = ({
  interactionState = 'idle',
  onSceneReady,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 1024;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modulesRef = useRef<THREE.Group[]>([]);
  const centralNodeRef = useRef<THREE.Group | null>(null);
  const valueOrbRef = useRef<THREE.Mesh | null>(null);
  const valueMatRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const mousePos = useRef<THREE.Vector2>(new THREE.Vector2(0, 0));
  const reqIdRef = useRef<number | null>(null);

  // Form interaction responsiveness
  useEffect(() => {
    if (!modulesRef.current.length || !centralNodeRef.current) return;

    if (interactionState === 'email_focused') {
      modulesRef.current.forEach((mod, idx) => {
        gsap.to(mod.position, {
          y: idx === 0 ? 0.35 : 0.15,
          duration: 0.6,
          ease: 'power2.out',
        });
      });
      if (centralNodeRef.current) {
        gsap.to(centralNodeRef.current.rotation, {
          z: 0.08,
          x: -0.05,
          duration: 0.5,
          ease: 'power2.out',
        });
      }
    } else if (interactionState === 'password_focused') {
      modulesRef.current.forEach((mod) => {
        gsap.to(mod.position, { y: 0.2, duration: 0.5, ease: 'power2.out' });
      });
      if (centralNodeRef.current) {
        gsap.to(centralNodeRef.current.rotation, {
          z: 0,
          x: 0,
          duration: 0.5,
          ease: 'power2.out',
        });
      }
    } else if (interactionState === 'submitting') {
      // Rapid convergence to unified equilibrium
      modulesRef.current.forEach((mod) => {
        gsap.to(mod.position, { y: 0.2, duration: 0.4, ease: 'power3.out' });
      });
      if (centralNodeRef.current) {
        gsap.to(centralNodeRef.current.scale, {
          x: 1.1,
          y: 1.1,
          z: 1.1,
          duration: 0.3,
          yoyo: true,
          repeat: 1,
        });
      }
    }
  }, [interactionState]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || (isDesktop ? 540 : isTablet ? 480 : windowWidth);
    const height = container.clientHeight || (isDesktop ? 280 : isTablet ? 260 : 230);

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera: Sophisticated 3/4 luxury product studio angle
    const camera = new THREE.PerspectiveCamera(28, width / height, 0.1, 100);
    camera.position.set(0, 2.4, 4.8);
    camera.lookAt(0, 0.2, 0);
    cameraRef.current = camera;

    // 3. WebGL Renderer with High Precision & Studio ACES Filmic Tone Mapping
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // -------------------------------------------------------------
    // 4. BRIGHT APPLE STUDIO LIGHTING
    // Soft diffuse daylight, overhead soft key, studio rim, warm floor bounce
    // -------------------------------------------------------------
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 2.8);
    scene.add(ambientLight);

    // Main Studio Overhead Soft Spot Key
    const keySpot = new THREE.SpotLight(0xFFFFFF, 3.4);
    keySpot.position.set(2.0, 6.0, 3.5);
    keySpot.angle = Math.PI / 4.5;
    keySpot.penumbra = 0.8;
    keySpot.castShadow = true;
    keySpot.shadow.mapSize.width = 1024;
    keySpot.shadow.mapSize.height = 1024;
    keySpot.shadow.bias = -0.0001;
    scene.add(keySpot);

    // Soft Daylight Fill Light
    const fillLight = new THREE.DirectionalLight(0xF8FAFC, 1.6);
    fillLight.position.set(-3.0, 3.5, 2.0);
    scene.add(fillLight);

    // Subtle Satin Rim Highlight
    const rimLight = new THREE.DirectionalLight(0xE2E8F0, 1.2);
    rimLight.position.set(0, 2.0, -3.5);
    scene.add(rimLight);

    // Subtle warm ground bounce
    const bounceLight = new THREE.PointLight(0xF8FAFC, 1.0, 6);
    bounceLight.position.set(0, -0.5, 1.5);
    scene.add(bounceLight);

    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // -------------------------------------------------------------
    // 5. SHARED LUXURY MATERIALS (Frosted Glass, Ceramic, Satin Aluminum)
    // -------------------------------------------------------------
    const frostedGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xFFFFFF,
      roughness: 0.12,
      metalness: 0.05,
      transmission: 0.88,
      transparent: true,
      opacity: 0.95,
      ior: 1.48,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    });

    const satinAluminumMat = new THREE.MeshPhysicalMaterial({
      color: 0xCBD5E1,
      roughness: 0.28,
      metalness: 0.85,
      clearcoat: 0.4,
    });

    const ceramicMat = new THREE.MeshPhysicalMaterial({
      color: 0xF8FAFC,
      roughness: 0.2,
      metalness: 0.05,
      clearcoat: 0.8,
    });

    // -------------------------------------------------------------
    // 6. THREE VALUE MODULES (Suspended Precision Ceramic/Glass Nodes)
    // Top Module (A), Bottom-Left Module (B), Bottom-Right Module (C)
    // -------------------------------------------------------------
    const modulesGroup = new THREE.Group();
    worldGroup.add(modulesGroup);
    modulesRef.current = [];

    const modulesData = [
      { id: 'modA', x: 0, y: 0.65, z: -0.65 },      // Top
      { id: 'modB', x: -0.95, y: 0.05, z: 0.45 },   // Bottom-Left
      { id: 'modC', x: 0.95, y: 0.05, z: 0.45 },    // Bottom-Right
    ];

    const moduleObjects: THREE.Group[] = [];

    modulesData.forEach((data) => {
      const mod = new THREE.Group();
      mod.position.set(data.x, data.y, data.z);

      // 1. Satin Aluminum Base Disc
      const baseGeo = new THREE.CylinderGeometry(0.24, 0.27, 0.05, 36);
      const baseMesh = new THREE.Mesh(baseGeo, satinAluminumMat);
      baseMesh.castShadow = true;
      baseMesh.receiveShadow = true;
      mod.add(baseMesh);

      // 2. Ceramic / Frosted Acrylic Body
      const bodyGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.22, 36);
      const bodyMesh = new THREE.Mesh(bodyGeo, ceramicMat);
      bodyMesh.position.y = 0.12;
      bodyMesh.castShadow = true;
      mod.add(bodyMesh);

      // 3. Precision Polished Frosted Glass Cap
      const capGeo = new THREE.SphereGeometry(0.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const capMesh = new THREE.Mesh(capGeo, frostedGlassMat);
      capMesh.position.y = 0.23;
      capMesh.castShadow = true;
      mod.add(capMesh);

      modulesGroup.add(mod);
      moduleObjects.push(mod);
      modulesRef.current.push(mod);
    });

    // -------------------------------------------------------------
    // 7. CENTRAL CONNECTING STRUCTURE & EQUILIBRIUM PRISM
    // Minimal Satin Struts + Suspended Frosted Equilibrium Core
    // -------------------------------------------------------------
    const centralGroup = new THREE.Group();
    centralGroup.position.set(0, 0.25, 0.1);
    worldGroup.add(centralGroup);
    centralNodeRef.current = centralGroup;

    // Elegant Slender Satin Struts connecting to modules
    const strutMat = new THREE.MeshPhysicalMaterial({
      color: 0xE2E8F0,
      roughness: 0.35,
      metalness: 0.6,
    });

    const createStrut = (p1: THREE.Vector3, p2: THREE.Vector3) => {
      const dir = new THREE.Vector3().subVectors(p2, p1);
      const len = dir.length();
      const strutGeo = new THREE.CylinderGeometry(0.012, 0.012, len, 16);
      const strut = new THREE.Mesh(strutGeo, strutMat);
      strut.position.copy(p1).addScaledVector(dir, 0.5);
      strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      return strut;
    };

    const cPos = new THREE.Vector3(0, 0.25, 0.1);
    const strut1 = createStrut(cPos, new THREE.Vector3(modulesData[0]!.x, modulesData[0]!.y + 0.1, modulesData[0]!.z));
    const strut2 = createStrut(cPos, new THREE.Vector3(modulesData[1]!.x, modulesData[1]!.y + 0.1, modulesData[1]!.z));
    const strut3 = createStrut(cPos, new THREE.Vector3(modulesData[2]!.x, modulesData[2]!.y + 0.1, modulesData[2]!.z));
    worldGroup.add(strut1, strut2, strut3);

    // Central Frosted Glass Rhombic Balance Prism
    const corePrismGeo = new THREE.OctahedronGeometry(0.18, 1);
    const corePrism = new THREE.Mesh(corePrismGeo, frostedGlassMat);
    corePrism.castShadow = true;
    centralGroup.add(corePrism);

    // Minimal Satin Inset Ring on Central Core
    const ringGeo = new THREE.TorusGeometry(0.24, 0.009, 16, 48);
    const ring = new THREE.Mesh(ringGeo, satinAluminumMat);
    ring.rotation.x = Math.PI / 4;
    centralGroup.add(ring);

    // -------------------------------------------------------------
    // 8. LUMINOUS VALUE OBJECT & PHYSICAL CAUSE-AND-EFFECT STORY LOOP
    // 0–2s: Imperfect Imbalance
    // 2–4s: Luminous Settle Cyan Value Element moves from Module B -> A
    // 4–6s: Modules physically respond and elevate
    // 6–8s: System smoothly settles into perfect equilibrium
    // 8–9s: Calm pause
    // 9–12s: Second cycle (Module C -> A)
    // -------------------------------------------------------------
    const valGeo = new THREE.SphereGeometry(0.065, 24, 24);
    const valMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284C7,
      emissive: 0x0284C7,
      emissiveIntensity: 0.9,
      roughness: 0.1,
      metalness: 0.3,
      clearcoat: 1.0,
    });
    valueMatRef.current = valMat;

    const valueOrb = new THREE.Mesh(valGeo, valMat);
    valueOrb.visible = false;
    valueOrb.castShadow = true;
    worldGroup.add(valueOrb);
    valueOrbRef.current = valueOrb;

    const modA = moduleObjects[0]!;
    const modB = moduleObjects[1]!;
    const modC = moduleObjects[2]!;

    const tl = gsap.timeline({ repeat: -1 });
    timelineRef.current = tl;

    // === 0s - 2s: PHASE 1 (IMPERFECT INITIAL IMBALANCE) ===
    tl.to(modA.position, { y: 0.78, duration: 1.2, ease: 'power2.inOut' }, 0);
    tl.to(modB.position, { y: -0.04, duration: 1.2, ease: 'power2.inOut' }, 0);
    tl.to(modC.position, { y: 0.05, duration: 1.2, ease: 'power2.inOut' }, 0);
    tl.to(centralGroup.rotation, { z: -0.1, x: 0.06, duration: 1.2, ease: 'power2.inOut' }, 0);

    // === 2s - 4s: PHASE 2 (LUMINOUS VALUE FLOWS B -> A) ===
    tl.call(() => {
      valueOrb.visible = true;
    }, [], 2.0);

    tl.fromTo(
      valueOrb.position,
      { x: modulesData[1]!.x, y: 0.35, z: modulesData[1]!.z },
      { x: modulesData[0]!.x, y: 0.95, z: modulesData[0]!.z, duration: 2.0, ease: 'power2.inOut' },
      2.0
    );

    // === 4s - 6s: PHASE 3 (PHYSICAL RESPONSE & HARMONIZATION) ===
    // As value arrives, source module rises from lightened debt, core self-levels
    tl.to(modB.position, { y: 0.05, duration: 1.8, ease: 'power2.out' }, 3.5);
    tl.to(modA.position, { y: 0.65, duration: 1.8, ease: 'power2.out' }, 3.5);
    tl.to(centralGroup.rotation, { z: 0, x: 0, duration: 1.8, ease: 'back.out(1.4)' }, 3.8);

    // === 6s - 8s: PHASE 4 (PERFECT EQUILIBRIUM) ===
    tl.to(valMat, { emissiveIntensity: 0.1, duration: 0.8, ease: 'power2.out' }, 6.0);
    tl.call(() => {
      valueOrb.visible = false;
      valMat.emissiveIntensity = 0.9;
    }, [], 7.8);

    // === 8s - 9s: PHASE 5 (CALM BREATH) ===
    tl.to(corePrism.rotation, { y: '+=0.8', duration: 1.0, ease: 'power1.inOut' }, 8.0);

    // === 9s - 12s: PHASE 6 (CYCLE 2: VALUE FLOWS C -> A & SETTLES) ===
    tl.to(modC.position, { y: -0.04, duration: 0.8, ease: 'power2.inOut' }, 9.0);
    tl.call(() => {
      valueOrb.visible = true;
    }, [], 9.4);
    tl.fromTo(
      valueOrb.position,
      { x: modulesData[2]!.x, y: 0.35, z: modulesData[2]!.z },
      { x: modulesData[0]!.x, y: 0.95, z: modulesData[0]!.z, duration: 1.8, ease: 'power2.inOut' },
      9.4
    );
    tl.to(modC.position, { y: 0.05, duration: 1.4, ease: 'back.out(1.5)' }, 10.4);
    tl.call(() => {
      valueOrb.visible = false;
    }, [], 11.8);

    onSceneReady?.();

    // -------------------------------------------------------------
    // 9. CONTINUOUS SUBTLE AMBIENT TICKER LOOP
    // -------------------------------------------------------------
    let clock = new THREE.Clock();

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mousePos.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mousePos.current.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };
    container.addEventListener('mousemove', handlePointerMove);

    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Ultra-subtle organic breathing of central prism
      if (centralGroup) {
        centralGroup.position.y = 0.25 + Math.sin(elapsed * 1.5) * 0.015;
        corePrism.rotation.y = elapsed * 0.15;
      }

      // Parallax mouse responsiveness
      const targetCamX = mousePos.current.x * 0.18;
      const targetCamY = 2.4 + mousePos.current.y * 0.12;
      camera.position.x += (targetCamX - camera.position.x) * 0.035;
      camera.position.y += (targetCamY - camera.position.y) * 0.035;
      camera.lookAt(0, 0.2, 0);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
      container.removeEventListener('mousemove', handlePointerMove);
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [isDesktop, isTablet, windowWidth]);

  return (
    <View style={styles.outerContainer}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: isDesktop ? 280 : isTablet ? 260 : 230,
          position: 'relative',
          cursor: 'grab',
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
