import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import LocationInput from '../components/LocationInput';
import { fetchOutfit } from '../api';
import { addSaved } from '../storage';
import { t } from '../i18n';

const TIME_BLOCKS = [
  { key: 'morning',   label: 'Morning',   sub: '8am – 12pm', start: 8,  end: 12 },
  { key: 'afternoon', label: 'Afternoon', sub: '12pm – 5pm', start: 12, end: 17 },
  { key: 'evening',   label: 'Evening',   sub: '5pm – 10pm', start: 17, end: 22 },
  { key: 'fullday',   label: 'Full Day',  sub: '8am – 10pm', start: 8,  end: 22 },
];

const EVENT_TYPES = [
  { key: 'casual',   label: 'Casual',         icon: 'shirt-outline' },
  { key: 'work',     label: 'Work',           icon: 'briefcase-outline' },
  { key: 'formal',   label: 'Formal',         icon: 'ribbon-outline' },
  { key: 'athletic', label: 'Athletic',       icon: 'fitness-outline' },
  { key: 'travel',   label: 'Travel',         icon: 'airplane-outline' },
];

function buildDays() {
  const days = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const iso = d.toISOString().split('T')[0];
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    days.push({ iso, label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : weekday, sub: monthDay });
  }
  return days;
}

const DAYS = buildDays();

const weatherIcon = (code) => {
  if (code == null) return 'cloudy-outline';
  const c = parseInt(code);
  if (c <= 2) return 'sunny-outline';
  if (c === 3) return 'partly-sunny-outline';
  if (c >= 45 && c <= 48) return 'cloud-outline';
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return 'rainy-outline';
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow-outline';
  if (c >= 95) return 'thunderstorm-outline';
  return 'partly-sunny-outline';
};

export default function ForecastScreen({ lang, profile }) {
  const [location, setLocation]   = useState(profile?.homeLocation || '');
  const [selectedDay, setDay]     = useState(DAYS[0].iso);
  const [timeBlock, setTimeBlock] = useState('fullday');
  const [eventType, setEventType] = useState('casual');
  const [tempSens, setTempSens]   = useState(profile?.tempSensitivity ?? 0);
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState('');
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (profile?.homeLocation) setLocation(profile.homeLocation);
    if (profile?.tempSensitivity != null) setTempSens(profile.tempSensitivity);
  }, [profile]);

  const getOutfit = async () => {
    if (!location.trim()) { setError(t(lang, 'errorLocation')); return; }
    setLoading(true); setError(''); setResult(null); setJustSaved(false);
    const block = TIME_BLOCKS.find(b => b.key === timeBlock);
    try {
      const data = await fetchOutfit({
        location: location.trim(),
        tempSensitivity: tempSens,
        date: selectedDay,
        timeStart: block.start,
        timeEnd: block.end,
        eventType,
      });
      setResult(data);
    } catch (e) {
      setError(e.message.includes('not found') ? t(lang, 'errorLocation') : t(lang, 'errorWeather'));
    }
    setLoading(false);
  };

  const save = async () => {
    if (!result) return;
    const block = TIME_BLOCKS.find(b => b.key === timeBlock);
    await addSaved({
      type: 'outfit',
      location: location.trim(),
      date: selectedDay,
      timeBlock: block.label,
      eventType,
      weather: result.weather,
      outfit: result.outfit,
    });
    setJustSaved(true);
  };

  const sensLabel = tempSens < -1 ? t(lang, 'runsCold') : tempSens > 1 ? t(lang, 'runsWarm') : 'Neutral';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text style={styles.heading}>{t(lang, 'forecastFit')}</Text>

        {/* Location */}
        <Text style={styles.label}>{t(lang, 'location')}</Text>
        <LocationInput value={location} onChange={setLocation} placeholder={t(lang, 'locationPlaceholder')} lang={lang} />

        {/* Day selector */}
        <Text style={[styles.label, { marginTop: 22 }]}>{t(lang, 'date')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
          {DAYS.map(d => (
            <TouchableOpacity
              key={d.iso}
              style={[styles.dayChip, selectedDay === d.iso && styles.dayChipActive]}
              onPress={() => setDay(d.iso)}
            >
              <Text style={[styles.dayLabel, selectedDay === d.iso && styles.dayLabelActive]}>{d.label}</Text>
              <Text style={[styles.daySub, selectedDay === d.iso && styles.daySubActive]}>{d.sub}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Time of day */}
        <Text style={[styles.label, { marginTop: 22 }]}>Time of day</Text>
        <View style={styles.chipGrid}>
          {TIME_BLOCKS.map(b => (
            <TouchableOpacity
              key={b.key}
              style={[styles.chip, timeBlock === b.key && styles.chipActive]}
              onPress={() => setTimeBlock(b.key)}
            >
              <Text style={[styles.chipLabel, timeBlock === b.key && styles.chipLabelActive]}>{b.label}</Text>
              <Text style={[styles.chipSub, timeBlock === b.key && styles.chipSubActive]}>{b.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Event type */}
        <Text style={[styles.label, { marginTop: 22 }]}>Occasion</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventScroll}>
          {EVENT_TYPES.map(e => (
            <TouchableOpacity
              key={e.key}
              style={[styles.eventChip, eventType === e.key && styles.eventChipActive]}
              onPress={() => setEventType(e.key)}
            >
              <Ionicons
                name={e.icon}
                size={18}
                color={eventType === e.key ? '#6c63ff' : '#aaa'}
                style={{ marginBottom: 4 }}
              />
              <Text style={[styles.eventLabel, eventType === e.key && styles.eventLabelActive]}>{e.label}</Text>
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
            minimumTrackTintColor="#6c63ff" maximumTrackTintColor="#e0e0e0"
            thumbTintColor="#6c63ff"
          />
          <Ionicons name="thermometer" size={20} color="#e05252" />
        </View>
        <Text style={styles.sliderLabel}>{sensLabel}</Text>

        {/* Submit */}
        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={getOutfit} disabled={loading}>
          {loading
            ? <Text style={styles.btnText}>{t(lang, 'loading')}</Text>
            : <View style={styles.btnInner}>
                <Ionicons name="search-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.btnText}>{t(lang, 'getOutfit')}</Text>
              </View>
          }
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Result */}
        {result && (
          <View style={styles.resultCard}>
            <View style={styles.pillRow}>
              <View style={styles.pill}>
                <Ionicons name="thermometer-outline" size={13} color="#6c63ff" style={{ marginRight: 4 }} />
                <Text style={styles.pillText}>{Math.round(result.weather.temperature)}°F</Text>
              </View>
              <View style={styles.pill}>
                <Ionicons name="navigate-outline" size={13} color="#6c63ff" style={{ marginRight: 4 }} />
                <Text style={styles.pillText}>{result.weather.windspeed} mph</Text>
              </View>
              <View style={styles.pill}>
                <Ionicons name={weatherIcon(result.weather.weathercode)} size={13} color="#6c63ff" style={{ marginRight: 4 }} />
              </View>
            </View>

            {/* Hourly mini-timeline */}
            {result.hourly && result.hourly.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeline}>
                {result.hourly.filter((_, i) => i % 2 === 0).map(h => (
                  <View key={h.hour} style={styles.timelineItem}>
                    <Text style={styles.timelineHour}>
                      {h.hour === 0 ? '12am' : h.hour < 12 ? `${h.hour}am` : h.hour === 12 ? '12pm' : `${h.hour - 12}pm`}
                    </Text>
                    <Ionicons name={weatherIcon(h.weathercode)} size={16} color="#6c63ff" />
                    <Text style={styles.timelineTemp}>{Math.round(h.temperature)}°</Text>
                  </View>
                ))}
              </ScrollView>
            )}

            <Text style={styles.outfitText}>{result.outfit}</Text>

            <TouchableOpacity
              style={[styles.saveBtn, justSaved && styles.saveBtnDone]}
              onPress={save} disabled={justSaved}
            >
              <Ionicons
                name={justSaved ? 'checkmark' : 'bookmark-outline'}
                size={16} color={justSaved ? '#43a047' : '#6c63ff'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.saveBtnText, justSaved && { color: '#43a047' }]}>
                {justSaved ? t(lang, 'saved') : t(lang, 'saveOutfit')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const ACCENT = '#6c63ff';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f4ff' },
  content: { padding: 24, paddingBottom: 60 },
  heading: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 24 },
  label: { fontSize: 11, fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },

  dayScroll: { marginBottom: 4 },
  dayChip: {
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
    marginRight: 8, borderWidth: 1.5, borderColor: '#e8e8e8', alignItems: 'center', minWidth: 80,
  },
  dayChipActive: { borderColor: ACCENT, backgroundColor: '#f0eeff' },
  dayLabel: { fontSize: 13, fontWeight: '700', color: '#555' },
  dayLabelActive: { color: ACCENT },
  daySub: { fontSize: 11, color: '#bbb', marginTop: 2 },
  daySubActive: { color: ACCENT },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1.5, borderColor: '#e8e8e8', alignItems: 'center',
  },
  chipActive: { borderColor: ACCENT, backgroundColor: '#f0eeff' },
  chipLabel: { fontSize: 13, fontWeight: '600', color: '#555' },
  chipLabelActive: { color: ACCENT },
  chipSub: { fontSize: 10, color: '#ccc', marginTop: 1 },
  chipSubActive: { color: ACCENT },

  eventScroll: { marginBottom: 4 },
  eventChip: {
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
    marginRight: 8, borderWidth: 1.5, borderColor: '#e8e8e8', alignItems: 'center', minWidth: 72,
  },
  eventChipActive: { borderColor: ACCENT, backgroundColor: '#f0eeff' },
  eventLabel: { fontSize: 12, fontWeight: '600', color: '#aaa' },
  eventLabelActive: { color: ACCENT },

  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slider: { flex: 1 },
  sliderLabel: { textAlign: 'center', fontSize: 13, color: '#888', marginTop: 4, marginBottom: 4 },

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
  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  pill: {
    backgroundColor: '#f0eeff', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, flexDirection: 'row', alignItems: 'center',
  },
  pillText: { fontSize: 13, color: ACCENT, fontWeight: '600' },

  timeline: { marginBottom: 14 },
  timelineItem: { alignItems: 'center', marginRight: 16 },
  timelineHour: { fontSize: 11, color: '#aaa', marginBottom: 4 },
  timelineTemp: { fontSize: 12, fontWeight: '700', color: '#333', marginTop: 4 },

  outfitText: { fontSize: 15, lineHeight: 24, color: '#333' },
  saveBtn: {
    marginTop: 16, backgroundColor: '#f0eeff', borderRadius: 10,
    padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDone: { backgroundColor: '#e8f5e9' },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: ACCENT },
});
