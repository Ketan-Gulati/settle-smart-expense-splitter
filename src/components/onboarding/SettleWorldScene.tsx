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
  const charactersRef = useRef<THREE.Group[]>([]);
  const centralCoreRef = useRef<THREE.Group | null>(null);
  const floatingBadgesRef = useRef<THREE.Group[]>([]);
  const neonRingsRef = useRef<THREE.Mesh[]>([]);
  const mousePos = useRef<THREE.Vector2>(new THREE.Vector2(0, 0));
  const reqIdRef = useRef<number | null>(null);

  // Helper to create glossy canvas texture with crisp icon/symbol
  const createIconTexture = (type: 'rupee' | 'group' | 'pie') => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Dark sleek background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (type === 'rupee') {
      ctx.font = 'bold 130px -apple-system, sans-serif';
      ctx.fillText('₹', 128, 134);
    } else if (type === 'group') {
      // 3 Stylized People Heads & Bodies
      // Center Person
      ctx.beginPath();
      ctx.arc(128, 95, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(128, 200, 56, Math.PI, 0);
      ctx.fill();

      // Left Person
      ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
      ctx.beginPath();
      ctx.arc(70, 115, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(70, 205, 42, Math.PI, 0);
      ctx.fill();

      // Right Person
      ctx.beginPath();
      ctx.arc(186, 115, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(186, 205, 42, Math.PI, 0);
      ctx.fill();
    } else if (type === 'pie') {
      // Modern Donut/Pie chart
      ctx.beginPath();
      ctx.arc(128, 128, 70, -Math.PI / 2, Math.PI * 0.9);
      ctx.stroke();

      ctx.strokeStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(128, 128, 70, Math.PI * 0.9, -Math.PI / 2);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  };

  // Interaction reactions
  useEffect(() => {
    if (!charactersRef.current.length || !centralCoreRef.current) return;

    if (interactionState === 'email_focused') {
      charactersRef.current.forEach((char, idx) => {
        gsap.to(char.position, {
          y: 0.12,
          duration: 0.4,
          ease: 'back.out(1.6)',
        });
        gsap.to(char.rotation, {
          y: idx === 0 ? 0.3 : idx === 1 ? 0 : -0.3,
          duration: 0.5,
        });
      });
    } else if (interactionState === 'password_focused') {
      charactersRef.current.forEach((char) => {
        gsap.to(char.position, { y: 0, duration: 0.4 });
      });
    } else if (interactionState === 'google_hover' || interactionState === 'otp_hover') {
      floatingBadgesRef.current.forEach((badge) => {
        gsap.to(badge.position, {
          y: '+=0.15',
          duration: 0.3,
          yoyo: true,
          repeat: 1,
          ease: 'power2.out',
        });
      });
    } else if (interactionState === 'submitting') {
      gsap.to(centralCoreRef.current.rotation, {
        y: '+=3.14',
        duration: 0.6,
        ease: 'power2.inOut',
      });
    } else if (interactionState === 'success') {
      neonRingsRef.current.forEach((ring) => {
        gsap.to((ring.material as THREE.MeshStandardMaterial), {
          emissiveIntensity: 3.0,
          duration: 0.4,
          yoyo: true,
          repeat: 1,
        });
      });
    }
  }, [interactionState]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || (isDesktop ? 540 : isTablet ? 480 : windowWidth);
    const height = container.clientHeight || (isDesktop ? 480 : isTablet ? 380 : 320);

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera: Cinematic dramatic front-isometric elevation
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 3.4, 6.2);
    camera.lookAt(0, 0.7, 0);
    cameraRef.current = camera;

    // 3. Renderer with ACES ToneMapping for rich glowing neon aesthetics
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Dramatic Studio Lighting (Cyan, Emerald, Purple Rim & Top Spot)
    const ambientLight = new THREE.AmbientLight(0x0a0f1d, 3.0);
    scene.add(ambientLight);

    const topSpot = new THREE.SpotLight(0xffffff, 5.0);
    topSpot.position.set(0, 7.5, 3.5);
    topSpot.angle = Math.PI / 4;
    topSpot.penumbra = 0.6;
    topSpot.castShadow = true;
    scene.add(topSpot);

    // Cyan Neon Accent Light
    const cyanNeonLight = new THREE.PointLight(0x00e5ff, 4.0, 10);
    cyanNeonLight.position.set(0, 0.9, 0);
    scene.add(cyanNeonLight);

    // Emerald Glow Light
    const emeraldRim = new THREE.PointLight(0x10b981, 3.5, 8);
    emeraldRim.position.set(0, 1.8, -1.5);
    scene.add(emeraldRim);

    // Purple Side Light
    const purpleRim = new THREE.PointLight(0xa855f7, 3.0, 8);
    purpleRim.position.set(2.8, 1.5, 1.2);
    scene.add(purpleRim);

    // Blue Side Light
    const blueRim = new THREE.PointLight(0x0084ff, 3.0, 8);
    blueRim.position.set(-2.8, 1.5, 1.2);
    scene.add(blueRim);

    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // -------------------------------------------------------------
    // 5. STEPPED GLOSSY BLACK PODIUM BASE
    // -------------------------------------------------------------
    const podiumGroup = new THREE.Group();
    worldGroup.add(podiumGroup);

    // Lower Tier Plinth
    const baseGeo = new THREE.CylinderGeometry(2.0, 2.1, 0.22, 64);
    const darkMat = new THREE.MeshPhysicalMaterial({
      color: 0x080b12,
      roughness: 0.25,
      metalness: 0.15,
      clearcoat: 0.6,
    });
    const baseMesh = new THREE.Mesh(baseGeo, darkMat);
    baseMesh.position.y = 0.11;
    baseMesh.receiveShadow = true;
    podiumGroup.add(baseMesh);

    // Lower Base Electric Blue Glow Ring
    const baseRingGeo = new THREE.TorusGeometry(2.02, 0.022, 16, 64);
    const baseRingMat = new THREE.MeshStandardMaterial({
      color: 0x0084ff,
      emissive: 0x0084ff,
      emissiveIntensity: 2.2,
      roughness: 0.1,
    });
    const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = 0.08;
    podiumGroup.add(baseRing);

    // Upper Tier Cylinder Platform
    const topTierGeo = new THREE.CylinderGeometry(1.68, 1.74, 0.38, 64);
    const topTierMat = new THREE.MeshPhysicalMaterial({
      color: 0x0c101c,
      roughness: 0.2,
      metalness: 0.2,
      clearcoat: 0.8,
    });
    const topTierMesh = new THREE.Mesh(topTierGeo, topTierMat);
    topTierMesh.position.y = 0.38;
    topTierMesh.receiveShadow = true;
    podiumGroup.add(topTierMesh);

    // Primary Vibrant Cyan Neon Track Ring
    const neonRingGeo = new THREE.TorusGeometry(1.36, 0.038, 20, 80);
    const neonRingMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 2.8,
      roughness: 0.1,
    });
    const neonRing = new THREE.Mesh(neonRingGeo, neonRingMat);
    neonRing.rotation.x = Math.PI / 2;
    neonRing.position.y = 0.58;
    podiumGroup.add(neonRing);
    neonRingsRef.current = [neonRing, baseRing];

    // -------------------------------------------------------------
    // 6. CENTRAL LEVITATING SPLIT ORB & EMBLEM
    // Top Emerald Dome, Middle Cyan Slab, Bottom Emerald Dome
    // -------------------------------------------------------------
    const coreGroup = new THREE.Group();
    coreGroup.position.set(0, 1.1, 0);
    worldGroup.add(coreGroup);
    centralCoreRef.current = coreGroup;

    const orbEmeraldMat = new THREE.MeshPhysicalMaterial({
      color: 0x00e699,
      emissive: 0x00b377,
      emissiveIntensity: 0.8,
      roughness: 0.15,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    });

    // Top Dome (Half Sphere)
    const topDomeGeo = new THREE.SphereGeometry(0.38, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    const topDome = new THREE.Mesh(topDomeGeo, orbEmeraldMat);
    topDome.position.y = 0.14;
    topDome.castShadow = true;
    coreGroup.add(topDome);

    // Center Settle Divider Bar (Horizontal Bright Cyan Slab)
    const slabGeo = new THREE.BoxGeometry(0.64, 0.11, 0.28);
    const slabMat = new THREE.MeshPhysicalMaterial({
      color: 0x0084ff,
      emissive: 0x0070e0,
      emissiveIntensity: 0.9,
      roughness: 0.15,
      metalness: 0.2,
      clearcoat: 0.9,
    });
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.position.y = 0.05;
    slab.castShadow = true;
    coreGroup.add(slab);

    // Bottom Dome (Inverted Half Sphere)
    const bottomDomeGeo = new THREE.SphereGeometry(0.38, 32, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const bottomDome = new THREE.Mesh(bottomDomeGeo, orbEmeraldMat);
    bottomDome.position.y = -0.04;
    bottomDome.castShadow = true;
    coreGroup.add(bottomDome);

    // -------------------------------------------------------------
    // 7. THREE COLORFUL MINIMAL HUMAN MATTE AVATARS
    // Blue (Left), Deep Green (Center-Back), Purple (Right)
    // -------------------------------------------------------------
    const avatarsGroup = new THREE.Group();
    worldGroup.add(avatarsGroup);
    charactersRef.current = [];

    const avatarsData = [
      { name: 'Blue', color: 0x0070f3, angle: Math.PI * 1.05, dist: 1.76 }, // Left Front
      { name: 'Green', color: 0x059669, angle: -Math.PI * 0.5, dist: 1.62 }, // Center Back
      { name: 'Purple', color: 0x7c3aed, angle: -Math.PI * 0.05, dist: 1.76 }, // Right Front
    ];

    avatarsData.forEach((av) => {
      const char = new THREE.Group();
      const posX = Math.cos(av.angle) * av.dist;
      const posZ = Math.sin(av.angle) * av.dist;
      char.position.set(posX, 0.2, posZ);

      // Matte Character Material
      const avatarMat = new THREE.MeshPhysicalMaterial({
        color: av.color,
        roughness: 0.35,
        metalness: 0.05,
        clearcoat: 0.4,
      });

      // Smooth Rounded Shoulders/Torso
      const bodyGeo = new THREE.CylinderGeometry(0.24, 0.34, 0.62, 32);
      const body = new THREE.Mesh(bodyGeo, avatarMat);
      body.position.y = 0.31;
      body.castShadow = true;
      char.add(body);

      // Spherical Head
      const headGeo = new THREE.SphereGeometry(0.25, 32, 32);
      const head = new THREE.Mesh(headGeo, avatarMat);
      head.position.y = 0.78;
      head.castShadow = true;
      char.add(head);

      char.lookAt(0, 0.6, 0);
      avatarsGroup.add(char);
      charactersRef.current.push(char);
    });

    // -------------------------------------------------------------
    // 8. THREE FLOATING GLOSS BADGES WITH DOTTED CONNECTION PATH
    // Left (Rupee ₹), Center (Group Icon), Right (Pie/Analytics)
    // -------------------------------------------------------------
    const badgesGroup = new THREE.Group();
    worldGroup.add(badgesGroup);
    floatingBadgesRef.current = [];

    const badgesData = [
      { type: 'rupee' as const, pos: new THREE.Vector3(-0.95, 2.15, -0.4) },
      { type: 'group' as const, pos: new THREE.Vector3(0.02, 1.95, -0.75) },
      { type: 'pie' as const, pos: new THREE.Vector3(1.0, 2.05, -0.3) },
    ];

    badgesData.forEach((b) => {
      const badge = new THREE.Group();
      badge.position.copy(b.pos);

      // Rounded Card Plate
      const cardGeo = new THREE.BoxGeometry(0.44, 0.44, 0.06);
      const cardTex = createIconTexture(b.type);

      const materials = [
        new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.2 }),
        new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.2 }),
        new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.2 }),
        new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.2 }),
        new THREE.MeshPhysicalMaterial({
          map: cardTex,
          roughness: 0.15,
          clearcoat: 0.9,
        }),
        new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.2 }),
      ];

      const cardMesh = new THREE.Mesh(cardGeo, materials);
      cardMesh.castShadow = true;
      badge.add(cardMesh);

      // Cyan Accent Glow Trim Behind Card
      const trimGeo = new THREE.BoxGeometry(0.46, 0.46, 0.02);
      const trimMat = new THREE.MeshStandardMaterial({
        color: 0x0084ff,
        emissive: 0x0084ff,
        emissiveIntensity: 0.8,
      });
      const trimMesh = new THREE.Mesh(trimGeo, trimMat);
      trimMesh.position.z = -0.025;
      badge.add(trimMesh);

      badge.lookAt(0, 2.3, 5.0);
      badgesGroup.add(badge);
      floatingBadgesRef.current.push(badge);
    });

    // Elegant Dotted Connecting Curve Between Badges
    const curvePoints = [
      new THREE.Vector3(-1.3, 1.85, -0.3),
      new THREE.Vector3(-0.95, 2.15, -0.4),
      new THREE.Vector3(-0.45, 2.25, -0.6),
      new THREE.Vector3(0.02, 1.95, -0.75),
      new THREE.Vector3(0.5, 2.18, -0.55),
      new THREE.Vector3(1.0, 2.05, -0.3),
      new THREE.Vector3(1.35, 1.75, -0.2),
    ];
    const curve = new THREE.CatmullRomCurve3(curvePoints);

    // Glowing Particle Dots along the curve
    const dotGeo = new THREE.SphereGeometry(0.024, 16, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const pointsCount = 28;
    for (let i = 0; i <= pointsCount; i++) {
      const pt = curve.getPoint(i / pointsCount);
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(pt);
      worldGroup.add(dot);
    }

    // Ambient floating glow particles (Blue, Emerald, Purple)
    const particleColors = [0x00e5ff, 0x10b981, 0xa855f7, 0x38bdf8];
    const particleGeo = new THREE.SphereGeometry(0.038, 16, 16);
    const particleMeshes: THREE.Mesh[] = [];

    const pPositions = [
      new THREE.Vector3(-1.45, 1.7, 0.4),
      new THREE.Vector3(-0.25, 2.6, -0.5),
      new THREE.Vector3(1.4, 1.9, 0.2),
      new THREE.Vector3(0.8, 2.45, -0.8),
      new THREE.Vector3(-0.8, 1.4, 1.1),
    ];

    pPositions.forEach((pos, idx) => {
      const col = particleColors[idx % particleColors.length]!;
      const pMat = new THREE.MeshStandardMaterial({
        color: col,
        emissive: col,
        emissiveIntensity: 1.8,
      });
      const pMesh = new THREE.Mesh(particleGeo, pMat);
      pMesh.position.copy(pos);
      worldGroup.add(pMesh);
      particleMeshes.push(pMesh);
    });

    onSceneReady?.();

    // -------------------------------------------------------------
    // 9. SMOOTH CONTINUOUS TICKER ANIMATION LOOP
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

      // Smooth central orb levitation & subtle breathing
      if (coreGroup) {
        coreGroup.position.y = 1.1 + Math.sin(elapsed * 2.2) * 0.045;
        coreGroup.rotation.y = elapsed * 0.45;
      }

      // Floating badges gentle bobbing
      floatingBadgesRef.current.forEach((badge, idx) => {
        badge.position.y = badgesData[idx]!.pos.y + Math.sin(elapsed * 2.0 + idx * 1.5) * 0.035;
      });

      // Neon Ring subtle pulse
      if (neonRingMat) {
        neonRingMat.emissiveIntensity = 2.4 + Math.sin(elapsed * 3.0) * 0.4;
      }

      // Parallax mouse responsiveness
      const targetCamX = mousePos.current.x * 0.35;
      const targetCamY = 3.4 + mousePos.current.y * 0.25;
      camera.position.x += (targetCamX - camera.position.x) * 0.05;
      camera.position.y += (targetCamY - camera.position.y) * 0.05;
      camera.lookAt(0, 0.7, 0);

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
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
          height: isDesktop ? 480 : isTablet ? 380 : 320,
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
