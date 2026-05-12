import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { loadSaved, deleteSaved } from '../storage';
import { t } from '../i18n';

const PACKING_ICONS = {
  tops: 'shirt-outline', bottoms: 'layers-outline', underwear: 'refresh-outline',
  jackets: 'cloud-outline', shoes: 'footsteps-outline', accessories: 'glasses-outline',
};

export default function SavedScreen({ lang }) {
  const [items, setItems] = useState([]);

  useFocusEffect(useCallback(() => { loadSaved().then(setItems); }, []));

  const remove = (id) => {
    Alert.alert('', t(lang, 'deleteConfirm'), [
      { text: t(lang, 'cancel'), style: 'cancel' },
      { text: t(lang, 'delete'), style: 'destructive', onPress: async () => {
        setItems(await deleteSaved(id));
      }},
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.badge, item.type === 'trip' ? styles.tripBadge : styles.outfitBadge]}>
          <Ionicons name={item.type === 'trip' ? 'bag-outline' : 'partly-sunny-outline'} size={12} color={item.type === 'trip' ? '#ff6b6b' : '#6c63ff'} style={{ marginRight: 4 }} />
          <Text style={[styles.badgeText, item.type === 'trip' ? { color: '#ff6b6b' } : { color: '#6c63ff' }]}>
            {item.type === 'trip' ? t(lang, 'trip') : t(lang, 'outfit')}
          </Text>
        </View>
        <TouchableOpacity onPress={() => remove(item.id)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Ionicons name="close-circle-outline" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      <Text style={styles.location}>{item.location}</Text>

      {item.type === 'outfit' ? (
        <>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={13} color="#bbb" style={{ marginRight: 4 }} />
            <Text style={styles.metaText}>{item.date}{item.timeBlock ? ` · ${item.timeBlock}` : ''}{item.eventType ? ` · ${item.eventType}` : ''}</Text>
          </View>
          {item.weather && (
            <View style={styles.metaRow}>
              <Ionicons name="thermometer-outline" size={13} color="#bbb" style={{ marginRight: 4 }} />
              <Text style={styles.metaText}>{Math.round(item.weather.temperature)}°F · {item.weather.windspeed} mph</Text>
            </View>
          )}
          <Text style={styles.outfitText} numberOfLines={4}>{item.outfit}</Text>
        </>
      ) : (
        <>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={13} color="#bbb" style={{ marginRight: 4 }} />
            <Text style={styles.metaText}>{item.date} – {item.returnDate} · {item.days} {t(lang, 'days')}</Text>
          </View>
          {item.packing && (
            <View style={styles.packingGrid}>
              {Object.entries(item.packing).map(([key, items]) => (
                <View key={key} style={styles.packingCell}>
                  <Ionicons name={PACKING_ICONS[key] || 'list-outline'} size={14} color="#6c63ff" />
                  <Text style={styles.packingCount}>{Array.isArray(items) ? items.length : items}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.heading}>{t(lang, 'savedOutfits')}</Text>
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="bookmark-outline" size={48} color="#e0e0e0" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>{t(lang, 'noSaved')}</Text>
            <Text style={styles.emptySub}>{t(lang, 'noSavedSub')}</Text>
          </View>
        ) : (
          <FlatList data={items} keyExtractor={i => i.id} renderItem={renderItem} contentContainerStyle={{ paddingBottom: 40 }} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7fff8' },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  heading: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 20 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 80 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#ccc', marginBottom: 6 },
  emptySub: { fontSize: 14, color: '#ddd' },
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  outfitBadge: { backgroundColor: '#f0eeff' },
  tripBadge: { backgroundColor: '#fff5f5' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  location: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  metaText: { fontSize: 12, color: '#bbb' },
  outfitText: { fontSize: 14, lineHeight: 22, color: '#555', marginTop: 6 },
  packingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  packingCell: { alignItems: 'center', gap: 3 },
  packingCount: { fontSize: 12, fontWeight: '700', color: '#ff6b6b' },
});
