import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, useWindowDimensions, Image } from 'react-native';
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
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 1024;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  const cardRef = useRef<HTMLDivElement | null>(null);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);

  // Form Focus & Input State Interactions via GSAP
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    if (interactionState === 'email_focused') {
      if (imageContainerRef.current) {
        gsap.to(imageContainerRef.current, {
          rotateY: 7,
          rotateX: -3,
          scale: 1.025,
          duration: 0.6,
          ease: 'power2.out',
        });
      }
    } else if (interactionState === 'password_focused') {
      if (imageContainerRef.current) {
        gsap.to(imageContainerRef.current, {
          rotateY: -7,
          rotateX: 3,
          scale: 1.025,
          duration: 0.6,
          ease: 'power2.out',
        });
      }
    } else if (interactionState === 'submitting') {
      if (imageContainerRef.current) {
        gsap.to(imageContainerRef.current, {
          scale: 1.05,
          rotateY: 0,
          rotateX: 0,
          duration: 0.3,
          ease: 'back.out(1.8)',
        });
      }
    } else if (interactionState === 'idle') {
      if (imageContainerRef.current) {
        gsap.to(imageContainerRef.current, {
          rotateY: 0,
          rotateX: 0,
          scale: 1,
          duration: 0.8,
          ease: 'power2.out',
        });
      }
    }
  }, [interactionState]);

  // Master Continuous Choreography (GSAP)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // 1. Organic Floating Levitation
    if (imageContainerRef.current) {
      gsap.to(imageContainerRef.current, {
        y: -6,
        duration: 2.8,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });
    }

    // 2. Smooth 3D Cursor Parallax
    const handleMouseMove = (e: MouseEvent) => {
      if (!cardRef.current || !imageContainerRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      gsap.to(imageContainerRef.current, {
        rotateY: x * 16,
        rotateX: -y * 12,
        transformPerspective: 1200,
        duration: 0.35,
        ease: 'power1.out',
      });
    };

    const handleMouseLeave = () => {
      if (!imageContainerRef.current) return;
      gsap.to(imageContainerRef.current, {
        rotateY: 0,
        rotateX: 0,
        duration: 0.9,
        ease: 'power2.out',
      });
    };

    const card = cardRef.current;
    if (card) {
      card.addEventListener('mousemove', handleMouseMove);
      card.addEventListener('mouseleave', handleMouseLeave);
    }

    onSceneReady?.();

    return () => {
      if (card) {
        card.removeEventListener('mousemove', handleMouseMove);
        card.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* 3D Perspective Card Wrapper */}
      <div
        ref={cardRef}
        style={{
          width: '100%',
          maxWidth: isDesktop ? 480 : isTablet ? 450 : windowWidth - 24,
          height: 285,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: 1200,
          cursor: 'grab',
        }}
      >
        {/* 3D Transform Network Container */}
        <div
          ref={imageContainerRef}
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Pure High-Fidelity Autonomous Settlement Engine Graphic */}
          <Image
            source={{
              uri: 'https://res.cloudinary.com/dxanpvaub/image/upload/v1787942606/072be95e-a4ed-4749-b568-4d624e1063b8_d6emzz.png',
            }}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </div>
      </div>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    maxWidth: 480,
  },
});
