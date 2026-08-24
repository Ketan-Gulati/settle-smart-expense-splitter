import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import * as THREE from 'three/src/Three.js';
import gsap from 'gsap';
import { useAppTheme } from '@/hooks/useAppTheme';

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
  const theme = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 1024;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  const [activeStoryStage, setActiveStoryStage] = useState<string>('Dinner $120');

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const charactersRef = useRef<THREE.Group[]>([]);
  const expenseCardRef = useRef<THREE.Group | null>(null);
  const flowArcsRef = useRef<THREE.Mesh[]>([]);
  const settlementOrbRef = useRef<THREE.Mesh | null>(null);
  const mousePos = useRef<THREE.Vector2>(new THREE.Vector2(0, 0));
  const reqIdRef = useRef<number | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const isDark = theme.isDark;

  // React to User Form Interactions
  useEffect(() => {
    if (!charactersRef.current.length || !cameraRef.current) return;

    if (interactionState === 'email_focused') {
      // Characters lean & look forward toward the user
      charactersRef.current.forEach((char, idx) => {
        gsap.to(char.rotation, {
          y: idx % 2 === 0 ? 0.35 : -0.35,
          x: 0.12,
          duration: 0.5,
          ease: 'power2.out',
        });
        gsap.to(char.position, {
          y: 0.08,
          duration: 0.4,
          ease: 'back.out(1.5)',
        });
      });
      setActiveStoryStage('Adding to Group');
    } else if (interactionState === 'password_focused') {
      // Calm state & focus on security
      charactersRef.current.forEach((char) => {
        gsap.to(char.rotation, {
          y: 0,
          x: 0,
          duration: 0.6,
          ease: 'power2.out',
        });
        gsap.to(char.position, {
          y: 0,
          duration: 0.5,
          ease: 'power2.out',
        });
      });
      setActiveStoryStage('Securing Vault');
    } else if (interactionState === 'google_hover') {
      // Subtle cyan pulse across expense arcs
      flowArcsRef.current.forEach((arc) => {
        gsap.to((arc.material as THREE.MeshStandardMaterial), {
          emissiveIntensity: 1.6,
          duration: 0.3,
          yoyo: true,
          repeat: 1,
        });
      });
      setActiveStoryStage('Instant Sync');
    } else if (interactionState === 'otp_hover') {
      // Floating notification bounce
      if (expenseCardRef.current) {
        gsap.to(expenseCardRef.current.position, {
          y: 0.95,
          duration: 0.35,
          yoyo: true,
          repeat: 1,
          ease: 'power2.out',
        });
      }
      setActiveStoryStage('6-Digit Verification Code');
    } else if (interactionState === 'submitting') {
      // Fast convergence into Settled state
      flowArcsRef.current.forEach((arc) => {
        gsap.to((arc.material as THREE.MeshStandardMaterial), { opacity: 1, duration: 0.2 });
      });
      if (settlementOrbRef.current) {
        gsap.to(settlementOrbRef.current.scale, {
          x: 1.4,
          y: 1.4,
          z: 1.4,
          duration: 0.3,
          ease: 'back.out(2)',
        });
      }
      setActiveStoryStage('Settling Balances...');
    } else if (interactionState === 'success') {
      if (settlementOrbRef.current) {
        gsap.to(settlementOrbRef.current.scale, {
          x: 1.8,
          y: 1.8,
          z: 1.8,
          duration: 0.4,
        });
      }
      setActiveStoryStage('✓ All Even & Settled');
    } else {
      // Idle return
      charactersRef.current.forEach((char) => {
        gsap.to(char.rotation, {
          y: 0,
          x: 0,
          duration: 0.6,
          ease: 'power2.out',
        });
        gsap.to(char.position, {
          y: 0,
          duration: 0.5,
          ease: 'power2.out',
        });
      });
    }
  }, [interactionState]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || (isDesktop ? 540 : isTablet ? 480 : windowWidth);
    const height = container.clientHeight || (isDesktop ? 520 : isTablet ? 360 : 300);

    // 1. Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Cinematic 3/4 Perspective Camera
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 3.2, 5.6);
    camera.lookAt(0, 0.3, 0);
    cameraRef.current = camera;

    // 3. WebGL Renderer with High Precision & Tone Mapping
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isDark ? 1.3 : 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Commercial Studio Lighting (Soft Ambient, Key Rim, Emerald Accent)
    const ambientLight = new THREE.AmbientLight(isDark ? 0x1e293b : 0xffffff, isDark ? 2.2 : 1.8);
    scene.add(ambientLight);

    const studioSpot = new THREE.SpotLight(0xffffff, isDark ? 4.5 : 3.2);
    studioSpot.position.set(0, 6.5, 3.5);
    studioSpot.angle = Math.PI / 4.5;
    studioSpot.penumbra = 0.5;
    studioSpot.castShadow = true;
    studioSpot.shadow.mapSize.width = 1024;
    studioSpot.shadow.mapSize.height = 1024;
    scene.add(studioSpot);

    const cyanRim = new THREE.DirectionalLight(0x38bdf8, isDark ? 2.5 : 1.5);
    cyanRim.position.set(3.5, 3.5, -2);
    scene.add(cyanRim);

    const emeraldFill = new THREE.PointLight(0x10b981, isDark ? 2.6 : 1.6, 12);
    emeraldFill.position.set(-3.5, 2.5, 2);
    scene.add(emeraldFill);

    // Main World Anchor
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // -----------------------------------------------------------------
    // 5. THE CENTRAL SETTLEMENT PLATFORM (Minimal Ceramic Disc)
    // -----------------------------------------------------------------
    const platformGroup = new THREE.Group();
    worldGroup.add(platformGroup);

    const platformGeo = new THREE.CylinderGeometry(1.65, 1.72, 0.16, 48);
    const platformMat = new THREE.MeshPhysicalMaterial({
      color: isDark ? 0x162032 : 0xf8fafc,
      roughness: 0.25,
      metalness: 0.05,
      clearcoat: 0.5,
      clearcoatRoughness: 0.1,
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = 0.5;
    platform.receiveShadow = true;
    platformGroup.add(platform);

    // Inner Glowing Settle Circle
    const innerRingGeo = new THREE.TorusGeometry(1.22, 0.035, 16, 64);
    const innerRingMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: isDark ? 0.8 : 0.4,
      roughness: 0.2,
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.y = 0.59;
    platformGroup.add(innerRing);

    // Central Settle Emblem / Balance Core Node
    const orbGeo = new THREE.SphereGeometry(0.18, 24, 24);
    const orbMat = new THREE.MeshPhysicalMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 0.6,
      roughness: 0.15,
      metalness: 0.2,
      clearcoat: 0.9,
    });
    const settlementOrb = new THREE.Mesh(orbGeo, orbMat);
    settlementOrb.position.y = 0.72;
    settlementOrb.castShadow = true;
    platformGroup.add(settlementOrb);
    settlementOrbRef.current = settlementOrb;

    // -----------------------------------------------------------------
    // 6. THE SHARED EXPENSE OBJECT ("Dinner $120")
    // -----------------------------------------------------------------
    const expenseCard = new THREE.Group();
    expenseCard.position.set(0, 0.82, 0.25);
    expenseCard.scale.set(0.001, 0.001, 0.001); // starts collapsed
    worldGroup.add(expenseCard);
    expenseCardRef.current = expenseCard;

    // Crisp Matte Card Mesh
    const cardGeo = new THREE.BoxGeometry(0.55, 0.02, 0.38);
    const cardMat = new THREE.MeshPhysicalMaterial({
      color: isDark ? 0x1e293b : 0xffffff,
      roughness: 0.2,
      clearcoat: 0.8,
    });
    const cardMesh = new THREE.Mesh(cardGeo, cardMat);
    cardMesh.castShadow = true;
    expenseCard.add(cardMesh);

    // Accent Stripe
    const stripeGeo = new THREE.BoxGeometry(0.48, 0.025, 0.06);
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.6,
    });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(0, 0.005, 0.11);
    expenseCard.add(stripe);

    // -----------------------------------------------------------------
    // 7. 3 ABSTRACT STYLIZED HUMAN FIGURES (Friends in the Group)
    // Sophisticated Minimal Collectible Toy Proportions
    // -----------------------------------------------------------------
    const charactersGroup = new THREE.Group();
    worldGroup.add(charactersGroup);
    charactersRef.current = [];

    interface CharacterConfig {
      name: string;
      color: number;
      hairColor: number;
      angle: number;
      share: string;
    }

    const charactersData: CharacterConfig[] = [
      { name: 'Alex', color: 0x38bdf8, hairColor: 0x0f172a, angle: (5 * Math.PI) / 6, share: 'Alex $40' },
      { name: 'Sam', color: 0xa855f7, hairColor: 0x334155, angle: Math.PI / 6, share: 'Sam $40' },
      { name: 'You', color: 0x10b981, hairColor: 0x1e293b, angle: (3 * Math.PI) / 2, share: 'You $40' },
    ];

    const characterMeshes: THREE.Group[] = [];

    const createCharacter = (config: CharacterConfig) => {
      const charGroup = new THREE.Group();
      const dist = 1.85;
      const posX = Math.cos(config.angle) * dist;
      const posZ = Math.sin(config.angle) * dist;
      charGroup.position.set(posX, 0.1, posZ);

      // Plinth Base Stool
      const stoolGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.38, 24);
      const stoolMat = new THREE.MeshStandardMaterial({
        color: isDark ? 0x1e293b : 0xe2e8f0,
        roughness: 0.5,
      });
      const stool = new THREE.Mesh(stoolGeo, stoolMat);
      stool.position.y = 0.19;
      charGroup.add(stool);

      // Smooth Geometric Torso (Tapered Capsule)
      const bodyGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.44, 24);
      const bodyMat = new THREE.MeshPhysicalMaterial({
        color: config.color,
        roughness: 0.25,
        clearcoat: 0.6,
        clearcoatRoughness: 0.15,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.6;
      body.castShadow = true;
      charGroup.add(body);

      // Smooth Geometric Head
      const headGeo = new THREE.SphereGeometry(0.18, 24, 24);
      const headMat = new THREE.MeshStandardMaterial({
        color: isDark ? 0xfecaca : 0xfde047,
        roughness: 0.45,
      });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 0.92;
      head.castShadow = true;
      charGroup.add(head);

      // Minimal Stylized Hair Cap
      const hairGeo = new THREE.SphereGeometry(0.185, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const hairMat = new THREE.MeshStandardMaterial({ color: config.hairColor, roughness: 0.6 });
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.set(0, 0.94, 0);
      charGroup.add(hair);

      // Floating Individual Share Pill (Alex $40)
      const sharePill = new THREE.Group();
      sharePill.position.set(0, 1.32, 0);
      sharePill.scale.set(0.001, 0.001, 0.001);

      const pillGeo = new THREE.BoxGeometry(0.42, 0.14, 0.05);
      const pillMat = new THREE.MeshPhysicalMaterial({
        color: config.color,
        emissive: config.color,
        emissiveIntensity: 0.4,
        roughness: 0.2,
        clearcoat: 0.8,
      });
      const pill = new THREE.Mesh(pillGeo, pillMat);
      sharePill.add(pill);
      charGroup.add(sharePill);

      charGroup.userData = { sharePill, shareText: config.share };
      charGroup.lookAt(0, 0.6, 0);

      return charGroup;
    };

    charactersData.forEach((c) => {
      const cMesh = createCharacter(c);
      charactersGroup.add(cMesh);
      characterMeshes.push(cMesh);
      charactersRef.current.push(cMesh);
    });

    // -----------------------------------------------------------------
    // 8. ELEGANT EXPENSE FLOW ARCS (Expense -> Individual Shares -> Settle)
    // -----------------------------------------------------------------
    const flowArcsGroup = new THREE.Group();
    worldGroup.add(flowArcsGroup);
    flowArcsRef.current = [];

    const createArcCurve = (start: THREE.Vector3, end: THREE.Vector3, color: number) => {
      const mid = start.clone().add(end).multiplyScalar(0.5);
      mid.y += 0.48; // Graceful high arc
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const tubeGeo = new THREE.TubeGeometry(curve, 28, 0.016, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.9,
        transparent: true,
        opacity: 0,
      });
      return new THREE.Mesh(tubeGeo, tubeMat);
    };

    const cardCenter = new THREE.Vector3(0, 0.84, 0.25);

    characterMeshes.forEach((c) => {
      const arc = createArcCurve(cardCenter, c.position.clone().setY(0.7), 0x38bdf8);
      flowArcsGroup.add(arc);
      flowArcsRef.current.push(arc);
    });

    // -----------------------------------------------------------------
    // 9. GSAP CHOREOGRAPHED 2-3s CINEMATIC STORYBOARD
    // -----------------------------------------------------------------
    const tl = gsap.timeline({
      repeat: -1,
      repeatDelay: 3.0,
      onComplete: () => {
        onSceneReady?.();
      },
    });
    tlRef.current = tl;

    // Step 1: Camera initial glide & platform emergence (0 - 0.7s)
    tl.fromTo(
      camera.position,
      { y: 4.2, z: 6.8 },
      { y: 3.2, z: 5.6, duration: 1.2, ease: 'power2.out' },
      0
    );
    tl.fromTo(
      platformGroup.scale,
      { x: 0.001, y: 0.001, z: 0.001 },
      { x: 1, y: 1, z: 1, duration: 0.8, ease: 'back.out(1.4)' },
      0.1
    );

    // Step 2: Shared Expense Card Appears: "Dinner $120" (0.7 - 1.4s)
    tl.call(() => setActiveStoryStage('Dinner $120'), [], 0.7);
    tl.to(
      expenseCard.scale,
      { x: 1, y: 1, z: 1, duration: 0.6, ease: 'back.out(1.8)' },
      0.7
    );

    // Step 3: Flows Travel from Expense to Friends & Split Shares (1.4 - 2.2s)
    tl.call(() => setActiveStoryStage('Split: $40 Each'), [], 1.4);
    flowArcsRef.current.forEach((arc) => {
      tl.to((arc.material as THREE.MeshStandardMaterial), { opacity: 0.9, duration: 0.45 }, 1.4);
    });
    characterMeshes.forEach((c) => {
      const pill = c.userData.sharePill;
      if (pill) {
        tl.to(pill.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: 'back.out(1.6)' }, 1.6);
      }
    });

    // Step 4: Settlement Convergence & Balanced State (2.4 - 3.2s)
    tl.call(() => setActiveStoryStage('✓ Settled. Everyone Even.'), [], 2.4);
    tl.to(settlementOrb.scale, { x: 1.35, y: 1.35, z: 1.35, duration: 0.35, yoyo: true, repeat: 1 }, 2.4);
    flowArcsRef.current.forEach((arc) => {
      tl.to((arc.material as THREE.MeshStandardMaterial), { opacity: 0, duration: 0.5 }, 2.8);
    });
    characterMeshes.forEach((c) => {
      const pill = c.userData.sharePill;
      if (pill) {
        tl.to(pill.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.3 }, 3.0);
      }
    });

    // -----------------------------------------------------------------
    // 10. LIVING ANIMATION LOOP & PARALLAX
    // -----------------------------------------------------------------
    let clock = new THREE.Clock();

    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Mouse Parallax on Camera
      const targetCamX = mousePos.current.x * 0.4;
      const targetCamY = 3.2 + mousePos.current.y * 0.25;
      camera.position.x += (targetCamX - camera.position.x) * 0.05;
      camera.position.y += (targetCamY - camera.position.y) * 0.05;
      camera.lookAt(0, 0.3, 0);

      // Subtle breathing on characters
      charactersRef.current.forEach((c, idx) => {
        c.position.y = Math.sin(elapsedTime * 2 + idx) * 0.012;
      });

      // Subtle float on expense card
      if (expenseCardRef.current) {
        expenseCardRef.current.position.y = 0.82 + Math.sin(elapsedTime * 2.2) * 0.02;
        expenseCardRef.current.rotation.y = Math.sin(elapsedTime * 0.8) * 0.05;
      }

      // Settle Orb subtle rotation
      if (settlementOrbRef.current) {
        settlementOrbRef.current.rotation.y = elapsedTime * 0.5;
      }

      renderer.render(scene, camera);
    };

    animate();

    // -----------------------------------------------------------------
    // 11. EVENT LISTENERS
    // -----------------------------------------------------------------
    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mousePos.current.set(x, y);
    };

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);
    container.addEventListener('mousemove', handlePointerMove);

    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handlePointerMove);
      renderer.dispose();
      tl.kill();
    };
  }, [isDark, isDesktop, isTablet]);

  return (
    <View
      style={[
        styles.canvasWrapper,
        {
          height: isDesktop ? 480 : isTablet ? 340 : 280,
          maxWidth: isDesktop ? 540 : 440,
        },
      ]}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
        {/* Dynamic Story Stage Indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: isDark ? 'rgba(19, 27, 42, 0.9)' : 'rgba(255, 255, 255, 0.92)',
            border: isDark ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(15, 23, 42, 0.12)',
            backdropFilter: 'blur(10px)',
            padding: '5px 14px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
            }}
          />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: isDark ? '#F8FAFC' : '#0F172A',
              letterSpacing: '0.2px',
            }}
          >
            {activeStoryStage}
          </span>
        </div>
      </div>
    </View>
  );
};

const styles = StyleSheet.create({
  canvasWrapper: {
    width: '100%',
    alignSelf: 'center',
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
