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

  // Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const personTokensRef = useRef<THREE.Group[]>([]);
  const settlementCoreRef = useRef<THREE.Group | null>(null);
  const innerRingRef = useRef<THREE.Mesh | null>(null);
  const outerRingRef = useRef<THREE.Mesh | null>(null);
  const valueParticlesRef = useRef<THREE.Mesh[]>([]);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const mousePos = useRef<THREE.Vector2>(new THREE.Vector2(0, 0));
  const reqIdRef = useRef<number | null>(null);

  // Form interaction responsiveness
  useEffect(() => {
    if (!personTokensRef.current.length || !settlementCoreRef.current) return;

    if (interactionState === 'email_focused') {
      personTokensRef.current.forEach((token, idx) => {
        gsap.to(token.position, {
          y: idx === 0 ? 0.22 : 0.08,
          duration: 0.6,
          ease: 'power2.out',
        });
      });
      if (settlementCoreRef.current) {
        gsap.to(settlementCoreRef.current.rotation, {
          z: 0.08,
          x: -0.04,
          duration: 0.5,
          ease: 'power2.out',
        });
      }
    } else if (interactionState === 'password_focused') {
      personTokensRef.current.forEach((token) => {
        gsap.to(token.position, { y: 0.12, duration: 0.5, ease: 'power2.out' });
      });
      if (settlementCoreRef.current) {
        gsap.to(settlementCoreRef.current.rotation, {
          z: 0,
          x: 0,
          duration: 0.5,
          ease: 'power2.out',
        });
      }
    } else if (interactionState === 'google_hover' || interactionState === 'otp_hover') {
      if (innerRingRef.current) {
        gsap.to(innerRingRef.current.rotation, {
          z: '+=1.57',
          duration: 0.8,
          ease: 'power2.inOut',
        });
      }
    } else if (interactionState === 'submitting') {
      // Rapid convergence to perfect equilibrium
      personTokensRef.current.forEach((token) => {
        gsap.to(token.position, { y: 0.1, duration: 0.4, ease: 'power3.out' });
      });
      if (settlementCoreRef.current) {
        gsap.to(settlementCoreRef.current.scale, {
          x: 1.1,
          y: 1.1,
          z: 1.1,
          duration: 0.4,
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
    const height = container.clientHeight || (isDesktop ? 340 : isTablet ? 300 : 270);

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera: Subtle high-end luxury product perspective
    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
    camera.position.set(0, 2.6, 5.2);
    camera.lookAt(0, 0.3, 0);
    cameraRef.current = camera;

    // 3. WebGL Renderer with High Precision & ACES Filmic Tone Mapping
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // -------------------------------------------------------------
    // 4. HIGH-END STUDIO LIGHTING (Soft Key, Translucent Rim, Subtle Cyan)
    // -------------------------------------------------------------
    const ambientLight = new THREE.AmbientLight(0x0f172a, 2.4);
    scene.add(ambientLight);

    // Main Soft Studio Overhead Key
    const keySpot = new THREE.SpotLight(0xf8fafc, 3.8);
    keySpot.position.set(2, 6.0, 3.5);
    keySpot.angle = Math.PI / 5;
    keySpot.penumbra = 0.8;
    keySpot.castShadow = true;
    keySpot.shadow.mapSize.width = 1024;
    keySpot.shadow.mapSize.height = 1024;
    scene.add(keySpot);

    // Soft Rim Light (Satin Silver Reflections)
    const satinRim = new THREE.DirectionalLight(0x94a3b8, 1.8);
    satinRim.position.set(-3.5, 3.0, -2.5);
    scene.add(satinRim);

    // Controlled Settle Cyan Highlight
    const cyanAccent = new THREE.PointLight(0x0ea5e9, 2.8, 7.5);
    cyanAccent.position.set(0, 1.2, 0.5);
    scene.add(cyanAccent);

    // Deep Indigo Ambient Fill
    const indigoFill = new THREE.PointLight(0x6366f1, 1.2, 8);
    indigoFill.position.set(0, -1.0, 2.0);
    scene.add(indigoFill);

    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // -------------------------------------------------------------
    // 5. MINIMAL SUSPENDED HORIZON PLANE (Ultra-thin Smoked Glass Disc)
    // -------------------------------------------------------------
    const horizonGroup = new THREE.Group();
    worldGroup.add(horizonGroup);

    const discGeo = new THREE.CylinderGeometry(1.85, 1.88, 0.02, 64);
    const discMat = new THREE.MeshPhysicalMaterial({
      color: 0x090d16,
      roughness: 0.15,
      metalness: 0.3,
      transmission: 0.7,
      transparent: true,
      opacity: 0.85,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const horizonDisc = new THREE.Mesh(discGeo, discMat);
    horizonDisc.position.y = -0.05;
    horizonDisc.receiveShadow = true;
    horizonGroup.add(horizonDisc);

    // Precision Inset Groove on Disc
    const grooveGeo = new THREE.TorusGeometry(1.42, 0.008, 16, 80);
    const grooveMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.3,
      metalness: 0.8,
    });
    const groove = new THREE.Mesh(grooveGeo, grooveMat);
    groove.rotation.x = Math.PI / 2;
    groove.position.y = -0.038;
    horizonGroup.add(groove);

    // -------------------------------------------------------------
    // 6. CENTRAL ABSTRACT SETTLEMENT CORE
    // Precision Engineered Balancing Mechanism:
    // Floating Smoked Glass Rhombus/Core + Dual Satin Gimbal Rings
    // -------------------------------------------------------------
    const coreGroup = new THREE.Group();
    coreGroup.position.set(0, 0.72, 0);
    worldGroup.add(coreGroup);
    settlementCoreRef.current = coreGroup;

    // Satin Metal Material for Precision Rings
    const satinMetalMat = new THREE.MeshPhysicalMaterial({
      color: 0xcfd8dc,
      roughness: 0.25,
      metalness: 0.85,
      clearcoat: 0.5,
      clearcoatRoughness: 0.1,
    });

    // Outer Precision Gimbal Ring
    const outerRingGeo = new THREE.TorusGeometry(0.58, 0.014, 16, 64);
    const outerRing = new THREE.Mesh(outerRingGeo, satinMetalMat);
    coreGroup.add(outerRing);
    outerRingRef.current = outerRing;

    // Inner Precision Ring (Offset & Slanted)
    const innerRingGeo = new THREE.TorusGeometry(0.44, 0.012, 16, 64);
    const innerRingMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.7,
      clearcoat: 0.8,
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.x = Math.PI / 4;
    coreGroup.add(innerRing);
    innerRingRef.current = innerRing;

    // Central Floating Smoked Glass Equilibrium Core (Beveled Octahedron)
    const coreGeo = new THREE.OctahedronGeometry(0.24, 1);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.85,
      transparent: true,
      opacity: 0.95,
      ior: 1.52,
      clearcoat: 1.0,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.castShadow = true;
    coreGroup.add(coreMesh);

    // Subtle Internal Luminous Bead at Core Center
    const beadGeo = new THREE.SphereGeometry(0.065, 24, 24);
    const beadMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.6,
    });
    const bead = new THREE.Mesh(beadGeo, beadMat);
    coreGroup.add(bead);

    // -------------------------------------------------------------
    // 7. THREE ABSTRACT PERSON TOKENS
    // Minimal Architectural Sculptures: Weighted Satin Metal Base + Smoked Glass Capsule
    // -------------------------------------------------------------
    const tokensGroup = new THREE.Group();
    worldGroup.add(tokensGroup);
    personTokensRef.current = [];

    const tokensData = [
      { id: 'tokenA', angle: -Math.PI * 0.75, dist: 1.35, label: 'A' }, // Left Front
      { id: 'tokenB', angle: Math.PI * 0.5, dist: 1.25, label: 'B' },   // Top Center
      { id: 'tokenC', angle: -Math.PI * 0.25, dist: 1.35, label: 'C' },  // Right Front
    ];

    const tokenMeshes: THREE.Group[] = [];

    tokensData.forEach((td) => {
      const token = new THREE.Group();
      const x = Math.cos(td.angle) * td.dist;
      const z = Math.sin(td.angle) * td.dist;
      token.position.set(x, 0.12, z);

      // Weighted Satin Titanium Base
      const basePlinthGeo = new THREE.CylinderGeometry(0.18, 0.21, 0.08, 32);
      const basePlinth = new THREE.Mesh(basePlinthGeo, satinMetalMat);
      basePlinth.position.y = 0.04;
      basePlinth.castShadow = true;
      basePlinth.receiveShadow = true;
      token.add(basePlinth);

      // Precision Smoked Glass Pill / Column
      const columnGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.38, 32);
      const columnMat = new THREE.MeshPhysicalMaterial({
        color: 0x1e293b,
        roughness: 0.15,
        metalness: 0.2,
        transmission: 0.75,
        transparent: true,
        opacity: 0.9,
        clearcoat: 1.0,
      });
      const column = new THREE.Mesh(columnGeo, columnMat);
      column.position.y = 0.27;
      column.castShadow = true;
      token.add(column);

      // Rounded Satin Top Dome
      const domeGeo = new THREE.SphereGeometry(0.14, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const dome = new THREE.Mesh(domeGeo, satinMetalMat);
      dome.position.y = 0.46;
      dome.castShadow = true;
      token.add(dome);

      // Subtle Precision Cyan Ring Inset on Base
      const ringInsetGeo = new THREE.TorusGeometry(0.19, 0.006, 16, 32);
      const ringInsetMat = new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.8,
      });
      const ringInset = new THREE.Mesh(ringInsetGeo, ringInsetMat);
      ringInset.rotation.x = Math.PI / 2;
      ringInset.position.y = 0.05;
      token.add(ringInset);

      tokensGroup.add(token);
      tokenMeshes.push(token);
      personTokensRef.current.push(token);
    });

    // -------------------------------------------------------------
    // 8. VALUE PARTICLES & CHOREOGRAPHED PHYSICAL STORY LOOP
    // Story Cycle:
    // Phase 1 (Imbalance) -> Phase 2 (Value Transfer A -> B) ->
    // Phase 3 (Settlement & Alignment) -> Phase 4 (Equilibrium Breath)
    // -------------------------------------------------------------
    const particlesGroup = new THREE.Group();
    worldGroup.add(particlesGroup);
    valueParticlesRef.current = [];

    const pGeo = new THREE.SphereGeometry(0.032, 16, 16);
    const pMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 2.2,
    });

    const particle1 = new THREE.Mesh(pGeo, pMat);
    const particle2 = new THREE.Mesh(pGeo, pMat);
    const particle3 = new THREE.Mesh(pGeo, pMat);
    particle1.visible = false;
    particle2.visible = false;
    particle3.visible = false;

    particlesGroup.add(particle1, particle2, particle3);
    valueParticlesRef.current = [particle1, particle2, particle3];

    // Master Timeline
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.2 });
    timelineRef.current = tl;

    const tokenA = tokenMeshes[0]!;
    const tokenB = tokenMeshes[1]!;
    const tokenC = tokenMeshes[2]!;

    // === PHASE 1: IMBALANCE (0s - 1.2s) ===
    // Initial state: Person A has paid for Person B & C
    tl.to(tokenA.position, { y: 0.24, duration: 1.0, ease: 'power2.inOut' }, 0);
    tl.to(tokenB.position, { y: 0.02, duration: 1.0, ease: 'power2.inOut' }, 0);
    tl.to(tokenC.position, { y: 0.04, duration: 1.0, ease: 'power2.inOut' }, 0);
    tl.to(coreGroup.rotation, { z: -0.12, x: 0.06, duration: 1.0, ease: 'power2.inOut' }, 0);

    // === PHASE 2: TRANSACTION & VALUE TRANSFER (1.2s - 2.8s) ===
    // Value particles travel smoothly from Token B -> Token A via curved bezier trajectory
    const posA = tokenA.position;
    const posB = tokenB.position;
    const posC = tokenC.position;

    tl.call(() => {
      particle1.visible = true;
      particle2.visible = true;
      particle3.visible = true;
    }, [], 1.2);

    // Particle 1 & 2: B -> A
    tl.fromTo(
      particle1.position,
      { x: posB.x, y: posB.y + 0.45, z: posB.z },
      { x: posA.x, y: posA.y + 0.45, z: posA.z, duration: 1.2, ease: 'power2.inOut' },
      1.2
    );
    tl.fromTo(
      particle2.position,
      { x: posB.x, y: posB.y + 0.48, z: posB.z },
      { x: posA.x, y: posA.y + 0.48, z: posA.z, duration: 1.2, delay: 0.15, ease: 'power2.inOut' },
      1.2
    );

    // Particle 3: C -> A
    tl.fromTo(
      particle3.position,
      { x: posC.x, y: posC.y + 0.45, z: posC.z },
      { x: posA.x, y: posA.y + 0.45, z: posA.z, duration: 1.2, delay: 0.25, ease: 'power2.inOut' },
      1.2
    );

    // === PHASE 3: SETTLEMENT & EQUILIBRIUM (2.4s - 3.8s) ===
    // All tokens align to uniform balanced height, core self-levels
    tl.to(tokenA.position, { y: 0.12, duration: 1.2, ease: 'back.out(1.5)' }, 2.4);
    tl.to(tokenB.position, { y: 0.12, duration: 1.2, ease: 'back.out(1.5)' }, 2.4);
    tl.to(tokenC.position, { y: 0.12, duration: 1.2, ease: 'back.out(1.5)' }, 2.4);

    tl.to(coreGroup.rotation, { z: 0, x: 0, duration: 1.2, ease: 'back.out(1.8)' }, 2.4);
    tl.to(innerRing.rotation, { z: Math.PI, duration: 1.4, ease: 'power2.inOut' }, 2.4);

    tl.call(() => {
      particle1.visible = false;
      particle2.visible = false;
      particle3.visible = false;
    }, [], 3.8);

    // === PHASE 4: EQUILIBRIUM BREATH (3.8s - 5.0s) ===
    // Subtle float pause
    tl.to(coreMesh.rotation, { y: '+=1.57', duration: 1.2, ease: 'power1.inOut' }, 3.8);

    onSceneReady?.();

    // -------------------------------------------------------------
    // 9. CONTINUOUS AMBIENT TICKER LOOP
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

      // Subtle central core floating levitation
      if (coreGroup) {
        coreGroup.position.y = 0.72 + Math.sin(elapsed * 1.6) * 0.025;
        outerRing.rotation.y = elapsed * 0.25;
      }

      // Parallax mouse responsiveness
      const targetCamX = mousePos.current.x * 0.25;
      const targetCamY = 2.6 + mousePos.current.y * 0.18;
      camera.position.x += (targetCamX - camera.position.x) * 0.04;
      camera.position.y += (targetCamY - camera.position.y) * 0.04;
      camera.lookAt(0, 0.3, 0);

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
          height: isDesktop ? 340 : isTablet ? 300 : 270,
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
