import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import LocationInput from '../components/LocationInput';
import { fetchTrip } from '../api';
import { addSaved } from '../storage';
import { t } from '../i18n';

const TRIP_TYPES = [
  { key: 'leisure',  label: 'Leisure',  icon: 'sunny-outline' },
  { key: 'business', label: 'Business', icon: 'briefcase-outline' },
  { key: 'beach',    label: 'Beach',    icon: 'umbrella-outline' },
  { key: 'adventure',label: 'Adventure',icon: 'trail-sign-outline' },
  { key: 'family',   label: 'Family',   icon: 'people-outline' },
];

const DURATIONS = [1, 2, 3, 4, 5, 6, 7, 10, 14];

function buildDays() {
  const days = [];
  const now = new Date();
  for (let i = 0; i < 10; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const iso = d.toISOString().split('T')[0];
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    days.push({ iso, label: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : weekday, sub: monthDay });
  }
  return days;
}
const DAYS = buildDays();

const PACKING_SECTIONS = [
  { key: 'tops',        label: 'Tops',                    icon: 'shirt-outline' },
  { key: 'bottoms',     label: 'Bottoms',                 icon: 'layers-outline' },
  { key: 'underwear',   label: 'Underwear & Socks',       icon: 'refresh-outline' },
  { key: 'jackets',     label: 'Jackets & Layers',        icon: 'cloud-outline' },
  { key: 'shoes',       label: 'Shoes',                   icon: 'footsteps-outline' },
  { key: 'accessories', label: 'Accessories',             icon: 'glasses-outline' },
];

function addDays(isoDate, n) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + n - 1);
  return d.toISOString().split('T')[0];
}

function fmtDate(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function TripScreen({ lang, profile }) {
  const [location, setLocation]     = useState('');
  const [departing, setDeparting]   = useState(DAYS[0].iso);
  const [duration, setDuration]     = useState(5);
  const [tripType, setTripType]     = useState('leisure');
  const [tempSens, setTempSens]     = useState(profile?.tempSensitivity ?? 0);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState('');
  const [justSaved, setJustSaved]   = useState(false);

  useEffect(() => {
    if (profile?.tempSensitivity != null) setTempSens(profile.tempSensitivity);
  }, [profile]);

  const returnDate = addDays(departing, duration);

  const plan = async () => {
    if (!location.trim()) { setError(t(lang, 'errorLocation')); return; }
    setLoading(true); setError(''); setResult(null); setJustSaved(false);
    try {
      const data = await fetchTrip({
        location: location.trim(),
        startDate: departing,
        endDate: returnDate,
        tempSensitivity: tempSens,
        tripType,
      });
      setResult(data);
    } catch (e) {
      setError(e.message.includes('not found') ? t(lang, 'errorLocation') : t(lang, 'errorWeather'));
    }
    setLoading(false);
  };

  const save = async () => {
    if (!result) return;
    await addSaved({
      type: 'trip',
      location: location.trim(),
      date: departing,
      returnDate,
      packing: result.packing,
      days: duration,
      tripType,
    });
    setJustSaved(true);
  };

  const durIdx = DURATIONS.indexOf(duration);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text style={styles.heading}>{t(lang, 'planTrip')}</Text>

        {/* Destination */}
        <Text style={styles.label}>{t(lang, 'tripDestination')}</Text>
        <LocationInput value={location} onChange={setLocation} placeholder={t(lang, 'locationPlaceholder')} lang={lang} />

        {/* Departure date */}
        <Text style={[styles.label, { marginTop: 22 }]}>{t(lang, 'departureDate')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
          {DAYS.map(d => (
            <TouchableOpacity
              key={d.iso}
              style={[styles.dayChip, departing === d.iso && styles.dayChipActive]}
              onPress={() => setDeparting(d.iso)}
            >
              <Text style={[styles.dayLabel, departing === d.iso && styles.dayLabelActive]}>{d.label}</Text>
              <Text style={[styles.daySub, departing === d.iso && styles.daySubActive]}>{d.sub}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Duration */}
        <Text style={[styles.label, { marginTop: 22 }]}>Trip length</Text>
        <View style={styles.durationRow}>
          <TouchableOpacity
            style={styles.durBtn}
            disabled={durIdx === 0}
            onPress={() => setDuration(DURATIONS[durIdx - 1])}
          >
            <Ionicons name="remove" size={20} color={durIdx === 0 ? '#ccc' : ACCENT} />
          </TouchableOpacity>
          <View style={styles.durDisplay}>
            <Text style={styles.durNumber}>{duration}</Text>
            <Text style={styles.durLabel}>{t(lang, 'days')}</Text>
          </View>
          <TouchableOpacity
            style={styles.durBtn}
            disabled={durIdx === DURATIONS.length - 1}
            onPress={() => setDuration(DURATIONS[durIdx + 1])}
          >
            <Ionicons name="add" size={20} color={durIdx === DURATIONS.length - 1 ? '#ccc' : ACCENT} />
          </TouchableOpacity>
          <View style={styles.returnRow}>
            <Ionicons name="calendar-outline" size={14} color="#aaa" style={{ marginRight: 4 }} />
            <Text style={styles.returnText}>Returns {fmtDate(returnDate)}</Text>
          </View>
        </View>

        {/* Trip type */}
        <Text style={[styles.label, { marginTop: 22 }]}>Trip type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
          {TRIP_TYPES.map(tp => (
            <TouchableOpacity
              key={tp.key}
              style={[styles.typeChip, tripType === tp.key && styles.typeChipActive]}
              onPress={() => setTripType(tp.key)}
            >
              <Ionicons name={tp.icon} size={18} color={tripType === tp.key ? ACCENT : '#aaa'} style={{ marginBottom: 4 }} />
              <Text style={[styles.typeLabel, tripType === tp.key && styles.typeLabelActive]}>{tp.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Temperature slider */}
        <Text style={[styles.label, { marginTop: 22 }]}>{t(lang, 'temperaturePref')}</Text>
        <View style={styles.sliderRow}>
          <Ionicons name="thermometer-outline" size={20} color="#6c63ff" />
          <Slider
            style={styles.slider}
            minimumValue={-3} maximumValue={3} step={1}
            value={tempSens} onValueChange={setTempSens}
            minimumTrackTintColor={ACCENT} maximumTrackTintColor="#e0e0e0"
            thumbTintColor={ACCENT}
          />
          <Ionicons name="thermometer" size={20} color="#e05252" />
        </View>

        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={plan} disabled={loading}>
          {loading
            ? <Text style={styles.btnText}>{t(lang, 'loading')}</Text>
            : <View style={styles.btnInner}>
                <Ionicons name="bag-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.btnText}>{t(lang, 'planMyTrip')}</Text>
              </View>
          }
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Packing list */}
        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.packingTitle}>{t(lang, 'packingList')}</Text>
            <Text style={styles.packingSub}>
              {location} · {fmtDate(departing)} – {fmtDate(returnDate)} · {duration} {t(lang, 'days')}
            </Text>

            {PACKING_SECTIONS.map(section => {
              const items = result.packing[section.key];
              if (!items || items.length === 0) return null;
              return (
                <View key={section.key} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name={section.icon} size={16} color={ACCENT} style={{ marginRight: 8 }} />
                    <Text style={styles.sectionTitle}>{section.label}</Text>
                  </View>
                  {items.map((item, i) => (
                    <View key={i} style={styles.itemRow}>
                      <View style={styles.itemBullet} />
                      <Text style={styles.itemText}>{item}</Text>
                    </View>
                  ))}
                </View>
              );
            })}

            <TouchableOpacity
              style={[styles.saveBtn, justSaved && styles.saveBtnDone]}
              onPress={save} disabled={justSaved}
            >
              <Ionicons
                name={justSaved ? 'checkmark' : 'bookmark-outline'}
                size={16} color={justSaved ? '#43a047' : ACCENT}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.saveBtnText, justSaved && { color: '#43a047' }]}>
                {justSaved ? t(lang, 'saved') : t(lang, 'savePackingList')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const ACCENT = '#ff6b6b';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff8f8' },
  content: { padding: 24, paddingBottom: 60 },
  heading: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 24 },
  label: { fontSize: 11, fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  scroll: { marginBottom: 4 },

  dayChip: {
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    marginRight: 8, borderWidth: 1.5, borderColor: '#e8e8e8', alignItems: 'center', minWidth: 72,
  },
  dayChipActive: { borderColor: ACCENT, backgroundColor: '#fff5f5' },
  dayLabel: { fontSize: 13, fontWeight: '700', color: '#555' },
  dayLabelActive: { color: ACCENT },
  daySub: { fontSize: 11, color: '#bbb', marginTop: 2 },
  daySubActive: { color: ACCENT },

  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  durBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e8e8e8', alignItems: 'center', justifyContent: 'center' },
  durDisplay: { alignItems: 'center' },
  durNumber: { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },
  durLabel: { fontSize: 11, color: '#aaa' },
  returnRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  returnText: { fontSize: 13, color: '#aaa' },

  typeChip: {
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
    marginRight: 8, borderWidth: 1.5, borderColor: '#e8e8e8', alignItems: 'center', minWidth: 76,
  },
  typeChipActive: { borderColor: ACCENT, backgroundColor: '#fff5f5' },
  typeLabel: { fontSize: 12, fontWeight: '600', color: '#aaa' },
  typeLabelActive: { color: ACCENT },

  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  slider: { flex: 1 },

  btn: { backgroundColor: ACCENT, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 28 },
  btnDisabled: { opacity: 0.6 },
  btnInner: { flexDirection: 'row', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  error: { color: '#e53935', textAlign: 'center', marginTop: 16, fontSize: 14 },

  resultCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 20, marginTop: 24,
    borderLeftWidth: 4, borderLeftColor: ACCENT,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  packingTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', marginBottom: 4 },
  packingSub: { fontSize: 13, color: '#aaa', marginBottom: 18 },

  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#333' },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 5, paddingLeft: 24 },
  itemBullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: ACCENT, marginTop: 7, marginRight: 10 },
  itemText: { fontSize: 14, color: '#555', lineHeight: 21, flex: 1 },

  saveBtn: {
    marginTop: 8, backgroundColor: '#fff5f5', borderRadius: 10,
    padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDone: { backgroundColor: '#e8f5e9' },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: ACCENT },
});
