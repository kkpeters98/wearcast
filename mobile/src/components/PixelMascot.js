import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

// ─── Animal head palettes ─────────────────────────────────────────────────────
const PALETTES = {
  dog:  { b: '#C9A96E', d: '#8B5E3C', w: '#fff', k: '#2d2d2d', n: '#e08070' },
  cat:  { b: '#F4A261', d: '#C67D48', w: '#fff', k: '#2d2d2d', n: '#f7c5b0' },
  frog: { b: '#56C568', d: '#2E8B57', w: '#fff', k: '#1a1a1a', n: '#a8f0a8' },
  cow:  { b: '#f0f0f0', d: '#2a2a2a', w: '#fff', k: '#1a1a1a', n: '#f9b8b8' },
};

// head grid: 0=transparent,1=body,2=dark,3=white,4=pupil,5=nose
function makeHead(rows, pal) {
  const m = [null, pal.b, pal.d, pal.w, pal.k, pal.n];
  return rows.map(r => r.map(v => m[v]));
}

// 6-row × 10-col heads
const HEADS = {
  dog: p => makeHead([
    [0,0,0,1,1,1,1,0,0,0],
    [0,2,0,1,1,1,1,0,2,0],
    [0,2,1,1,1,1,1,1,2,0],
    [0,2,1,3,4,1,3,4,2,0],
    [0,0,1,1,5,5,1,1,0,0],
    [0,0,1,1,1,1,1,1,0,0],
  ], p),
  cat: p => makeHead([
    [0,2,0,0,0,0,0,0,2,0],
    [0,2,1,0,0,0,0,1,2,0],
    [0,0,1,1,1,1,1,1,0,0],
    [0,0,1,3,4,1,3,4,1,0],
    [0,0,1,1,1,5,1,1,1,0],
    [0,0,0,1,1,1,1,0,0,0],
  ], p),
  frog: p => makeHead([
    [0,0,3,4,0,0,3,4,0,0],
    [0,1,1,1,1,1,1,1,1,0],
    [0,1,1,1,1,1,1,1,1,0],
    [0,0,1,1,1,1,1,1,0,0],
    [0,0,1,5,5,5,5,1,0,0],
    [0,0,1,1,1,1,1,1,0,0],
  ], p),
  cow: p => makeHead([
    [0,0,2,0,1,1,0,2,0,0],
    [0,0,1,1,1,1,1,1,0,0],
    [0,0,1,3,4,1,3,4,1,0],
    [0,0,2,1,1,1,1,2,1,0],
    [0,0,1,1,5,5,1,1,1,0],
    [0,0,0,1,1,1,1,0,0,0],
  ], p),
};

// ─── Clothing grids ───────────────────────────────────────────────────────────
// 0=transparent, 1=main, 2=shadow, 3=highlight, 4=detail(zipper/stripe)

const TOP_GRIDS = {
  tank: [
    [0,0,0,2,1,1,2,0,0,0],
    [0,0,1,1,1,1,1,1,0,0],
    [0,0,1,1,1,1,1,1,0,0],
    [0,0,1,1,1,1,1,1,0,0],
  ],
  tshirt: [
    [0,1,1,2,1,1,2,1,1,0],
    [0,1,1,1,1,1,1,1,1,0],
    [0,0,1,1,1,1,1,1,0,0],
    [0,0,1,1,1,1,1,1,0,0],
  ],
  longsleeve: [
    [1,1,1,2,1,1,2,1,1,1],
    [1,1,1,1,1,1,1,1,1,1],
    [0,1,1,1,1,1,1,1,1,0],
    [0,0,1,1,1,1,1,1,0,0],
  ],
  sweater: [
    [1,1,1,2,2,2,2,1,1,1],
    [1,1,1,1,1,1,1,1,1,1],
    [0,1,1,1,1,1,1,1,1,0],
    [0,0,1,1,1,1,1,1,0,0],
  ],
  jacket: [
    [1,1,2,2,1,1,2,2,1,1],
    [1,1,2,1,4,4,1,2,1,1],
    [0,1,1,1,4,4,1,1,1,0],
    [0,1,1,1,4,4,1,1,1,0],
  ],
  wintercoat: [
    [2,2,2,2,1,1,2,2,2,2],
    [1,1,1,2,4,4,2,1,1,1],
    [1,1,1,1,4,4,1,1,1,1],
    [0,1,1,1,4,4,1,1,1,0],
  ],
  rainjacket: [
    [1,1,1,1,2,2,1,1,1,1],
    [1,2,1,1,4,4,1,1,2,1],
    [0,1,1,1,4,4,1,1,1,0],
    [0,1,1,1,4,4,1,1,1,0],
  ],
  blazer: [
    [1,1,2,2,1,1,2,2,1,1],
    [1,1,2,1,3,3,1,2,1,1],
    [0,1,1,1,3,3,1,1,1,0],
    [0,1,1,1,3,3,1,1,1,0],
  ],
  athletic: [
    [0,1,1,2,1,1,2,1,1,0],
    [0,1,4,1,1,1,1,4,1,0],
    [0,0,1,1,1,1,1,1,0,0],
    [0,0,1,1,1,1,1,1,0,0],
  ],
};

const BOTTOM_GRIDS = {
  shorts: [
    [0,0,1,1,2,2,1,1,0,0],
    [0,0,1,0,0,0,0,1,0,0],
    [0,0,0,0,0,0,0,0,0,0],
  ],
  jeans: [
    [0,0,1,1,2,2,1,1,0,0],
    [0,0,1,1,0,0,1,1,0,0],
    [0,0,1,0,0,0,0,1,0,0],
  ],
  dresspants: [
    [0,0,1,1,2,2,1,1,0,0],
    [0,0,1,1,0,0,1,1,0,0],
    [0,0,1,0,0,0,0,1,0,0],
  ],
  athleticshorts: [
    [0,0,1,1,4,4,1,1,0,0],
    [0,0,1,0,0,0,0,1,0,0],
    [0,0,0,0,0,0,0,0,0,0],
  ],
};

const SHOE_GRIDS = {
  sandals: [
    [0,0,0,1,0,0,1,0,0,0],
    [0,1,1,1,0,0,1,1,1,0],
  ],
  sneakers: [
    [0,0,1,1,0,0,1,1,0,0],
    [0,2,2,2,0,0,2,2,2,0],
  ],
  boots: [
    [0,1,1,1,0,0,1,1,1,0],
    [0,2,2,2,0,0,2,2,2,0],
  ],
  dressshoes: [
    [0,0,1,1,1,0,1,1,0,0],
    [0,1,1,1,1,0,1,1,1,0],
  ],
};

// ─── Clothing color maps ──────────────────────────────────────────────────────
// keys: 1=main, 2=shadow, 3=highlight/shirt-showing, 4=zipper/detail
const CLOTH_COLORS = {
  tank_hot:         { 1:'#FFB347', 2:'#CC8B30' },
  tshirt_warm:      { 1:'#87CEEB', 2:'#5BA3C9' },
  longsleeve_mild:  { 1:'#7EB8D3', 2:'#4A90B8' },
  sweater_cool:     { 1:'#CC7744', 2:'#994422' },
  jacket_cold:      { 1:'#5a5a6a', 2:'#3a3a4a', 4:'#888' },
  wintercoat_freez: { 1:'#1a237e', 2:'#0d1450', 4:'#555' },
  rainjacket_rain:  { 1:'#008B8B', 2:'#006060', 4:'#aaa' },
  wintercoat_snow:  { 1:'#6A5ACD', 2:'#483D8B', 4:'#888' },
  blazer_formal:    { 1:'#1a1a2e', 2:'#0d0d1a', 3:'#e8e8e8', 4:'#fff' },
  athletic_sport:   { 1:'#e53935', 2:'#b71c1c', 4:'#fff' },

  shorts_hot:       { 1:'#87CEEB', 2:'#5BA3C9' },
  shorts_warm:      { 1:'#C8A96E', 2:'#9A7848' },
  jeans:            { 1:'#4169E1', 2:'#2A4FAD' },
  dresspants:       { 1:'#2a2a3e', 2:'#1a1a2e' },
  athleticshorts:   { 1:'#1a237e', 2:'#0d1450', 4:'#fff' },

  sandals:          { 1:'#D2B48C', 2:'#A0866A' },
  sneakers:         { 1:'#f0f0f0', 2:'#aaa' },
  boots_cold:       { 1:'#5D3A1A', 2:'#3A2010' },
  boots_winter:     { 1:'#2a2a2a', 2:'#111' },
  dressshoes:       { 1:'#1a1a1a', 2:'#000' },
};

// ─── Outfit type → clothing items + colors ────────────────────────────────────
const OUTFITS = {
  hot:      { top:'tank',       topC:'tank_hot',        bot:'shorts',       botC:'shorts_hot',  shoe:'sandals',   shoeC:'sandals' },
  warm:     { top:'tshirt',     topC:'tshirt_warm',     bot:'shorts',       botC:'shorts_warm', shoe:'sneakers',  shoeC:'sneakers' },
  mild:     { top:'longsleeve', topC:'longsleeve_mild', bot:'jeans',        botC:'jeans',       shoe:'sneakers',  shoeC:'sneakers' },
  cool:     { top:'sweater',    topC:'sweater_cool',    bot:'jeans',        botC:'jeans',       shoe:'sneakers',  shoeC:'sneakers' },
  cold:     { top:'jacket',     topC:'jacket_cold',     bot:'jeans',        botC:'jeans',       shoe:'boots',     shoeC:'boots_cold' },
  freezing: { top:'wintercoat', topC:'wintercoat_freez',bot:'jeans',        botC:'jeans',       shoe:'boots',     shoeC:'boots_winter' },
  rain:     { top:'rainjacket', topC:'rainjacket_rain', bot:'jeans',        botC:'jeans',       shoe:'boots',     shoeC:'boots_winter' },
  snow:     { top:'wintercoat', topC:'wintercoat_snow', bot:'jeans',        botC:'jeans',       shoe:'boots',     shoeC:'boots_winter' },
  formal:   { top:'blazer',     topC:'blazer_formal',   bot:'dresspants',   botC:'dresspants',  shoe:'dressshoes',shoeC:'dressshoes' },
  athletic: { top:'athletic',   topC:'athletic_sport',  bot:'athleticshorts',botC:'athleticshorts',shoe:'sneakers',shoeC:'sneakers' },
};

function getOutfitType(weather, eventType) {
  if (eventType === 'formal')   return 'formal';
  if (eventType === 'athletic') return 'athletic';
  const temp = weather?.temperature ?? 68;
  const code = weather?.weathercode ?? 0;
  const isSnow  = (code >= 71 && code <= 77) || code === 85 || code === 86;
  const isRain  = (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
  if (isSnow)       return 'snow';
  if (isRain)       return 'rain';
  if (temp >= 82)   return 'hot';
  if (temp >= 70)   return 'warm';
  if (temp >= 57)   return 'mild';
  if (temp >= 44)   return 'cool';
  if (temp >= 28)   return 'cold';
  return 'freezing';
}

// ─── Render helpers ───────────────────────────────────────────────────────────
function renderGrid(rows, ps) {
  return rows.map((row, ri) => (
    <View key={ri} style={{ flexDirection: 'row' }}>
      {row.map((color, ci) => (
        <View key={ci} style={{ width: ps, height: ps, backgroundColor: color || 'transparent' }} />
      ))}
    </View>
  ));
}

function applyClothColors(grid, colorKey) {
  const cmap = CLOTH_COLORS[colorKey] || {};
  return grid.map(row => row.map(v => v === 0 ? null : cmap[v] || '#ccc'));
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PixelMascot({ animal = 'dog', weather = null, eventType = 'casual', pixelSize = 5 }) {
  const pal     = PALETTES[animal] || PALETTES.dog;
  const headFn  = HEADS[animal]    || HEADS.dog;
  const headRows = headFn(pal);

  const outfitType = getOutfitType(weather, eventType);
  const outfit     = OUTFITS[outfitType] || OUTFITS.mild;

  const topRows  = applyClothColors(TOP_GRIDS[outfit.top]    || TOP_GRIDS.tshirt,    outfit.topC);
  const botRows  = applyClothColors(BOTTOM_GRIDS[outfit.bot] || BOTTOM_GRIDS.jeans,  outfit.botC);
  const shoeRows = applyClothColors(SHOE_GRIDS[outfit.shoe]  || SHOE_GRIDS.sneakers, outfit.shoeC);

  const totalRows = headRows.length + topRows.length + botRows.length + shoeRows.length;
  const W = pixelSize * 10;
  const H = pixelSize * totalRows;

  const bounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -pixelSize, duration: 500, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0,           duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ translateY: bounce }], width: W, height: H }}>
      {renderGrid(headRows, pixelSize)}
      {renderGrid(topRows,  pixelSize)}
      {renderGrid(botRows,  pixelSize)}
      {renderGrid(shoeRows, pixelSize)}
    </Animated.View>
  );
}
