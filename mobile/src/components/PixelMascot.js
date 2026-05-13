import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

const T = null;

// ─── Color palettes ───────────────────────────────────────────────────────────
const p = {
  // dog: golden retriever
  dog: { b:'#C9A96E', d:'#9B7843', w:'#fff', k:'#2d2d2d', n:'#e08070' },
  // cat: orange tabby
  cat: { b:'#F4A261', d:'#C67D48', w:'#fff', k:'#2d2d2d', n:'#f7c5b0' },
  // frog: tree frog
  frog:{ b:'#56C568', d:'#2E8B57', w:'#fff', k:'#1a1a1a', n:'#d4f5d4' },
  // cow: dairy
  cow: { b:'#f5f5f5', d:'#333',   w:'#fff', k:'#1a1a1a', n:'#f9b8b8' },
};

// ─── Pixel grids (10×10) ─────────────────────────────────────────────────────
function grid(a, { b, d, w, k, n }) {
  // a: 2D array where 0=T, 1=b, 2=d, 3=w, 4=k, 5=n
  const m = [T, b, d, w, k, n];
  return a.map(row => row.map(v => m[v]));
}

const GRIDS = {
  dog: (c) => grid([
    [0,0,2,1,1,1,1,1,2,0],
    [0,2,1,1,1,1,1,1,1,2],
    [0,1,1,3,4,1,3,4,1,1],
    [0,1,1,1,1,1,1,1,1,1],
    [0,2,1,2,5,5,2,1,2,0],
    [0,0,1,1,1,1,1,1,0,0],
    [0,0,2,1,1,1,1,2,0,0],
    [0,0,1,1,0,0,1,1,0,0],
    [0,0,1,0,0,0,0,1,0,0],
    [0,0,0,0,0,0,0,0,0,0],
  ], c),

  cat: (c) => grid([
    [0,2,1,0,0,0,0,0,1,2],
    [0,1,1,1,1,1,1,1,1,0],
    [0,1,3,4,1,1,3,4,1,0],
    [0,1,1,1,5,1,1,1,1,0],
    [0,1,1,5,5,5,1,1,1,0],
    [0,0,1,1,1,1,1,1,0,0],
    [0,0,1,2,1,1,2,1,0,0],
    [0,0,0,1,1,1,1,0,0,0],
    [0,0,0,1,0,0,1,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
  ], c),

  frog: (c) => grid([
    [0,0,2,1,0,0,1,2,0,0],
    [0,2,1,1,1,1,1,1,2,0],
    [0,1,3,4,1,1,3,4,1,0],
    [0,1,1,1,1,1,1,1,1,0],
    [0,1,5,5,5,5,5,5,1,0],
    [0,1,5,1,5,5,1,5,1,0],
    [0,0,1,1,1,1,1,1,0,0],
    [0,1,1,0,0,0,0,1,1,0],
    [0,1,0,0,0,0,0,0,1,0],
    [0,0,0,0,0,0,0,0,0,0],
  ], c),

  cow: (c) => grid([
    [0,0,2,1,1,1,1,1,2,0],
    [0,2,1,1,2,1,2,1,1,2],
    [0,1,1,3,4,1,3,4,1,1],
    [0,1,2,1,1,1,1,1,2,1],
    [0,1,1,5,5,5,5,1,1,0],
    [0,0,1,1,1,1,1,1,0,0],
    [0,0,1,1,0,0,1,1,0,0],
    [0,0,1,0,0,0,0,1,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
  ], c),
};

// ─── Accessories (overlays) ───────────────────────────────────────────────────
const ACCESSORY_COLORS = {
  scarf:     '#e05252',
  glasses:   '#2d2d2d',
  umbrella:  '#6c63ff',
  bowtie:    '#1a1a1a',
  sweatband: '#ff6b6b',
};

// Which accessory to show based on conditions
function getAccessory(weather, eventType) {
  if (!weather) return null;
  if (eventType === 'formal')   return 'bowtie';
  if (eventType === 'athletic') return 'sweatband';
  const temp = weather.temperature ?? 99;
  const code = weather.weathercode ?? 0;
  const isRainy = (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
  if (isRainy)  return 'umbrella';
  if (temp < 45) return 'scarf';
  if (temp > 75) return 'glasses';
  return null;
}

function AccessoryLayer({ type, pixelSize, rows }) {
  const c = ACCESSORY_COLORS[type] || '#888';
  if (type === 'glasses') return (
    <View style={[styles.overlay, { top: pixelSize * 2.5 }]} pointerEvents="none">
      <View style={{ flexDirection: 'row', gap: pixelSize * 0.5 }}>
        {[0,1,2,3,4,5,6,7,8,9].map(i => (
          <View key={i} style={{ width: pixelSize, height: pixelSize,
            backgroundColor: (i===2||i===3||i===6||i===7) ? c : 'transparent' }} />
        ))}
      </View>
    </View>
  );
  if (type === 'scarf') return (
    <View style={[styles.overlay, { top: pixelSize * 5 }]} pointerEvents="none">
      {[0,1].map(r => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {[0,1,2,3,4,5,6,7,8,9].map(i => (
            <View key={i} style={{ width: pixelSize, height: pixelSize,
              backgroundColor: (i>=2&&i<=7) ? (r===0?'#e05252':'#c43b3b') : 'transparent' }} />
          ))}
        </View>
      ))}
    </View>
  );
  if (type === 'umbrella') return (
    <View style={[styles.overlay, { top: -pixelSize * 2 }]} pointerEvents="none">
      <View style={{ flexDirection: 'row' }}>
        {[0,1,2,3,4,5,6,7,8,9].map(i => (
          <View key={i} style={{ width: pixelSize, height: pixelSize,
            backgroundColor: (i>=1&&i<=8) ? c : 'transparent' }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row' }}>
        {[0,1,2,3,4,5,6,7,8,9].map(i => (
          <View key={i} style={{ width: pixelSize, height: pixelSize,
            backgroundColor: (i===0||i===3||i===6||i===9) ? c : 'transparent' }} />
        ))}
      </View>
    </View>
  );
  if (type === 'bowtie') return (
    <View style={[styles.overlay, { top: pixelSize * 5.5 }]} pointerEvents="none">
      <View style={{ flexDirection: 'row' }}>
        {[0,1,2,3,4,5,6,7,8,9].map(i => (
          <View key={i} style={{ width: pixelSize, height: pixelSize,
            backgroundColor: (i>=3&&i<=6) ? c : 'transparent' }} />
        ))}
      </View>
    </View>
  );
  if (type === 'sweatband') return (
    <View style={[styles.overlay, { top: 0 }]} pointerEvents="none">
      <View style={{ flexDirection: 'row' }}>
        {[0,1,2,3,4,5,6,7,8,9].map(i => (
          <View key={i} style={{ width: pixelSize, height: pixelSize,
            backgroundColor: (i>=2&&i<=7) ? c : 'transparent' }} />
        ))}
      </View>
    </View>
  );
  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PixelMascot({ animal = 'dog', weather = null, eventType = 'casual', pixelSize = 8 }) {
  const palette = p[animal] || p.dog;
  const gridFn  = GRIDS[animal]  || GRIDS.dog;
  const rows    = gridFn(palette);
  const accessory = getAccessory(weather, eventType);

  const bounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -pixelSize, duration: 480, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0,           duration: 480, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ translateY: bounce }] }}>
      <View style={{ position: 'relative', width: pixelSize * 10, height: pixelSize * 10 }}>
        {/* Base pixel art */}
        {rows.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row' }}>
            {row.map((color, ci) => (
              <View
                key={ci}
                style={{ width: pixelSize, height: pixelSize, backgroundColor: color || 'transparent' }}
              />
            ))}
          </View>
        ))}
        {/* Accessory overlay */}
        {accessory && (
          <AccessoryLayer type={accessory} pixelSize={pixelSize} rows={10} />
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', left: 0, right: 0 },
});
