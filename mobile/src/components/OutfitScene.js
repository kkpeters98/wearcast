import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─── Weather scene config ─────────────────────────────────────────────────────
const SCENES = {
  hot:      { bg: '#F97316', icon: 'sunny-outline',        fx: 'sun'  },
  warm:     { bg: '#3B82F6', icon: 'partly-sunny-outline', fx: null   },
  mild:     { bg: '#60A5FA', icon: 'partly-sunny-outline', fx: null   },
  cool:     { bg: '#6366F1', icon: 'cloud-outline',        fx: null   },
  cold:     { bg: '#1E3A5F', icon: 'cloud-outline',        fx: null   },
  freezing: { bg: '#1E3799', icon: 'snow-outline',         fx: 'snow' },
  rain:     { bg: '#475569', icon: 'rainy-outline',        fx: 'rain' },
  snow:     { bg: '#64748B', icon: 'snow-outline',         fx: 'snow' },
  formal:   { bg: '#1E293B', icon: 'moon-outline',         fx: null   },
  athletic: { bg: '#059669', icon: 'sunny-outline',        fx: 'sun'  },
};

// ─── Outfit items per condition ───────────────────────────────────────────────
const ITEMS = {
  hot:      { top: ['Tank Top',      '#FFB347'], bot: ['Shorts',       '#87CEEB'], shoe: ['Sandals',       '#D2B48C'] },
  warm:     { top: ['T-Shirt',       '#87CEEB'], bot: ['Shorts',       '#C8A96E'], shoe: ['Sneakers',      '#e8e8e8'] },
  mild:     { top: ['Long Sleeve',   '#7EB8D3'], bot: ['Jeans',        '#4169E1'], shoe: ['Sneakers',      '#e8e8e8'] },
  cool:     { top: ['Sweater',       '#CC7744'], bot: ['Jeans',        '#4169E1'], shoe: ['Sneakers',      '#e8e8e8'] },
  cold:     { top: ['Jacket',        '#4B5563'], bot: ['Jeans',        '#4169E1'], shoe: ['Ankle Boots',   '#6B4226'] },
  freezing: { top: ['Winter Coat',   '#1E3A8A'], bot: ['Jeans',        '#4169E1'], shoe: ['Winter Boots',  '#374151'] },
  rain:     { top: ['Rain Jacket',   '#0D9488'], bot: ['Jeans',        '#4169E1'], shoe: ['Rain Boots',    '#1F2937'] },
  snow:     { top: ['Parka',         '#7C3AED'], bot: ['Jeans',        '#4169E1'], shoe: ['Snow Boots',    '#374151'] },
  formal:   { top: ['Blazer',        '#1E293B'], bot: ['Dress Pants',  '#334155'], shoe: ['Dress Shoes',   '#0F172A'] },
  athletic: { top: ['Athletic Top',  '#EF4444'], bot: ['Shorts',       '#1E3A8A'], shoe: ['Running Shoes', '#F8FAFC'] },
};

export function getOutfitType(weather, eventType) {
  if (eventType === 'formal')   return 'formal';
  if (eventType === 'athletic') return 'athletic';
  const temp = weather?.temperature ?? 68;
  const code = weather?.weathercode ?? 0;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if (temp >= 82) return 'hot';
  if (temp >= 70) return 'warm';
  if (temp >= 57) return 'mild';
  if (temp >= 44) return 'cool';
  if (temp >= 28) return 'cold';
  return 'freezing';
}

// ─── Weather effect: falling rain or snow ─────────────────────────────────────
function WeatherFX({ type }) {
  const count = 7;
  const anims = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;

  useEffect(() => {
    anims.forEach((a, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(a, { toValue: 1, duration: type === 'rain' ? 700 : 1800, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {anims.map((a, i) => {
        const left = 10 + i * 13;
        const ty = a.interpolate({ inputRange: [0, 1], outputRange: [0, 70] });
        return (
          <Animated.Text
            key={i}
            style={{
              position: 'absolute',
              left,
              top: 8,
              color: 'rgba(255,255,255,0.55)',
              fontSize: type === 'snow' ? 12 : 10,
              transform: [{ translateY: ty }],
              opacity: a,
            }}
          >
            {type === 'rain' ? '|' : '✦'}
          </Animated.Text>
        );
      })}
    </View>
  );
}

// ─── Sun pulse ────────────────────────────────────────────────────────────────
function SunFX() {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.12, duration: 1200, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,    duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{ position: 'absolute', top: 16, right: 20, transform: [{ scale }] }}>
      <Ionicons name="sunny-outline" size={36} color="rgba(255,255,255,0.4)" />
    </Animated.View>
  );
}

// ─── Clothing chip ────────────────────────────────────────────────────────────
function ClothingChip({ label, color }) {
  return (
    <View style={s.chip}>
      <View style={[s.swatch, { backgroundColor: color }]} />
      <Text style={s.chipLabel}>{label}</Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OutfitScene({ weather, eventType = 'casual' }) {
  const type   = getOutfitType(weather, eventType);
  const scene  = SCENES[type]  || SCENES.mild;
  const items  = ITEMS[type]   || ITEMS.mild;

  return (
    <View style={s.wrap}>
      {/* Sky card */}
      <View style={[s.sky, { backgroundColor: scene.bg }]}>
        {scene.fx === 'rain' && <WeatherFX type="rain" />}
        {scene.fx === 'snow' && <WeatherFX type="snow" />}
        {scene.fx === 'sun'  && <SunFX />}
        <Ionicons name={scene.icon} size={52} color="rgba(255,255,255,0.9)" />
      </View>

      {/* Outfit chips */}
      <View style={s.chips}>
        <ClothingChip label={items.top[0]}  color={items.top[1]}  />
        <ClothingChip label={items.bot[0]}  color={items.bot[1]}  />
        <ClothingChip label={items.shoe[0]} color={items.shoe[1]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 16 },
  sky: {
    height: 100,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 10,
  },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 7,
  },
  swatch: { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  chipLabel: { fontSize: 12, fontWeight: '600', color: '#333', flexShrink: 1 },
});
