import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { t } from '../i18n';

const CARDS = [
  { key: 'Forecast', icon: 'partly-sunny-outline', color: '#6c63ff', bg: '#f0eeff', labelKey: 'forecastFit', descKey: 'forecastFitDesc' },
  { key: 'Trip',     icon: 'bag-outline',           color: '#ff6b6b', bg: '#fff5f5', labelKey: 'planTrip',    descKey: 'planTripDesc' },
  { key: 'Saved',    icon: 'bookmark-outline',      color: '#43a047', bg: '#f0fff4', labelKey: 'savedOutfits',descKey: 'savedOutfitsDesc' },
];

export default function HomeScreen({ navigation, lang }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{t(lang, 'appName')}</Text>
            <Text style={styles.tagline}>{t(lang, 'appTagline')}</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
            <Ionicons name="person-outline" size={20} color="#6c63ff" />
          </TouchableOpacity>
        </View>

        <View style={styles.cards}>
          {CARDS.map(card => (
            <TouchableOpacity
              key={card.key}
              style={styles.card}
              onPress={() => navigation.navigate(card.key)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrap, { backgroundColor: card.bg }]}>
                <Ionicons name={card.icon} size={26} color={card.color} />
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardLabel, { color: card.color }]}>{t(lang, card.labelKey)}</Text>
                <Text style={styles.cardDesc}>{t(lang, card.descKey)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f7ff' },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 48 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 },
  title: { fontSize: 36, fontWeight: '800', color: '#1a1a1a', letterSpacing: -1 },
  tagline: { fontSize: 14, color: '#aaa', marginTop: 6 },
  profileBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0eeff', alignItems: 'center', justifyContent: 'center' },
  cards: { gap: 14 },
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  iconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  cardDesc: { fontSize: 13, color: '#aaa' },
});
