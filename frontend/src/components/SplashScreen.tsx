import React, { useEffect, useRef } from 'react';
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

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1.2)).current;
  const titleFade = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(30)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const { t } = useLanguage();

  useEffect(() => {
    // Sequence of animations
    Animated.sequence([
      // 1. Fade in background and zoom
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
      // 2. Title animation
      Animated.parallel([
        Animated.timing(titleFade, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(titleSlide, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // 3. Subtitle animation
      Animated.timing(subtitleFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // 4. Glow effect
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // 5. Wait a bit
      Animated.delay(800),
      // 6. Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.Image
        source={SPLASH_IMAGE}
        style={[
          styles.backgroundImage,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
        resizeMode="cover"
      />
      
      {/* Overlay gradient */}
      <View style={styles.overlay} />
      
      {/* Content */}
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.titleContainer,
            {
              opacity: titleFade,
              transform: [{ translateY: titleSlide }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.glowEffect,
              {
                opacity: glowAnim,
              },
            ]}
          />
          <Text style={styles.title}>Florárium</Text>
          <Text style={styles.titleAccent}>Mester</Text>
        </Animated.View>
        
        <Animated.Text
          style={[
            styles.subtitle,
            { opacity: subtitleFade },
          ]}
        >
          {t('splashSubtitle')}
        </Animated.Text>
      </View>
      
      {/* Decorative elements */}
      <Animated.View
        style={[
          styles.sparkle1,
          {
            opacity: Animated.multiply(glowAnim, 0.8),
          },
        ]}
      />
      <Animated.View
        style={[
          styles.sparkle2,
          {
            opacity: Animated.multiply(glowAnim, 0.6),
          },
        ]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a2810',
  },
  backgroundImage: {
    position: 'absolute',
    width: width,
    height: height,
  },
  overlay: {
    position: 'absolute',
    width: width,
    height: height,
    backgroundColor: 'rgba(0, 30, 10, 0.4)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  glowEffect: {
    position: 'absolute',
    width: 250,
    height: 100,
    backgroundColor: 'rgba(100, 255, 150, 0.15)',
    borderRadius: 50,
    top: -10,
  },
  title: {
    fontSize: 48,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: 2,
  },
  titleAccent: {
    fontSize: 52,
    fontWeight: '700',
    color: '#88ff99',
    marginTop: -8,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginTop: 10,
    letterSpacing: 1,
  },
  sparkle1: {
    position: 'absolute',
    top: '25%',
    right: '15%',
    width: 8,
    height: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  sparkle2: {
    position: 'absolute',
    bottom: '30%',
    left: '20%',
    width: 6,
    height: 6,
    backgroundColor: '#88ff99',
    borderRadius: 3,
  },
});

export default SplashScreen;
