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
  const personTokensRef = useRef<THREE.Group[]>([]);
  const expensePlatesRef = useRef<THREE.Group[]>([]);
  const settlementCoreRef = useRef<THREE.Group | null>(null);
  const valueTokenRef = useRef<THREE.Mesh | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const mousePos = useRef<THREE.Vector2>(new THREE.Vector2(0, 0));
  const reqIdRef = useRef<number | null>(null);

  // Helper to draw clean micro typography on luxury translucent acrylic plates
  const createPlateTexture = (label: string, value: string) => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Crisp pure white matte card with subtle inner border
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 256, 128);

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 248, 120);

    // Primary Category / Expense Label
    ctx.fillStyle = '#0F172A';
    ctx.font = '600 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 24, 48);

    // Secondary Abstract Numerical Weight
    ctx.fillStyle = '#0284C7';
    ctx.font = '700 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(value, 232, 84);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  };

  // Form interaction responsiveness
  useEffect(() => {
    if (!personTokensRef.current.length || !settlementCoreRef.current) return;

    if (interactionState === 'email_focused') {
      personTokensRef.current.forEach((token, idx) => {
        gsap.to(token.position, {
          y: idx === 0 ? 0.22 : 0.08,
          duration: 0.5,
          ease: 'power2.out',
        });
      });
      if (settlementCoreRef.current) {
        gsap.to(settlementCoreRef.current.rotation, {
          z: 0.06,
          x: -0.04,
          duration: 0.5,
          ease: 'power2.out',
        });
      }
    } else if (interactionState === 'password_focused') {
      personTokensRef.current.forEach((token) => {
        gsap.to(token.position, { y: 0.1, duration: 0.5, ease: 'power2.out' });
      });
      if (settlementCoreRef.current) {
        gsap.to(settlementCoreRef.current.rotation, {
          z: 0,
          x: 0,
          duration: 0.5,
          ease: 'power2.out',
        });
      }
    } else if (interactionState === 'submitting') {
      // Direct convergence to complete equilibrium
      personTokensRef.current.forEach((token) => {
        gsap.to(token.position, { y: 0.1, duration: 0.4, ease: 'power3.out' });
      });
      if (settlementCoreRef.current) {
        gsap.to(settlementCoreRef.current.scale, {
          x: 1.08,
          y: 1.08,
          z: 1.08,
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
    const height = container.clientHeight || (isDesktop ? 320 : isTablet ? 290 : 260);

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera: Subtle high-end product table angle
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
    camera.position.set(0, 3.2, 5.2);
    camera.lookAt(0, 0.35, 0);
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
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // -------------------------------------------------------------
    // 4. BRIGHT APPLE-STYLE STUDIO LIGHTING
    // Soft global illumination, daylight key, warm bounce, subtle reflections
    // -------------------------------------------------------------
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 2.6);
    scene.add(ambientLight);

    // Main Studio Soft Overhead Key
    const keySpot = new THREE.SpotLight(0xFFFFFF, 3.6);
    keySpot.position.set(2.5, 7.0, 4.0);
    keySpot.angle = Math.PI / 4.2;
    keySpot.penumbra = 0.85;
    keySpot.castShadow = true;
    keySpot.shadow.mapSize.width = 1024;
    keySpot.shadow.mapSize.height = 1024;
    keySpot.shadow.bias = -0.0001;
    scene.add(keySpot);

    // Soft Daylight Fill Light
    const fillLight = new THREE.DirectionalLight(0xF8FAFC, 1.4);
    fillLight.position.set(-3.5, 4.0, 2.0);
    scene.add(fillLight);

    // Studio Rim Highlight
    const rimLight = new THREE.DirectionalLight(0xE0F2FE, 1.2);
    rimLight.position.set(0, 2.5, -4.0);
    scene.add(rimLight);

    // Warm Table Bounce Light
    const bounceLight = new THREE.PointLight(0xF8FAFC, 1.2, 8);
    bounceLight.position.set(0, 0.2, 1.5);
    scene.add(bounceLight);

    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // -------------------------------------------------------------
    // 5. THE SETTLEMENT TABLE SURFACE
    // Soft warm off-white / pearl ceramic workspace with subtle beveled bevel
    // -------------------------------------------------------------
    const tableGroup = new THREE.Group();
    worldGroup.add(tableGroup);

    const tableGeo = new THREE.CylinderGeometry(2.05, 2.1, 0.08, 64);
    const tableMat = new THREE.MeshPhysicalMaterial({
      color: 0xF8FAFC,
      roughness: 0.18,
      metalness: 0.05,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
    });
    const tableMesh = new THREE.Mesh(tableGeo, tableMat);
    tableMesh.position.y = -0.04;
    tableMesh.receiveShadow = true;
    tableGroup.add(tableMesh);

    // Minimal Inset Precision Track on Table
    const trackGeo = new THREE.TorusGeometry(1.48, 0.007, 16, 80);
    const trackMat = new THREE.MeshStandardMaterial({
      color: 0xE2E8F0,
      roughness: 0.4,
      metalness: 0.2,
    });
    const trackMesh = new THREE.Mesh(trackGeo, trackMat);
    trackMesh.rotation.x = Math.PI / 2;
    trackMesh.position.y = 0.002;
    tableGroup.add(trackMesh);

    // -------------------------------------------------------------
    // 6. CENTRAL SETTLEMENT BALANCING MECHANISM
    // Precision Engineered Optical Balance:
    // Floating Frosted Glass Octahedron Core + Dual Brushed Aluminum Gimbal Rings
    // -------------------------------------------------------------
    const coreGroup = new THREE.Group();
    coreGroup.position.set(0, 0.68, 0);
    worldGroup.add(coreGroup);
    settlementCoreRef.current = coreGroup;

    // Brushed Aluminum Gimbal Material
    const aluminumMat = new THREE.MeshPhysicalMaterial({
      color: 0xCBD5E1,
      roughness: 0.25,
      metalness: 0.85,
      clearcoat: 0.6,
    });

    // Outer Precision Gimbal Ring
    const outerGimbalGeo = new THREE.TorusGeometry(0.52, 0.015, 16, 64);
    const outerGimbal = new THREE.Mesh(outerGimbalGeo, aluminumMat);
    coreGroup.add(outerGimbal);

    // Inner Precision Ring with subtle Cobalt accent
    const innerGimbalGeo = new THREE.TorusGeometry(0.38, 0.012, 16, 64);
    const innerGimbalMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284C7,
      roughness: 0.2,
      metalness: 0.6,
      clearcoat: 0.8,
    });
    const innerGimbal = new THREE.Mesh(innerGimbalGeo, innerGimbalMat);
    innerGimbal.rotation.x = Math.PI / 3.5;
    coreGroup.add(innerGimbal);

    // Central Frosted Optical Glass Equilibrium Gem
    const gemGeo = new THREE.OctahedronGeometry(0.22, 1);
    const gemMat = new THREE.MeshPhysicalMaterial({
      color: 0xF8FAFC,
      roughness: 0.12,
      metalness: 0.1,
      transmission: 0.85,
      transparent: true,
      opacity: 0.95,
      ior: 1.52,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    });
    const gemMesh = new THREE.Mesh(gemGeo, gemMat);
    gemMesh.castShadow = true;
    coreGroup.add(gemMesh);

    // Subtle Internal Cobalt Core Node
    const nodeGeo = new THREE.SphereGeometry(0.065, 24, 24);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0x0284C7,
      roughness: 0.2,
      metalness: 0.5,
    });
    const node = new THREE.Mesh(nodeGeo, nodeMat);
    coreGroup.add(node);

    // -------------------------------------------------------------
    // 7. THREE ABSTRACT SCULPTURAL PERSON TOKENS
    // Elegant Luxury Ceramic & Brushed Metal Capsules with Identity Accents
    // Cobalt (Person A), Muted Teal (Person B), Soft Coral (Person C)
    // -------------------------------------------------------------
    const tokensGroup = new THREE.Group();
    worldGroup.add(tokensGroup);
    personTokensRef.current = [];

    const tokensData = [
      { id: 'tokenA', angle: -Math.PI * 0.72, dist: 1.38, accent: 0x0284C7, label: 'A' }, // Left Front (Cobalt)
      { id: 'tokenB', angle: Math.PI * 0.5, dist: 1.28, accent: 0x0D9488, label: 'B' },   // Top Center (Teal)
      { id: 'tokenC', angle: -Math.PI * 0.28, dist: 1.38, accent: 0xF97316, label: 'C' },  // Right Front (Coral)
    ];

    const tokenMeshes: THREE.Group[] = [];

    tokensData.forEach((td) => {
      const token = new THREE.Group();
      const x = Math.cos(td.angle) * td.dist;
      const z = Math.sin(td.angle) * td.dist;
      token.position.set(x, 0.1, z);

      // Weighted Brushed Metal Base Plinth
      const baseGeo = new THREE.CylinderGeometry(0.18, 0.21, 0.08, 32);
      const base = new THREE.Mesh(baseGeo, aluminumMat);
      base.position.y = 0.04;
      base.castShadow = true;
      base.receiveShadow = true;
      token.add(base);

      // Satin White Ceramic Capsule Body
      const bodyGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.36, 32);
      const bodyMat = new THREE.MeshPhysicalMaterial({
        color: 0xFFFFFF,
        roughness: 0.2,
        metalness: 0.05,
        clearcoat: 0.9,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.26;
      body.castShadow = true;
      token.add(body);

      // Elegant Color Identity Collar Ring
      const collarGeo = new THREE.TorusGeometry(0.145, 0.012, 16, 32);
      const collarMat = new THREE.MeshStandardMaterial({
        color: td.accent,
        roughness: 0.25,
        metalness: 0.6,
      });
      const collar = new THREE.Mesh(collarGeo, collarMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.44;
      token.add(collar);

      // Polished Frosted Glass Top Dome
      const domeGeo = new THREE.SphereGeometry(0.14, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const domeMat = new THREE.MeshPhysicalMaterial({
        color: 0xF8FAFC,
        roughness: 0.15,
        transmission: 0.8,
        transparent: true,
        opacity: 0.9,
        clearcoat: 1.0,
      });
      const dome = new THREE.Mesh(domeGeo, domeMat);
      dome.position.y = 0.45;
      dome.castShadow = true;
      token.add(dome);

      tokensGroup.add(token);
      tokenMeshes.push(token);
      personTokensRef.current.push(token);
    });

    // -------------------------------------------------------------
    // 8. THREE PHYSICAL EXPENSE PLATES ("Dinner 180", "Cab 42", "Stay 320")
    // Minimal frosted acrylic tiles positioned near tokens
    // -------------------------------------------------------------
    const platesGroup = new THREE.Group();
    worldGroup.add(platesGroup);
    expensePlatesRef.current = [];

    const platesData = [
      { label: 'Dinner', val: '180', pos: new THREE.Vector3(-1.15, 0.78, -0.2) },
      { label: 'Stay', val: '320', pos: new THREE.Vector3(0.05, 0.88, -0.65) },
      { label: 'Cab', val: '42', pos: new THREE.Vector3(1.15, 0.78, -0.2) },
    ];

    platesData.forEach((pd) => {
      const plateGroup = new THREE.Group();
      plateGroup.position.copy(pd.pos);

      const plateGeo = new THREE.BoxGeometry(0.48, 0.24, 0.03);
      const plateTex = createPlateTexture(pd.label, pd.val);

      const materials = [
        new THREE.MeshPhysicalMaterial({ color: 0xFFFFFF, roughness: 0.2 }),
        new THREE.MeshPhysicalMaterial({ color: 0xFFFFFF, roughness: 0.2 }),
        new THREE.MeshPhysicalMaterial({ color: 0xFFFFFF, roughness: 0.2 }),
        new THREE.MeshPhysicalMaterial({ color: 0xFFFFFF, roughness: 0.2 }),
        new THREE.MeshPhysicalMaterial({
          map: plateTex,
          roughness: 0.15,
          clearcoat: 0.9,
        }),
        new THREE.MeshPhysicalMaterial({ color: 0xFFFFFF, roughness: 0.2 }),
      ];

      const plateMesh = new THREE.Mesh(plateGeo, materials);
      plateMesh.castShadow = true;
      plateGroup.add(plateMesh);

      plateGroup.lookAt(0, 1.8, 5.0);
      platesGroup.add(plateGroup);
      expensePlatesRef.current.push(plateGroup);
    });

    // -------------------------------------------------------------
    // 9. LUMINOUS VALUE TOKEN & CINEMATIC FINANCIAL STORY LOOP
    // Cause-and-Effect Choreography:
    // Phase 1 (Imbalance) -> Phase 2 (Value Token Moves B -> A) ->
    // Phase 3 (Equilibrium Resolution) -> Phase 4 (Calm Breath)
    // -------------------------------------------------------------
    const valGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.025, 24);
    const valMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284C7,
      roughness: 0.15,
      metalness: 0.8,
      clearcoat: 1.0,
    });
    const valueToken = new THREE.Mesh(valGeo, valMat);
    valueToken.visible = false;
    valueToken.castShadow = true;
    worldGroup.add(valueToken);
    valueTokenRef.current = valueToken;

    const tokenA = tokenMeshes[0]!;
    const tokenB = tokenMeshes[1]!;
    const tokenC = tokenMeshes[2]!;

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.0 });
    timelineRef.current = tl;

    // === PHASE 1: IMBALANCE (0s - 1.2s) ===
    // Person A is creditor (rises); Person B is debtor (lowers); Core tilts
    tl.to(tokenA.position, { y: 0.24, duration: 1.0, ease: 'power2.inOut' }, 0);
    tl.to(tokenB.position, { y: 0.02, duration: 1.0, ease: 'power2.inOut' }, 0);
    tl.to(tokenC.position, { y: 0.06, duration: 1.0, ease: 'power2.inOut' }, 0);
    tl.to(coreGroup.rotation, { z: -0.12, x: 0.05, duration: 1.0, ease: 'power2.inOut' }, 0);

    // === PHASE 2: TRANSACTION & VALUE TRANSFER (1.2s - 2.8s) ===
    // Luminous value token smoothly glides from Token B to Token A across table
    const posA = tokenA.position;
    const posB = tokenB.position;

    tl.call(() => {
      valueToken.visible = true;
    }, [], 1.2);

    tl.fromTo(
      valueToken.position,
      { x: posB.x, y: posB.y + 0.55, z: posB.z },
      { x: posA.x, y: posA.y + 0.55, z: posA.z, duration: 1.4, ease: 'power2.inOut' },
      1.2
    );

    // === PHASE 3: EQUILIBRIUM & SETTLEMENT RESOLUTION (2.4s - 3.8s) ===
    // As transfer completes, tokens level out to uniform height; central mechanism balances
    tl.to(tokenA.position, { y: 0.1, duration: 1.2, ease: 'back.out(1.4)' }, 2.4);
    tl.to(tokenB.position, { y: 0.1, duration: 1.2, ease: 'back.out(1.4)' }, 2.4);
    tl.to(tokenC.position, { y: 0.1, duration: 1.2, ease: 'back.out(1.4)' }, 2.4);

    tl.to(coreGroup.rotation, { z: 0, x: 0, duration: 1.2, ease: 'back.out(1.6)' }, 2.4);
    tl.to(innerGimbal.rotation, { z: Math.PI, duration: 1.4, ease: 'power2.inOut' }, 2.4);

    tl.call(() => {
      valueToken.visible = false;
    }, [], 3.8);

    // === PHASE 4: CALM EQUILIBRIUM BREATH (3.8s - 4.8s) ===
    tl.to(gemMesh.rotation, { y: '+=1.57', duration: 1.0, ease: 'power1.inOut' }, 3.8);

    onSceneReady?.();

    // -------------------------------------------------------------
    // 10. CONTINUOUS AMBIENT TICKER LOOP
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

      // Subtle levitation of settlement core
      if (coreGroup) {
        coreGroup.position.y = 0.68 + Math.sin(elapsed * 1.8) * 0.02;
        outerGimbal.rotation.y = elapsed * 0.2;
      }

      // Gentle floating of expense plates
      expensePlatesRef.current.forEach((plate, idx) => {
        plate.position.y = platesData[idx]!.pos.y + Math.sin(elapsed * 2.0 + idx * 1.4) * 0.02;
      });

      // Subtle Parallax Camera Responsiveness
      const targetCamX = mousePos.current.x * 0.22;
      const targetCamY = 3.2 + mousePos.current.y * 0.15;
      camera.position.x += (targetCamX - camera.position.x) * 0.04;
      camera.position.y += (targetCamY - camera.position.y) * 0.04;
      camera.lookAt(0, 0.35, 0);

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
          height: isDesktop ? 320 : isTablet ? 290 : 260,
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
