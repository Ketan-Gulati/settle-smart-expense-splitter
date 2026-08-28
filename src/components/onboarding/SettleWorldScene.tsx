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
  const expenseCardsRef = useRef<THREE.Group[]>([]);
  const centralSettleCoreRef = useRef<THREE.Group | null>(null);
  const complexityLinesRef = useRef<THREE.Mesh[]>([]);
  const simplifiedStreamsRef = useRef<THREE.Mesh[]>([]);
  const activeParticlesRef = useRef<THREE.Mesh[]>([]);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const mousePos = useRef<THREE.Vector2>(new THREE.Vector2(0, 0));
  const reqIdRef = useRef<number | null>(null);

  // High-Resolution Crisp Canvas Texture Generator for 3D Expense Cards
  const createExpenseCardTexture = (category: string, amount: string, payer: string, color: string) => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Card background: Crisp off-white card with soft rounded border
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(8, 8, 368, 176, 24);
    ctx.fill();

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Top Category Color Accent Bar
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(10, 10, 364, 16, [20, 20, 0, 0]);
    ctx.fill();

    // Category Label
    ctx.fillStyle = '#64748B';
    ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(category.toUpperCase(), 28, 64);

    // Expense Amount (Global Currency Symbol)
    ctx.fillStyle = '#0F172A';
    ctx.font = '800 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(amount, 28, 122);

    // Paid by badge
    ctx.fillStyle = '#F1F5F9';
    ctx.beginPath();
    ctx.roundRect(28, 138, 160, 34, 12);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Paid by ${payer}`, 40, 161);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  };

  // Name pill label texture for participants
  const createPersonLabelTexture = (name: string, color: string) => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
    ctx.beginPath();
    ctx.roundRect(10, 12, 236, 72, 36);
    ctx.fill();

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Color indicator dot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(52, 48, 18, 0, Math.PI * 2);
    ctx.fill();

    // Name
    ctx.fillStyle = '#0F172A';
    ctx.font = '700 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(name, 84, 58);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  };

  // Form interaction effects
  useEffect(() => {
    if (!participantsRef.current.length) return;

    if (interactionState === 'email_focused') {
      participantsRef.current.forEach((p, idx) => {
        gsap.to(p.position, {
          y: idx === 0 ? 0.35 : 0.15,
          duration: 0.5,
          ease: 'power2.out',
        });
      });
    } else if (interactionState === 'password_focused') {
      participantsRef.current.forEach((p) => {
        gsap.to(p.position, { y: 0.2, duration: 0.5, ease: 'power2.out' });
      });
    } else if (interactionState === 'submitting') {
      if (centralSettleCoreRef.current) {
        gsap.to(centralSettleCoreRef.current.scale, {
          x: 1.25,
          y: 1.25,
          z: 1.25,
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
    const height = container.clientHeight || (isDesktop ? 310 : isTablet ? 280 : 250);

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera: Elevated 3/4 Perspective looking at shared group world
    const camera = new THREE.PerspectiveCamera(28, width / height, 0.1, 100);
    camera.position.set(0, 3.2, 5.4);
    camera.lookAt(0, 0.2, 0);
    cameraRef.current = camera;

    // 3. WebGL Renderer with High-Precision ACES Filmic Tone Mapping
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
    // 4. BRIGHT STUDIO LIGHTING (Daylight Soft Key & Rim)
    // -------------------------------------------------------------
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 2.8);
    scene.add(ambientLight);

    const keySpot = new THREE.SpotLight(0xFFFFFF, 3.6);
    keySpot.position.set(2.5, 7.0, 4.0);
    keySpot.angle = Math.PI / 4.2;
    keySpot.penumbra = 0.85;
    keySpot.castShadow = true;
    keySpot.shadow.mapSize.width = 1024;
    keySpot.shadow.mapSize.height = 1024;
    keySpot.shadow.bias = -0.0001;
    scene.add(keySpot);

    const fillLight = new THREE.DirectionalLight(0xF8FAFC, 1.6);
    fillLight.position.set(-3.5, 4.0, 2.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xE2E8F0, 1.2);
    rimLight.position.set(0, 2.5, -4.0);
    scene.add(rimLight);

    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // -------------------------------------------------------------
    // 5. PREMIUM MATERIALS (Ceramic, Frosted Glass, Satin Metal)
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
      roughness: 0.28,
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
    // 6. THREE STYLIZED HUMAN PARTICIPANTS (Ketan, Rohit, Raj)
    // Tasteful, recognizable human silhouettes (Head + Neck + Torso + Arms)
    // -------------------------------------------------------------
    const participantsGroup = new THREE.Group();
    worldGroup.add(participantsGroup);
    participantsRef.current = [];

    const participantsData = [
      { name: 'Ketan', x: 0, y: 0.45, z: -0.85, color: '#0284C7', hex: 0x0284C7 },       // Top Center (Host / Payer)
      { name: 'Rohit', x: -1.25, y: -0.05, z: 0.45, color: '#0D9488', hex: 0x0D9488 },   // Bottom Left
      { name: 'Raj', x: 1.25, y: -0.05, z: 0.45, color: '#6366F1', hex: 0x6366F1 },     // Bottom Right
    ];

    const participantObjects: THREE.Group[] = [];

    participantsData.forEach((pd) => {
      const pGroup = new THREE.Group();
      pGroup.position.set(pd.x, pd.y, pd.z);

      // Person Model Sub-group
      const modelGroup = new THREE.Group();
      pGroup.add(modelGroup);

      // 1. Torso: Tapered rounded jacket body
      const torsoGeo = new THREE.CylinderGeometry(0.18, 0.24, 0.38, 32);
      const torso = new THREE.Mesh(torsoGeo, ceramicMat);
      torso.position.y = 0.24;
      torso.castShadow = true;
      modelGroup.add(torso);

      // 2. Distinct Accent Collar
      const collarGeo = new THREE.TorusGeometry(0.165, 0.016, 16, 32);
      const collarMat = new THREE.MeshStandardMaterial({
        color: pd.hex,
        roughness: 0.2,
        metalness: 0.5,
      });
      const collar = new THREE.Mesh(collarGeo, collarMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.42;
      modelGroup.add(collar);

      // 3. Stylized Neck
      const neckGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.1, 16);
      const neck = new THREE.Mesh(neckGeo, satinMetalMat);
      neck.position.y = 0.46;
      modelGroup.add(neck);

      // 4. Head: Smooth Frosted Glass Sphere
      const headGeo = new THREE.SphereGeometry(0.15, 32, 24);
      const head = new THREE.Mesh(headGeo, frostedGlassMat);
      head.position.y = 0.60;
      head.castShadow = true;
      modelGroup.add(head);

      // 5. Stylized Shoulders / Side Arms (Recognizable Human Profile)
      const armGeo = new THREE.CapsuleGeometry(0.055, 0.22, 16, 16);
      const leftArm = new THREE.Mesh(armGeo, ceramicMat);
      leftArm.position.set(-0.21, 0.22, 0);
      leftArm.rotation.z = 0.18;
      modelGroup.add(leftArm);

      const rightArm = new THREE.Mesh(armGeo, ceramicMat);
      rightArm.position.set(0.21, 0.22, 0);
      rightArm.rotation.z = -0.18;
      modelGroup.add(rightArm);

      // 6. Name Label Badge above head
      const badgeGeo = new THREE.PlaneGeometry(0.42, 0.16);
      const badgeTex = createPersonLabelTexture(pd.name, pd.color);
      const badgeMat = new THREE.MeshBasicMaterial({
        map: badgeTex,
        transparent: true,
        opacity: 0.95,
      });
      const badge = new THREE.Mesh(badgeGeo, badgeMat);
      badge.position.set(0, 0.92, 0.08);
      pGroup.add(badge);

      participantsGroup.add(pGroup);
      participantObjects.push(pGroup);
      participantsRef.current.push(pGroup);
    });

    // -------------------------------------------------------------
    // 7. CENTRAL MINIMAL SETTLE CORE
    // Suspended optical frosted crystal that reacts during settlement
    // -------------------------------------------------------------
    const settleCoreGroup = new THREE.Group();
    settleCoreGroup.position.set(0, 0.22, 0.0);
    worldGroup.add(settleCoreGroup);
    centralSettleCoreRef.current = settleCoreGroup;

    const coreGeo = new THREE.OctahedronGeometry(0.22, 1);
    const coreMesh = new THREE.Mesh(coreGeo, frostedGlassMat);
    coreMesh.castShadow = true;
    settleCoreGroup.add(coreMesh);

    const nucleusGeo = new THREE.SphereGeometry(0.075, 24, 24);
    const nucleusMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284C7,
      emissive: 0x0284C7,
      emissiveIntensity: 0.4,
      roughness: 0.15,
      metalness: 0.4,
    });
    const nucleus = new THREE.Mesh(nucleusGeo, nucleusMat);
    settleCoreGroup.add(nucleus);

    // -------------------------------------------------------------
    // 8. THREE 3D EXPENSE CARDS (DINNER $48, TAXI $18, VILLA $72)
    // Physical miniature cards with textures
    // -------------------------------------------------------------
    const expenseCardsGroup = new THREE.Group();
    worldGroup.add(expenseCardsGroup);
    expenseCardsRef.current = [];

    const cardsData = [
      { category: 'Dinner', amount: '$48', payer: 'Ketan', color: '#0284C7', hex: 0x0284C7, pos: new THREE.Vector3(-0.48, 0.72, -0.35) },
      { category: 'Taxi', amount: '$18', payer: 'Rohit', color: '#0D9488', hex: 0x0D9488, pos: new THREE.Vector3(-1.15, 0.45, 0.1) },
      { category: 'Villa', amount: '$72', payer: 'Raj', color: '#6366F1', hex: 0x6366F1, pos: new THREE.Vector3(1.15, 0.45, 0.1) },
    ];

    const cardMeshes: THREE.Group[] = [];

    cardsData.forEach((cd) => {
      const cardGroup = new THREE.Group();
      cardGroup.position.copy(cd.pos);
      cardGroup.scale.set(0.001, 0.001, 0.001); // starts collapsed

      const cardGeo = new THREE.BoxGeometry(0.62, 0.32, 0.035);
      const cardTex = createExpenseCardTexture(cd.category, cd.amount, cd.payer, cd.color);

      const materials = [
        new THREE.MeshPhysicalMaterial({ color: 0xFFFFFF, roughness: 0.2 }),
        new THREE.MeshPhysicalMaterial({ color: 0xFFFFFF, roughness: 0.2 }),
        new THREE.MeshPhysicalMaterial({ color: 0xFFFFFF, roughness: 0.2 }),
        new THREE.MeshPhysicalMaterial({ color: 0xFFFFFF, roughness: 0.2 }),
        new THREE.MeshPhysicalMaterial({
          map: cardTex,
          roughness: 0.15,
          clearcoat: 0.9,
        }),
        new THREE.MeshPhysicalMaterial({ color: 0xFFFFFF, roughness: 0.2 }),
      ];

      const mesh = new THREE.Mesh(cardGeo, materials);
      mesh.castShadow = true;
      cardGroup.add(mesh);

      cardGroup.lookAt(0, 1.8, 5.0);
      expenseCardsGroup.add(cardGroup);
      cardMeshes.push(cardGroup);
      expenseCardsRef.current.push(cardGroup);
    });

    // -------------------------------------------------------------
    // 9. FLOW STREAMS (Complexity Web vs Simplified Settle Flows)
    // -------------------------------------------------------------
    const streamsGroup = new THREE.Group();
    worldGroup.add(streamsGroup);
    complexityLinesRef.current = [];
    simplifiedStreamsRef.current = [];

    const createCurvedStream = (p1: THREE.Vector3, p2: THREE.Vector3, color: number = 0x0284C7, arcHeight: number = 0.22) => {
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      mid.y += arcHeight;
      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.016, 8, false);
      const tubeMat = new THREE.MeshPhysicalMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.2,
        roughness: 0.15,
        transmission: 0.7,
        transparent: true,
        opacity: 0,
      });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      streamsGroup.add(tubeMesh);
      return tubeMesh;
    };

    const posKetan = new THREE.Vector3(participantsData[0]!.x, participantsData[0]!.y + 0.35, participantsData[0]!.z);
    const posRohit = new THREE.Vector3(participantsData[1]!.x, participantsData[1]!.y + 0.35, participantsData[1]!.z);
    const posRaj = new THREE.Vector3(participantsData[2]!.x, participantsData[2]!.y + 0.35, participantsData[2]!.z);

    // Complexity Web Streams (Individual shared transactions)
    const stream1 = createCurvedStream(posKetan, posRohit, 0x0284C7, 0.18);
    const stream2 = createCurvedStream(posKetan, posRaj, 0x0284C7, 0.18);
    const stream3 = createCurvedStream(posRohit, posRaj, 0x0D9488, 0.22);
    const stream4 = createCurvedStream(posRaj, posKetan, 0x6366F1, 0.24);
    complexityLinesRef.current = [stream1, stream2, stream3, stream4];

    // Simplified Settlement Streams (Settle Optimizer: Rohit -> Ketan, Raj -> Ketan)
    const settleStreamRohit = createCurvedStream(posRohit, posKetan, 0x0284C7, 0.28);
    const settleStreamRaj = createCurvedStream(posRaj, posKetan, 0x0284C7, 0.28);
    simplifiedStreamsRef.current = [settleStreamRohit, settleStreamRaj];

    // Luminous Value Particles
    const pGeo = new THREE.SphereGeometry(0.045, 16, 16);
    const pMat = new THREE.MeshStandardMaterial({
      color: 0x0284C7,
      emissive: 0x0284C7,
      emissiveIntensity: 2.4,
    });
    const particle1 = new THREE.Mesh(pGeo, pMat);
    const particle2 = new THREE.Mesh(pGeo, pMat);
    particle1.visible = false;
    particle2.visible = false;
    worldGroup.add(particle1, particle2);
    activeParticlesRef.current = [particle1, particle2];

    // -------------------------------------------------------------
    // 10. CHOREOGRAPHED NARRATIVE STORY LOOP (GSAP)
    // Story: People -> Expense Appears -> More Expenses -> Complexity Web -> Settle Moment -> Calm Balance
    // -------------------------------------------------------------
    const pK = participantObjects[0]!;
    const pRo = participantObjects[1]!;
    const pRa = participantObjects[2]!;

    const cDinner = cardMeshes[0]!;
    const cTaxi = cardMeshes[1]!;
    const cVilla = cardMeshes[2]!;

    const tl = gsap.timeline({ repeat: -1 });
    timelineRef.current = tl;

    // === SCENE 1 — PEOPLE (0s - 1.5s): Friends gently floating in shared space ===
    tl.to(pK.position, { y: 0.45, duration: 1.0, ease: 'power2.inOut' }, 0);
    tl.to(pRo.position, { y: -0.05, duration: 1.0, ease: 'power2.inOut' }, 0);
    tl.to(pRa.position, { y: -0.05, duration: 1.0, ease: 'power2.inOut' }, 0);

    // === SCENE 2 — AN EXPENSE HAPPENS (1.5s - 3.5s): Dinner $48 appears near Ketan ===
    tl.to(cDinner.scale, { x: 1, y: 1, z: 1, duration: 0.7, ease: 'back.out(1.8)' }, 1.5);
    tl.to((stream1.material as THREE.MeshPhysicalMaterial), { opacity: 0.85, emissiveIntensity: 0.7, duration: 0.6 }, 2.0);
    tl.to((stream2.material as THREE.MeshPhysicalMaterial), { opacity: 0.85, emissiveIntensity: 0.7, duration: 0.6 }, 2.0);

    // === SCENE 3 — MORE EXPENSES (3.5s - 5.5s): Taxi $18 & Villa $72 appear ===
    tl.to(cTaxi.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: 'back.out(1.8)' }, 3.5);
    tl.to(cVilla.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: 'back.out(1.8)' }, 3.8);

    tl.to((stream3.material as THREE.MeshPhysicalMaterial), { opacity: 0.8, emissiveIntensity: 0.6, duration: 0.6 }, 4.2);
    tl.to((stream4.material as THREE.MeshPhysicalMaterial), { opacity: 0.8, emissiveIntensity: 0.6, duration: 0.6 }, 4.5);

    // === SCENE 4 — THE PROBLEM / COMPLEXITY (5.5s - 7.5s): Web of obligations builds ===
    tl.to(pK.position, { y: 0.55, duration: 1.0, ease: 'power2.inOut' }, 5.5);
    tl.to(pRo.position, { y: -0.15, duration: 1.0, ease: 'power2.inOut' }, 5.5);
    tl.to(pRa.position, { y: -0.12, duration: 1.0, ease: 'power2.inOut' }, 5.5);
    tl.to(settleCoreGroup.rotation, { y: 0.4, duration: 1.0, ease: 'power2.inOut' }, 5.5);

    // === SCENE 5 — SETTLE (7.5s - 10.0s): Settle simplifies obligations into clean payments ===
    // Collapse complex lines
    tl.to(
      complexityLinesRef.current.map((l) => l.material as THREE.MeshPhysicalMaterial),
      { opacity: 0, emissiveIntensity: 0, duration: 0.7, ease: 'power2.inOut' },
      7.5
    );

    // Consolidate expense cards neatly inward
    tl.to(cDinner.position, { x: -0.28, y: 0.65, z: -0.2, duration: 0.9, ease: 'power2.inOut' }, 7.5);
    tl.to(cTaxi.position, { x: -0.75, y: 0.38, z: 0.05, duration: 0.9, ease: 'power2.inOut' }, 7.5);
    tl.to(cVilla.position, { x: 0.75, y: 0.38, z: 0.05, duration: 0.9, ease: 'power2.inOut' }, 7.5);

    // Activate Simplified Settlement Payment Streams (Rohit -> Ketan, Raj -> Ketan)
    tl.to(
      simplifiedStreamsRef.current.map((s) => s.material as THREE.MeshPhysicalMaterial),
      { opacity: 0.95, emissiveIntensity: 1.2, duration: 0.7, ease: 'power2.out' },
      8.2
    );

    // Luminous value particles travel smoothly from Rohit & Raj to Ketan
    tl.call(() => {
      particle1.visible = true;
      particle2.visible = true;
    }, [], 8.3);

    tl.fromTo(
      particle1.position,
      { x: posRohit.x, y: posRohit.y, z: posRohit.z },
      { x: posKetan.x, y: posKetan.y, z: posKetan.z, duration: 1.4, ease: 'power2.inOut' },
      8.3
    );
    tl.fromTo(
      particle2.position,
      { x: posRaj.x, y: posRaj.y, z: posRaj.z },
      { x: posKetan.x, y: posKetan.y, z: posKetan.z, duration: 1.4, ease: 'power2.inOut' },
      8.3
    );

    // === SCENE 6 — CLARITY & BALANCE (10.0s - 13.0s): Settled exhale & calm loop reset ===
    tl.to(pK.position, { y: 0.45, duration: 1.2, ease: 'back.out(1.5)' }, 9.8);
    tl.to(pRo.position, { y: -0.05, duration: 1.2, ease: 'back.out(1.5)' }, 9.8);
    tl.to(pRa.position, { y: -0.05, duration: 1.2, ease: 'back.out(1.5)' }, 9.8);

    tl.to(settleCoreGroup.rotation, { y: 0, duration: 1.2, ease: 'back.out(1.4)' }, 9.8);
    tl.to(nucleusMat, { emissiveIntensity: 0.4, duration: 0.8 }, 10.0);

    tl.call(() => {
      particle1.visible = false;
      particle2.visible = false;
    }, [], 10.2);

    // Soft fade of cards and settlement lines for seamless continuous loop
    tl.to(
      simplifiedStreamsRef.current.map((s) => s.material as THREE.MeshPhysicalMaterial),
      { opacity: 0, emissiveIntensity: 0, duration: 1.2, ease: 'power2.inOut' },
      11.2
    );
    tl.to(
      cardMeshes.map((c) => c.scale),
      { x: 0.001, y: 0.001, z: 0.001, duration: 1.0, ease: 'power2.inOut' },
      11.4
    );

    // Reset card initial positions
    tl.to(cDinner.position, { x: cardsData[0]!.pos.x, y: cardsData[0]!.pos.y, z: cardsData[0]!.pos.z, duration: 0.1 }, 12.8);
    tl.to(cTaxi.position, { x: cardsData[1]!.pos.x, y: cardsData[1]!.pos.y, z: cardsData[1]!.pos.z, duration: 0.1 }, 12.8);
    tl.to(cVilla.position, { x: cardsData[2]!.pos.x, y: cardsData[2]!.pos.y, z: cardsData[2]!.pos.z, duration: 0.1 }, 12.8);

    onSceneReady?.();

    // -------------------------------------------------------------
    // 11. CONTINUOUS AMBIENT TICKER LOOP
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

      // Subtle organic breathing of central crystal
      if (settleCoreGroup) {
        settleCoreGroup.position.y = 0.22 + Math.sin(elapsed * 1.5) * 0.015;
        coreMesh.rotation.y = elapsed * 0.18;
      }

      // Parallax mouse responsiveness
      const targetCamX = mousePos.current.x * 0.18;
      const targetCamY = 3.2 + mousePos.current.y * 0.12;
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
          height: isDesktop ? 310 : isTablet ? 280 : 250,
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
