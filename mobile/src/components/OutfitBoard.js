import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getOutfitType } from './OutfitScene';

// Ionicons that work well as clothing proxies
const CATEGORY_ICONS = {
  top:  'shirt-outline',
  bot:  'man-outline',
  shoe: 'footsteps-outline',
};

const ITEMS = {
  hot:      { top: ['Tank Top',      '#FFB347'], bot: ['Shorts',       '#87CEEB'], shoe: ['Sandals',       '#D2B48C'] },
  warm:     { top: ['T-Shirt',       '#87CEEB'], bot: ['Shorts',       '#C8A96E'], shoe: ['Sneakers',      '#555']    },
  mild:     { top: ['Long Sleeve',   '#7EB8D3'], bot: ['Jeans',        '#4169E1'], shoe: ['Sneakers',      '#555']    },
  cool:     { top: ['Sweater',       '#CC7744'], bot: ['Jeans',        '#4169E1'], shoe: ['Sneakers',      '#555']    },
  cold:     { top: ['Jacket',        '#4B5563'], bot: ['Jeans',        '#4169E1'], shoe: ['Ankle Boots',   '#6B4226'] },
  freezing: { top: ['Winter Coat',   '#1E3A8A'], bot: ['Jeans',        '#4169E1'], shoe: ['Winter Boots',  '#374151'] },
  rain:     { top: ['Rain Jacket',   '#0D9488'], bot: ['Jeans',        '#4169E1'], shoe: ['Rain Boots',    '#1F2937'] },
  snow:     { top: ['Parka',         '#7C3AED'], bot: ['Jeans',        '#4169E1'], shoe: ['Snow Boots',    '#374151'] },
  formal:   { top: ['Blazer',        '#1E293B'], bot: ['Dress Pants',  '#334155'], shoe: ['Dress Shoes',   '#0F172A'] },
  athletic: { top: ['Athletic Top',  '#EF4444'], bot: ['Shorts',       '#1E3A8A'], shoe: ['Running Shoes', '#e0e0e0'] },
};

function ItemCard({ catKey, label, color }) {
  return (
    <View style={s.card}>
      <View style={[s.iconCircle, { backgroundColor: color + '22' }]}>
        <Ionicons name={CATEGORY_ICONS[catKey]} size={26} color={color} />
      </View>
      <View style={[s.colorBar, { backgroundColor: color }]} />
      <Text style={s.itemLabel}>{label}</Text>
    </View>
  );
}

export default function OutfitBoard({ weather, eventType = 'casual' }) {
  const type  = getOutfitType(weather, eventType);
  const items = ITEMS[type] || ITEMS.mild;

  return (
    <View style={s.row}>
      <ItemCard catKey="top"  label={items.top[0]}  color={items.top[1]}  />
      <ItemCard catKey="bot"  label={items.bot[0]}  color={items.bot[1]}  />
      <ItemCard catKey="shoe" label={items.shoe[0]} color={items.shoe[1]} />
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  colorBar: {
    width: '60%',
    height: 3,
    borderRadius: 2,
    marginBottom: 6,
  },
  itemLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
});
