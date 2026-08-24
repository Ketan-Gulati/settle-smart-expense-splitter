import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Platform, useWindowDimensions } from 'react-native';
import { Text } from './Text';
import { useAppTheme } from '@/hooks/useAppTheme';

interface SettleHeroProps {
  onAnimationComplete?: () => void;
}

export const SettleAuthHero = ({ onAnimationComplete }: SettleHeroProps) => {
  const theme = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isCompact = windowWidth < 380;

  // Initial Entrance Animation Values
  const brandAnim = useRef(new Animated.Value(0)).current;
  const centralScale = useRef(new Animated.Value(0.92)).current;
  const centralOpacity = useRef(new Animated.Value(0)).current;
  const centralTranslateY = useRef(new Animated.Value(16)).current;

  // Person Avatars: K -> R -> A
  const personKAnim = useRef(new Animated.Value(0)).current;
  const personRAnim = useRef(new Animated.Value(0)).current;
  const personAAnim = useRef(new Animated.Value(0)).current;

  // Expense Badges: Dinner, Cab, Villa
  const expenseDinnerAnim = useRef(new Animated.Value(0)).current;
  const expenseCabAnim = useRef(new Animated.Value(0)).current;
  const expenseVillaAnim = useRef(new Animated.Value(0)).current;

  // Connection Lines Opacity
  const connectionAnim = useRef(new Animated.Value(0)).current;

  // Subtle Continuous Floating Motion (Breathing Loops)
  const floatCentral = useRef(new Animated.Value(0)).current;
  const floatK = useRef(new Animated.Value(0)).current;
  const floatR = useRef(new Animated.Value(0)).current;
  const floatA = useRef(new Animated.Value(0)).current;
  const floatDinner = useRef(new Animated.Value(0)).current;
  const floatCab = useRef(new Animated.Value(0)).current;
  const floatVilla = useRef(new Animated.Value(0)).current;
  const pulseConnection = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Entrance Sequence (Phases 1 -> 5)
    Animated.sequence([
      // PHASE 1: Brand Wordmark (~350ms)
      Animated.timing(brandAnim, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      // PHASE 2: Central Balance Card (~450ms)
      Animated.parallel([
        Animated.timing(centralOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(centralScale, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.back(1.4)),
          useNativeDriver: true,
        }),
        Animated.timing(centralTranslateY, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // PHASE 3: People Avatars Sequential Stagger: K -> R -> A (~200ms each)
      Animated.stagger(150, [
        Animated.timing(personKAnim, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(personRAnim, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(personAAnim, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // PHASE 4: Expense Cards Stagger (~180ms each)
      Animated.stagger(120, [
        Animated.timing(expenseDinnerAnim, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(expenseCabAnim, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(expenseVillaAnim, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // PHASE 5: Connection Lines Fade In
      Animated.timing(connectionAnim, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onAnimationComplete?.();
    });

    // 2. Continuous Floating / Breathing Loops (Different Durations to Prevent Synchronicity)
    const createLoop = (anim: Animated.Value, duration: number, travel = 3.5) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: -travel,
            duration: duration / 2,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: travel,
            duration: duration / 2,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
    };

    const loopCentral = createLoop(floatCentral, 5800, 2.5);
    const loopK = createLoop(floatK, 4500, 3.5);
    const loopR = createLoop(floatR, 5200, 4.0);
    const loopA = createLoop(floatA, 4800, 3.2);
    const loopDinner = createLoop(floatDinner, 6200, 3.0);
    const loopCab = createLoop(floatCab, 5400, 3.8);
    const loopVilla = createLoop(floatVilla, 6600, 3.4);

    const loopConn = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseConnection, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseConnection, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    loopCentral.start();
    loopK.start();
    loopR.start();
    loopA.start();
    loopDinner.start();
    loopCab.start();
    loopVilla.start();
    loopConn.start();

    return () => {
      loopCentral.stop();
      loopK.stop();
      loopR.stop();
      loopA.stop();
      loopDinner.stop();
      loopCab.stop();
      loopVilla.stop();
      loopConn.stop();
    };
  }, []);

  const isDark = theme.isDark;

  // Background subtle illumination
  const ambientGlowColor = isDark
    ? 'rgba(56, 189, 248, 0.06)'
    : 'rgba(15, 23, 42, 0.03)';
  const centerGlowColor = isDark
    ? 'rgba(16, 185, 129, 0.08)'
    : 'rgba(16, 185, 129, 0.05)';

  return (
    <View style={[styles.heroContainer, { height: isCompact ? 240 : 265 }]}>
      {/* Brand Wordmark at Top */}
      <Animated.View
        style={[
          styles.brandHeader,
          {
            opacity: brandAnim,
            transform: [
              {
                translateY: brandAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text
          variant="caption"
          weight="bold"
          style={[styles.brandWordmark, { color: theme.colors.primary }]}
        >
          SETTLE
        </Text>
      </Animated.View>

      {/* Floating 2.5D Composition Scene */}
      <View style={styles.sceneCanvas}>
        {/* Soft Radial Ambient Lighting Layer */}
        <View
          style={[
            styles.radialGlow,
            {
              backgroundColor: ambientGlowColor,
            },
          ]}
        />
        <View
          style={[
            styles.centerGlow,
            {
              backgroundColor: centerGlowColor,
            },
          ]}
        />

        {/* SVG-like Subtle Elegant Connection Vectors (Decorative depth paths) */}
        <Animated.View
          style={[
            styles.connectionsLayer,
            {
              opacity: Animated.multiply(
                connectionAnim,
                pulseConnection.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.35, 0.75],
                })
              ),
            },
          ]}
          pointerEvents="none"
        >
          {/* Subtle Path Lines Connecting People & Expenses to Central Settlement */}
          <View style={[styles.connLine, styles.connTopR, { borderColor: isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.15)' }]} />
          <View style={[styles.connLine, styles.connLeftK, { borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.2)' }]} />
          <View style={[styles.connLine, styles.connRightA, { borderColor: isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.15)' }]} />
        </Animated.View>

        {/* 1. TOP PERSON: R (₹1,200) */}
        <Animated.View
          style={[
            styles.personRWrapper,
            {
              opacity: personRAnim,
              transform: [
                {
                  scale: personRAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
                {
                  translateY: Animated.add(
                    personRAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-14, 0],
                    }),
                    floatR
                  ),
                },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.personCard,
              {
                backgroundColor: isDark ? '#162032' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                ...styles.cardShadowSubtle,
              },
            ]}
          >
            <View style={[styles.avatarCircle, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
              <Text variant="caption" weight="bold" color={isDark ? '#38BDF8' : '#0F172A'}>
                R
              </Text>
            </View>
            <Text variant="caption" weight="semibold" color={isDark ? '#94A3B8' : '#475569'}>
              ₹1,200
            </Text>
          </View>
        </Animated.View>

        {/* 2. TOP-LEFT EXPENSE: Dinner (₹3,600) */}
        <Animated.View
          style={[
            styles.expenseDinnerWrapper,
            {
              opacity: expenseDinnerAnim,
              transform: [
                {
                  scale: expenseDinnerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.85, 1],
                  }),
                },
                {
                  translateX: expenseDinnerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-16, 0],
                  }),
                },
                { translateY: floatDinner },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.expenseBadge,
              {
                backgroundColor: isDark ? '#131B2A' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                ...styles.cardShadowSubtle,
              },
            ]}
          >
            <View style={[styles.badgeDot, { backgroundColor: '#38BDF8' }]} />
            <Text variant="caption" weight="medium" color={isDark ? '#94A3B8' : '#475569'}>
              Dinner{' '}
            </Text>
            <Text variant="caption" weight="bold" color={isDark ? '#F8FAFC' : '#0F172A'}>
              ₹3,600
            </Text>
          </View>
        </Animated.View>

        {/* 3. CENTRAL DOMINANT BALANCE CARD: "₹2,830 You are owed" */}
        <Animated.View
          style={[
            styles.centralCardWrapper,
            {
              opacity: centralOpacity,
              transform: [
                { scale: centralScale },
                { translateY: Animated.add(centralTranslateY, floatCentral) },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.centralCard,
              {
                backgroundColor: isDark ? '#131D2E' : '#FFFFFF',
                borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.25)',
                ...styles.centralCardShadow,
              },
            ]}
          >
            {/* Subtle Top Specular Glass Line */}
            <View
              style={[
                styles.specularHighlight,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(255, 255, 255, 0.6)',
                },
              ]}
            />

            {/* Pill Indicator */}
            <View style={[styles.settlePill, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}>
              <View style={[styles.pulsingGreenDot, { backgroundColor: '#10B981' }]} />
              <Text variant="caption" weight="bold" style={{ color: '#10B981', fontSize: 10, letterSpacing: 0.5 }}>
                NET SETTLEMENT
              </Text>
            </View>

            {/* Main Balance Number */}
            <Text
              variant="displayLarge"
              weight="bold"
              style={[
                styles.centralAmount,
                {
                  color: isDark ? '#34D399' : '#059669',
                },
              ]}
            >
              ₹2,830
            </Text>

            {/* Status Label */}
            <Text
              variant="caption"
              weight="medium"
              style={[
                styles.centralSubtitle,
                {
                  color: isDark ? '#94A3B8' : '#64748B',
                },
              ]}
            >
              You are owed
            </Text>
          </View>
        </Animated.View>

        {/* 4. BOTTOM-LEFT PERSON: K */}
        <Animated.View
          style={[
            styles.personKWrapper,
            {
              opacity: personKAnim,
              transform: [
                {
                  scale: personKAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
                {
                  translateY: Animated.add(
                    personKAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [14, 0],
                    }),
                    floatK
                  ),
                },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.avatarCardPill,
              {
                backgroundColor: isDark ? '#162032' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                ...styles.cardShadowSubtle,
              },
            ]}
          >
            <View style={[styles.avatarCircleSmall, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5' }]}>
              <Text variant="caption" weight="bold" color={isDark ? '#34D399' : '#059669'}>
                K
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* 5. BOTTOM-RIGHT PERSON: A */}
        <Animated.View
          style={[
            styles.personAWrapper,
            {
              opacity: personAAnim,
              transform: [
                {
                  scale: personAAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
                {
                  translateY: Animated.add(
                    personAAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [14, 0],
                    }),
                    floatA
                  ),
                },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.avatarCardPill,
              {
                backgroundColor: isDark ? '#162032' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                ...styles.cardShadowSubtle,
              },
            ]}
          >
            <View style={[styles.avatarCircleSmall, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.2)' : '#E0F2FE' }]}>
              <Text variant="caption" weight="bold" color={isDark ? '#38BDF8' : '#0284C7'}>
                A
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* 6. BOTTOM-LEFT EXPENSE: Airport Cab (₹900) */}
        <Animated.View
          style={[
            styles.expenseCabWrapper,
            {
              opacity: expenseCabAnim,
              transform: [
                {
                  scale: expenseCabAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.85, 1],
                  }),
                },
                {
                  translateX: expenseCabAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-12, 0],
                  }),
                },
                { translateY: floatCab },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.expenseBadge,
              {
                backgroundColor: isDark ? '#131B2A' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                ...styles.cardShadowSubtle,
              },
            ]}
          >
            <View style={[styles.badgeDot, { backgroundColor: '#F59E0B' }]} />
            <Text variant="caption" weight="medium" color={isDark ? '#94A3B8' : '#475569'}>
              Airport Cab{' '}
            </Text>
            <Text variant="caption" weight="bold" color={isDark ? '#F8FAFC' : '#0F172A'}>
              ₹900
            </Text>
          </View>
        </Animated.View>

        {/* 7. BOTTOM-RIGHT EXPENSE: Villa Booking (₹2,400) */}
        <Animated.View
          style={[
            styles.expenseVillaWrapper,
            {
              opacity: expenseVillaAnim,
              transform: [
                {
                  scale: expenseVillaAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.85, 1],
                  }),
                },
                {
                  translateX: expenseVillaAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
                { translateY: floatVilla },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.expenseBadge,
              {
                backgroundColor: isDark ? '#131B2A' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                ...styles.cardShadowSubtle,
              },
            ]}
          >
            <View style={[styles.badgeDot, { backgroundColor: '#A855F7' }]} />
            <Text variant="caption" weight="medium" color={isDark ? '#94A3B8' : '#475569'}>
              Villa Booking{' '}
            </Text>
            <Text variant="caption" weight="bold" color={isDark ? '#F8FAFC' : '#0F172A'}>
              ₹2,400
            </Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  heroContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
    marginBottom: 12,
  },
  brandHeader: {
    marginBottom: 6,
  },
  brandWordmark: {
    letterSpacing: 3,
    fontSize: 11,
  },
  sceneCanvas: {
    width: '100%',
    maxWidth: 380,
    height: 220,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radialGlow: {
    position: 'absolute',
    width: 280,
    height: 180,
    borderRadius: 140,
    top: 20,
    opacity: 0.8,
  },
  centerGlow: {
    position: 'absolute',
    width: 170,
    height: 110,
    borderRadius: 85,
    top: 55,
    opacity: 0.9,
  },
  connectionsLayer: {
    ...StyleSheet.absoluteFill,
  },
  connLine: {
    position: 'absolute',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  connTopR: {
    top: 32,
    left: '50%',
    width: 1,
    height: 38,
    marginLeft: 0,
  },
  connLeftK: {
    top: 100,
    left: 45,
    width: 70,
    height: 1,
  },
  connRightA: {
    top: 100,
    right: 45,
    width: 70,
    height: 1,
  },
  centralCardWrapper: {
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centralCard: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 180,
    position: 'relative',
    overflow: 'hidden',
  },
  specularHighlight: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 1,
  },
  settlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 6,
  },
  pulsingGreenDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  centralAmount: {
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.8,
  },
  centralSubtitle: {
    fontSize: 12,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  personRWrapper: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    zIndex: 8,
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  avatarCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personKWrapper: {
    position: 'absolute',
    bottom: 58,
    left: 14,
    zIndex: 8,
  },
  personAWrapper: {
    position: 'absolute',
    bottom: 58,
    right: 14,
    zIndex: 8,
  },
  avatarCardPill: {
    padding: 3,
    borderRadius: 16,
    borderWidth: 1,
  },
  avatarCircleSmall: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseDinnerWrapper: {
    position: 'absolute',
    top: 36,
    left: 4,
    zIndex: 6,
  },
  expenseCabWrapper: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    zIndex: 7,
  },
  expenseVillaWrapper: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    zIndex: 7,
  },
  expenseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  cardShadowSubtle: Platform.select({
    web: {
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
    } as any,
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 3,
    },
  }),
  centralCardShadow: Platform.select({
    web: {
      boxShadow: '0 12px 28px rgba(0, 0, 0, 0.4), 0 0 20px rgba(16, 185, 129, 0.12)',
    } as any,
    default: {
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
    },
  }),
});
