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
  const participantsRef = useRef<THREE.Group[]>([]);
  const centralStateRef = useRef<THREE.Group | null>(null);
  const valueStreamsRef = useRef<THREE.Mesh[]>([]);
  const settlementStreamsRef = useRef<THREE.Mesh[]>([]);
  const particlesPoolRef = useRef<THREE.Mesh[]>([]);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const mousePos = useRef<THREE.Vector2>(new THREE.Vector2(0, 0));
  const reqIdRef = useRef<number | null>(null);

  // Helper to create micro label badge texture (e.g. Ketan, Rohit, Raj)
  const createParticipantLabelTexture = (name: string, initial: string) => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 256, 128);

    // Pill background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.roundRect(16, 20, 224, 88, 44);
    ctx.fill();

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Initial avatar dot
    ctx.fillStyle = '#0284C7';
    ctx.beginPath();
    ctx.arc(64, 64, 26, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initial, 64, 66);

    // Name text
    ctx.fillStyle = '#0F172A';
    ctx.font = '600 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(name, 104, 66);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  };

  // Form interaction responsiveness
  useEffect(() => {
    if (!participantsRef.current.length || !centralStateRef.current) return;

    if (interactionState === 'email_focused') {
      participantsRef.current.forEach((p, idx) => {
        gsap.to(p.position, {
          y: idx === 0 ? 0.38 : 0.18,
          duration: 0.5,
          ease: 'power2.out',
        });
      });
      if (centralStateRef.current) {
        gsap.to(centralStateRef.current.rotation, {
          y: 0.4,
          duration: 0.5,
          ease: 'power2.out',
        });
      }
    } else if (interactionState === 'password_focused') {
      participantsRef.current.forEach((p) => {
        gsap.to(p.position, { y: 0.2, duration: 0.5, ease: 'power2.out' });
      });
      if (centralStateRef.current) {
        gsap.to(centralStateRef.current.rotation, {
          y: 0,
          duration: 0.5,
          ease: 'power2.out',
        });
      }
    } else if (interactionState === 'submitting') {
      // Direct convergence to complete clean settlement
      settlementStreamsRef.current.forEach((stream) => {
        gsap.to((stream.material as THREE.MeshPhysicalMaterial), {
          opacity: 0.95,
          emissiveIntensity: 1.2,
          duration: 0.3,
        });
      });
      if (centralStateRef.current) {
        gsap.to(centralStateRef.current.scale, {
          x: 1.15,
          y: 1.15,
          z: 1.15,
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
    const height = container.clientHeight || (isDesktop ? 290 : isTablet ? 260 : 230);

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera: Natural elevated 3/4 viewpoint (Looking at floating financial ecosystem)
    const camera = new THREE.PerspectiveCamera(28, width / height, 0.1, 100);
    camera.position.set(0, 2.6, 5.0);
    camera.lookAt(0, 0.25, 0);
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
    // 4. HIGH-END STUDIO LIGHTING (Bright, Soft Shadows, Clean Reflections)
    // -------------------------------------------------------------
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 2.8);
    scene.add(ambientLight);

    // Overhead Key Soft Spot Light
    const keySpot = new THREE.SpotLight(0xFFFFFF, 3.6);
    keySpot.position.set(2.0, 6.5, 4.0);
    keySpot.angle = Math.PI / 4.2;
    keySpot.penumbra = 0.85;
    keySpot.castShadow = true;
    keySpot.shadow.mapSize.width = 1024;
    keySpot.shadow.mapSize.height = 1024;
    keySpot.shadow.bias = -0.0001;
    scene.add(keySpot);

    // Soft Daylight Fill Light
    const fillLight = new THREE.DirectionalLight(0xF8FAFC, 1.6);
    fillLight.position.set(-3.5, 4.0, 2.0);
    scene.add(fillLight);

    // Subtle Satin Rim Highlight
    const rimLight = new THREE.DirectionalLight(0xE2E8F0, 1.2);
    rimLight.position.set(0, 2.5, -4.0);
    scene.add(rimLight);

    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // -------------------------------------------------------------
    // 5. LUXURY MATERIALS
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

    const satinMetalMat = new THREE.MeshPhysicalMaterial({
      color: 0xCBD5E1,
      roughness: 0.26,
      metalness: 0.85,
      clearcoat: 0.5,
    });

    const ceramicMat = new THREE.MeshPhysicalMaterial({
      color: 0xF8FAFC,
      roughness: 0.2,
      metalness: 0.05,
      clearcoat: 0.8,
    });

    // -------------------------------------------------------------
    // 6. THREE ABSTRACT PARTICIPANTS (Ketan, Rohit, Raj)
    // Floating naturally in open space (Zero podiums, Zero platforms)
    // -------------------------------------------------------------
    const participantsGroup = new THREE.Group();
    worldGroup.add(participantsGroup);
    participantsRef.current = [];

    const participantsData = [
      { name: 'Ketan', initial: 'K', x: 0, y: 0.72, z: -0.75, accent: 0x0284C7 },      // Top (Payer / Host)
      { name: 'Rohit', initial: 'R', x: -1.05, y: 0.12, z: 0.45, accent: 0x0D9488 },   // Bottom-Left
      { name: 'Raj', initial: 'R', x: 1.05, y: 0.12, z: 0.45, accent: 0x6366F1 },     // Bottom-Right
    ];

    const participantObjects: THREE.Group[] = [];

    participantsData.forEach((pd) => {
      const pGroup = new THREE.Group();
      pGroup.position.set(pd.x, pd.y, pd.z);

      // Elegant Dual-Form Abstract Silhouette:
      // Lower Sculptural Ceramic/Metal Torso + Floating Frosted Glass Head Sphere
      const lowerBaseGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.16, 32);
      const lowerBase = new THREE.Mesh(lowerBaseGeo, satinMetalMat);
      lowerBase.position.y = 0.08;
      lowerBase.castShadow = true;
      pGroup.add(lowerBase);

      const middleBodyGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.24, 32);
      const middleBody = new THREE.Mesh(middleBodyGeo, ceramicMat);
      middleBody.position.y = 0.26;
      middleBody.castShadow = true;
      pGroup.add(middleBody);

      // Accent Identification Collar
      const collarGeo = new THREE.TorusGeometry(0.145, 0.012, 16, 32);
      const collarMat = new THREE.MeshStandardMaterial({
        color: pd.accent,
        roughness: 0.2,
        metalness: 0.6,
      });
      const collar = new THREE.Mesh(collarGeo, collarMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.38;
      pGroup.add(collar);

      // Floating Polished Frosted Glass Head Sphere
      const headGeo = new THREE.SphereGeometry(0.15, 32, 24);
      const head = new THREE.Mesh(headGeo, frostedGlassMat);
      head.position.y = 0.54;
      head.castShadow = true;
      pGroup.add(head);

      // Tiny Elegant Participant Name Badge
      const badgeGeo = new THREE.PlaneGeometry(0.36, 0.18);
      const badgeTex = createParticipantLabelTexture(pd.name, pd.initial);
      const badgeMat = new THREE.MeshBasicMaterial({
        map: badgeTex,
        transparent: true,
        opacity: 0.95,
      });
      const badge = new THREE.Mesh(badgeGeo, badgeMat);
      badge.position.set(0, 0.82, 0.05);
      pGroup.add(badge);

      participantsGroup.add(pGroup);
      participantObjects.push(pGroup);
      participantsRef.current.push(pGroup);
    });

    // -------------------------------------------------------------
    // 7. CENTRAL SHARED FINANCIAL STATE OBJECT
    // Translucent geometric crystalline core suspended in the middle
    // -------------------------------------------------------------
    const centerGroup = new THREE.Group();
    centerGroup.position.set(0, 0.38, 0.05);
    worldGroup.add(centerGroup);
    centralStateRef.current = centerGroup;

    const coreGeo = new THREE.OctahedronGeometry(0.24, 1);
    const coreMesh = new THREE.Mesh(coreGeo, frostedGlassMat);
    coreMesh.castShadow = true;
    centerGroup.add(coreMesh);

    // Subtle Internal Luminous Nucleus (Reacts when money moves)
    const nucleusGeo = new THREE.SphereGeometry(0.08, 24, 24);
    const nucleusMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284C7,
      emissive: 0x0284C7,
      emissiveIntensity: 0.4,
      roughness: 0.15,
      metalness: 0.4,
      clearcoat: 1.0,
    });
    const nucleus = new THREE.Mesh(nucleusGeo, nucleusMat);
    centerGroup.add(nucleus);

    // -------------------------------------------------------------
    // 8. ELEGANT VALUE STREAMS (Expense Creation & Web of Obligations)
    // Smooth translucent curved bezier tubes representing money flow
    // -------------------------------------------------------------
    const streamsGroup = new THREE.Group();
    worldGroup.add(streamsGroup);
    valueStreamsRef.current = [];
    settlementStreamsRef.current = [];

    const createCurvedStream = (p1: THREE.Vector3, p2: THREE.Vector3, color: number = 0x0284C7, arcHeight: number = 0.25) => {
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      mid.y += arcHeight;
      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.016, 8, false);
      const tubeMat = new THREE.MeshPhysicalMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.2,
        roughness: 0.15,
        transmission: 0.6,
        transparent: true,
        opacity: 0,
      });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      streamsGroup.add(tubeMesh);
      return tubeMesh;
    };

    const posK = new THREE.Vector3(participantsData[0]!.x, participantsData[0]!.y + 0.35, participantsData[0]!.z);
    const posR1 = new THREE.Vector3(participantsData[1]!.x, participantsData[1]!.y + 0.35, participantsData[1]!.z);
    const posR2 = new THREE.Vector3(participantsData[2]!.x, participantsData[2]!.y + 0.35, participantsData[2]!.z);
    const posCore = new THREE.Vector3(0, 0.38, 0.05);

    // Initial Shared Expense Streams (Ketan pays -> Shared State -> Rohit / Raj)
    const streamKetanToCore = createCurvedStream(posK, posCore, 0x0284C7, 0.15);
    const streamCoreToRohit = createCurvedStream(posCore, posR1, 0x0D9488, 0.15);
    const streamCoreToRaj = createCurvedStream(posCore, posR2, 0x6366F1, 0.15);

    // Complexity Streams (Secondary transactions creating an intertwined web)
    const streamRajToRohit = createCurvedStream(posR2, posR1, 0x0EA5E9, 0.22);
    const streamRohitToKetan = createCurvedStream(posR1, posK, 0x0D9488, 0.25);

    valueStreamsRef.current = [streamKetanToCore, streamCoreToRohit, streamCoreToRaj, streamRajToRohit, streamRohitToKetan];

    // Simplified Final Settlement Streams (Settle Optimizer: Rohit -> Ketan & Raj -> Ketan)
    const settleStream1 = createCurvedStream(posR1, posK, 0x0284C7, 0.28);
    const settleStream2 = createCurvedStream(posR2, posK, 0x0284C7, 0.28);
    settlementStreamsRef.current = [settleStream1, settleStream2];

    // Floating Luminous Value Particles along flows
    const pGeo = new THREE.SphereGeometry(0.042, 16, 16);
    const pMat = new THREE.MeshStandardMaterial({
      color: 0x0284C7,
      emissive: 0x0284C7,
      emissiveIntensity: 2.2,
    });

    const particle1 = new THREE.Mesh(pGeo, pMat);
    const particle2 = new THREE.Mesh(pGeo, pMat);
    particle1.visible = false;
    particle2.visible = false;
    worldGroup.add(particle1, particle2);
    particlesPoolRef.current = [particle1, particle2];

    // -------------------------------------------------------------
    // 9. COMPLETE CHOREOGRAPHED NARRATIVE LOOP (GSAP)
    // Story: Group -> Shared Expense -> Web of Complexity -> Settle Optimization -> Calm Settlement -> Seamless Loop
    // -------------------------------------------------------------
    const pKetan = participantObjects[0]!;
    const pRohit = participantObjects[1]!;
    const pRaj = participantObjects[2]!;

    const tl = gsap.timeline({ repeat: -1 });
    timelineRef.current = tl;

    // === PHASE 1: GROUP (0s - 1.5s) — Calm floating equilibrium ===
    tl.to(pKetan.position, { y: 0.72, duration: 1.0, ease: 'power2.inOut' }, 0);
    tl.to(pRohit.position, { y: 0.12, duration: 1.0, ease: 'power2.inOut' }, 0);
    tl.to(pRaj.position, { y: 0.12, duration: 1.0, ease: 'power2.inOut' }, 0);

    // === PHASE 2: SHARED EXPENSE (1.5s - 4.0s) — Ketan pays, value distributes ===
    tl.call(() => {
      particle1.visible = true;
    }, [], 1.5);

    // Particle flows Ketan -> Core
    tl.fromTo(
      particle1.position,
      { x: posK.x, y: posK.y, z: posK.z },
      { x: posCore.x, y: posCore.y, z: posCore.z, duration: 1.2, ease: 'power2.inOut' },
      1.5
    );

    // Streams light up
    tl.to((streamKetanToCore.material as THREE.MeshPhysicalMaterial), { opacity: 0.85, emissiveIntensity: 0.8, duration: 0.6 }, 1.8);
    tl.to(nucleusMat, { emissiveIntensity: 1.2, duration: 0.4 }, 2.5);
    tl.to((streamCoreToRohit.material as THREE.MeshPhysicalMaterial), { opacity: 0.85, emissiveIntensity: 0.6, duration: 0.6 }, 2.7);
    tl.to((streamCoreToRaj.material as THREE.MeshPhysicalMaterial), { opacity: 0.85, emissiveIntensity: 0.6, duration: 0.6 }, 2.7);

    // Particle splits toward Rohit & Raj
    tl.fromTo(
      particle1.position,
      { x: posCore.x, y: posCore.y, z: posCore.z },
      { x: posR1.x, y: posR1.y, z: posR1.z, duration: 1.1, ease: 'power2.out' },
      2.7
    );

    // === PHASE 3: COMPLEXITY (4.0s - 6.5s) — More transactions occur, web forms ===
    tl.to((streamRajToRohit.material as THREE.MeshPhysicalMaterial), { opacity: 0.75, emissiveIntensity: 0.5, duration: 0.8 }, 4.0);
    tl.to((streamRohitToKetan.material as THREE.MeshPhysicalMaterial), { opacity: 0.75, emissiveIntensity: 0.5, duration: 0.8 }, 4.4);

    // Participants and core slightly displace to reflect pending obligations
    tl.to(pKetan.position, { y: 0.82, duration: 1.0, ease: 'power2.inOut' }, 4.5);
    tl.to(pRohit.position, { y: 0.04, duration: 1.0, ease: 'power2.inOut' }, 4.5);
    tl.to(pRaj.position, { y: 0.06, duration: 1.0, ease: 'power2.inOut' }, 4.5);
    tl.to(centerGroup.rotation, { y: 0.35, duration: 1.0, ease: 'power2.inOut' }, 4.5);

    // === PHASE 4: THE SETTLEMENT MOMENT (6.5s - 9.0s) — Complexity collapses into simple payment flows ===
    // Retract complex overlapping web
    tl.to(
      valueStreamsRef.current.map((s) => s.material as THREE.MeshPhysicalMaterial),
      { opacity: 0, emissiveIntensity: 0, duration: 0.8, ease: 'power2.inOut' },
      6.5
    );

    // Settle Optimizer: Activate two direct, clean payment streams (Rohit -> Ketan, Raj -> Ketan)
    tl.to(
      settlementStreamsRef.current.map((s) => s.material as THREE.MeshPhysicalMaterial),
      { opacity: 0.95, emissiveIntensity: 1.0, duration: 0.8, ease: 'power2.out' },
      7.2
    );

    // Luminous value glides cleanly from Rohit & Raj directly into Ketan
    tl.call(() => {
      particle1.visible = true;
      particle2.visible = true;
    }, [], 7.3);

    tl.fromTo(
      particle1.position,
      { x: posR1.x, y: posR1.y, z: posR1.z },
      { x: posK.x, y: posK.y, z: posK.z, duration: 1.4, ease: 'power2.inOut' },
      7.3
    );
    tl.fromTo(
      particle2.position,
      { x: posR2.x, y: posR2.y, z: posR2.z },
      { x: posK.x, y: posK.y, z: posK.z, duration: 1.4, ease: 'power2.inOut' },
      7.3
    );

    // === PHASE 5: FINAL CALM SETTLED STATE (9.0s - 12.0s) — Equilibrium exhale ===
    // All participants smoothly settle into balanced elevation
    tl.to(pKetan.position, { y: 0.72, duration: 1.2, ease: 'back.out(1.5)' }, 8.8);
    tl.to(pRohit.position, { y: 0.12, duration: 1.2, ease: 'back.out(1.5)' }, 8.8);
    tl.to(pRaj.position, { y: 0.12, duration: 1.2, ease: 'back.out(1.5)' }, 8.8);

    tl.to(centerGroup.rotation, { y: 0, duration: 1.2, ease: 'back.out(1.4)' }, 8.8);
    tl.to(nucleusMat, { emissiveIntensity: 0.4, duration: 1.0 }, 9.2);

    tl.call(() => {
      particle1.visible = false;
      particle2.visible = false;
    }, [], 9.2);

    // Gentle fade of settlement streams leaving serene floating group
    tl.to(
      settlementStreamsRef.current.map((s) => s.material as THREE.MeshPhysicalMaterial),
      { opacity: 0, emissiveIntensity: 0, duration: 1.2, ease: 'power2.inOut' },
      10.2
    );

    onSceneReady?.();

    // -------------------------------------------------------------
    // 10. CONTINUOUS SUBTLE AMBIENT TICKER LOOP
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

      // Subtle organic levitation of central crystal
      if (centerGroup) {
        centerGroup.position.y = 0.38 + Math.sin(elapsed * 1.6) * 0.018;
        coreMesh.rotation.y = elapsed * 0.2;
      }

      // Parallax mouse responsiveness
      const targetCamX = mousePos.current.x * 0.18;
      const targetCamY = 2.6 + mousePos.current.y * 0.12;
      camera.position.x += (targetCamX - camera.position.x) * 0.035;
      camera.position.y += (targetCamY - camera.position.y) * 0.035;
      camera.lookAt(0, 0.25, 0);

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
          height: isDesktop ? 290 : isTablet ? 260 : 230,
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
