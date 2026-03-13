import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';

const { width, height } = Dimensions.get('window');
const SPLASH_IMAGE = require('../assets/splash.jpg');

const TITLE_LINE1 = 'Florarium';
const TITLE_LINE2 = 'World';
const FULL_TEXT = TITLE_LINE1 + TITLE_LINE2;
const TYPE_SPEED = 90;
const SPARKLE_COUNT = 3;

interface Sparkle {
  id: number;
  x: number;
  y: number;
  opacity: Animated.Value;
  translateX: Animated.Value;
  translateY: Animated.Value;
  scale: Animated.Value;
}

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1.2)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;
  const cursorAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const { t } = useLanguage();

  const [visibleChars, setVisibleChars] = useState(0);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [showCursor, setShowCursor] = useState(true);
  const sparkleId = useRef(0);
  const typingDone = useRef(false);

  // Cursor blink
  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(cursorAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, []);

  // Spawn sparkles at approximate cursor position
  const spawnSparkles = (charIndex: number) => {
    const newSparkles: Sparkle[] = [];
    const isLine2 = charIndex >= TITLE_LINE1.length;
    const lineChars = isLine2 ? charIndex - TITLE_LINE1.length : charIndex;
    const fontSize = isLine2 ? 52 : 48;
    const charWidth = fontSize * 0.52;
    const lineText = isLine2 ? TITLE_LINE2 : TITLE_LINE1;
    const lineWidth = lineText.length * charWidth;
    const startX = (width - lineWidth) / 2;
    const cx = startX + lineChars * charWidth + charWidth / 2;
    const cy = isLine2 ? height * 0.48 + 28 : height * 0.48 - 22;

    for (let i = 0; i < SPARKLE_COUNT; i++) {
      const id = sparkleId.current++;
      const opacity = new Animated.Value(1);
      const scale = new Animated.Value(0.8 + Math.random() * 0.6);
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 35;
      const targetX = Math.cos(angle) * dist;
      const targetY = Math.sin(angle) * dist - 15;
      const translateX = new Animated.Value(0);
      const translateY = new Animated.Value(0);

      newSparkles.push({ id, x: cx, y: cy, opacity, translateX, translateY, scale });

      const duration = 400 + Math.random() * 400;
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: targetX, duration, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: targetY, duration, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0, duration: duration + 100, useNativeDriver: true }),
      ]).start();
    }

    setSparkles(prev => [...prev.slice(-24), ...newSparkles]);
  };

  // Main animation sequence
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
    ]).start(() => {
      // Typewriter
      let charIdx = 0;
      const typeInterval = setInterval(() => {
        charIdx++;
        setVisibleChars(charIdx);
        spawnSparkles(charIdx - 1);

        if (charIdx >= FULL_TEXT.length) {
          clearInterval(typeInterval);
          typingDone.current = true;
          setShowCursor(false);

          Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.timing(subtitleFade, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.delay(1200),
            Animated.timing(fadeAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
          ]).start(() => onFinish());
        }
      }, TYPE_SPEED);
    });
  }, []);

  const line1Text = TITLE_LINE1.slice(0, Math.min(visibleChars, TITLE_LINE1.length));
  const line2Chars = Math.max(0, visibleChars - TITLE_LINE1.length);
  const line2Text = TITLE_LINE2.slice(0, line2Chars);
  const cursorOnLine1 = visibleChars <= TITLE_LINE1.length;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.Image
        source={SPLASH_IMAGE}
        style={[styles.backgroundImage, { transform: [{ scale: scaleAnim }] }]}
        resizeMode="cover"
      />
      <View style={styles.overlay} />

      <View style={styles.content}>
        {/* Golden glow behind text */}
        <Animated.View style={[styles.glowEffect, { opacity: glowAnim }]} />

        {/* Line 1: Florarium */}
        <View style={styles.lineContainer}>
          <Text style={styles.title}>{line1Text}</Text>
          {showCursor && cursorOnLine1 && (
            <Animated.Text style={[styles.cursor, { opacity: cursorAnim }]}>|</Animated.Text>
          )}
        </View>

        {/* Line 2: World */}
        {visibleChars > TITLE_LINE1.length && (
          <View style={styles.lineContainer}>
            <Text style={styles.titleAccent}>{line2Text}</Text>
            {showCursor && !cursorOnLine1 && (
              <Animated.Text style={[styles.cursorGold, { opacity: cursorAnim }]}>|</Animated.Text>
            )}
          </View>
        )}

        {/* Subtitle */}
        <Animated.Text style={[styles.subtitle, { opacity: subtitleFade }]}>
          {t('splashSubtitle')}
        </Animated.Text>
      </View>

      {/* Gold sparkles */}
      {sparkles.map(s => (
        <Animated.View
          key={s.id}
          style={{
            position: 'absolute',
            left: s.x,
            top: s.y,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: '#FFD54F',
            shadowColor: '#FFB300',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 6,
            elevation: 4,
            opacity: s.opacity,
            transform: [
              { translateX: s.translateX },
              { translateY: s.translateY },
              { scale: s.scale },
            ],
          }}
        />
      ))}

      {/* Ambient sparkles after typing done */}
      <Animated.View style={[styles.ambientSparkle, { top: '20%', right: '15%', opacity: Animated.multiply(glowAnim, 0.7) }]} />
      <Animated.View style={[styles.ambientSparkle, { bottom: '25%', left: '18%', opacity: Animated.multiply(glowAnim, 0.5) }]} />
      <Animated.View style={[styles.ambientSparkle, { top: '38%', left: '10%', opacity: Animated.multiply(glowAnim, 0.4) }]} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1a08',
  },
  backgroundImage: {
    position: 'absolute',
    width,
    height,
  },
  overlay: {
    position: 'absolute',
    width,
    height,
    backgroundColor: 'rgba(0, 20, 8, 0.5)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  glowEffect: {
    position: 'absolute',
    width: 320,
    height: 130,
    backgroundColor: 'rgba(255, 200, 50, 0.1)',
    borderRadius: 65,
  },
  lineContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  title: {
    fontSize: 48,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: 2,
    textShadowColor: 'rgba(255, 200, 50, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  titleAccent: {
    fontSize: 52,
    fontWeight: '700',
    color: '#FFD54F',
    letterSpacing: 4,
    marginTop: -4,
    textShadowColor: 'rgba(255, 180, 0, 0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  cursor: {
    fontSize: 48,
    fontWeight: '200',
    color: '#FFD54F',
    marginLeft: -2,
  },
  cursorGold: {
    fontSize: 52,
    fontWeight: '200',
    color: '#FFD54F',
    marginLeft: -2,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginTop: 24,
    letterSpacing: 1,
  },
  ambientSparkle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFD54F',
    shadowColor: '#FFB300',
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});

export default SplashScreen;
