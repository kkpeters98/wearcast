import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import LocationInput from '../components/LocationInput';
import PixelMascot from '../components/PixelMascot';
import { fetchOutfit } from '../api';
import { addSaved } from '../storage';
import { t } from '../i18n';

// ─── Constants ─────────────────────────────────────────────────────────────────
const ACCENT = '#6c63ff';

const TIME_BLOCKS = [
  { key: 'morning',   label: 'Morning',   sub: '8–12pm',  start: 8,  end: 12 },
  { key: 'afternoon', label: 'Afternoon', sub: '12–5pm',  start: 12, end: 17 },
  { key: 'evening',   label: 'Evening',   sub: '5–10pm',  start: 17, end: 22 },
  { key: 'fullday',   label: 'Full Day',  sub: 'all day', start: 8,  end: 22 },
];

const EVENT_TYPES = [
  { key: 'casual',   label: 'Casual',   icon: 'shirt-outline' },
  { key: 'work',     label: 'Work',     icon: 'briefcase-outline' },
  { key: 'formal',   label: 'Formal',   icon: 'ribbon-outline' },
  { key: 'athletic', label: 'Athletic', icon: 'fitness-outline' },
  { key: 'travel',   label: 'Travel',   icon: 'airplane-outline' },
];

const GENDER_OPTIONS = [
  { key: 'neutral', label: 'Any style' },
  { key: 'womens',  label: "Women's" },
  { key: 'mens',    label: "Men's" },
];

function stripMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*{1,2}([^*\n]+)\*{1,2}/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n{2,}/g, ' ')
    .trim();
}

function outfitBullets(text) {
  const clean = stripMarkdown(text);
  return clean
    .split(/\.\s+/)
    .map(s => s.replace(/\.$/, '').trim())
    .filter(s => s.length > 8);
}

const weatherIconName = (code) => {
  if (code == null) return 'cloudy-outline';
  const c = parseInt(code);
  if (c <= 1)  return 'sunny-outline';
  if (c <= 3)  return 'partly-sunny-outline';
  if (c <= 48) return 'cloud-outline';
  if (c <= 67 || (c >= 80 && c <= 82)) return 'rainy-outline';
  if (c <= 77 || c === 85 || c === 86) return 'snow-outline';
  return 'thunderstorm-outline';
};

const uvColor = (uv) => {
  if (uv == null) return '#aaa';
  if (uv <= 2) return '#43a047';
  if (uv <= 5) return '#fbc02d';
  if (uv <= 7) return '#f57c00';
  return '#e53935';
};

const uvLabel = (uv) => {
  if (uv == null) return '—';
  if (uv <= 2) return 'Low';
  if (uv <= 5) return 'Moderate';
  if (uv <= 7) return 'High';
  return 'Very High';
};

function buildDays() {
  const days = [];
  const now = new Date();
  for (let i = 0; i < 15; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const iso = d.toISOString().split('T')[0];
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    days.push({
      iso,
      label: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : weekday,
      sub: monthDay,
      special: i < 2,
    });
  }
  return days;
}
const ALL_DAYS = buildDays();

// ─── Weather detail card ───────────────────────────────────────────────────────
function WeatherCard({ weather }) {
  if (!weather) return null;
  const uv = weather.uv_index;
  const metrics = [
    { icon: 'thermometer-outline', label: 'Feels like', value: `${Math.round(weather.feels_like ?? weather.temperature)}°F` },
    { icon: 'water-outline',       label: 'Humidity',   value: weather.humidity != null ? `${weather.humidity}%` : '—' },
    { icon: 'rainy-outline',       label: 'Precip',     value: weather.precip_probability != null ? `${weather.precip_probability}%` : '—' },
    { icon: 'sunny-outline',       label: `UV · ${uvLabel(uv)}`, value: uv != null ? String(Math.round(uv)) : '—', valueColor: uvColor(uv) },
  ];

  return (
    <View style={wStyles.card}>
      <View style={wStyles.topRow}>
        <View>
          <Text style={wStyles.tempBig}>{Math.round(weather.temperature)}°F</Text>
          <View style={wStyles.windRow}>
            <Ionicons name="navigate-outline" size={13} color="#888" style={{ marginRight: 4 }} />
            <Text style={wStyles.windText}>
              {weather.windspeed} mph{weather.wind_direction ? ` ${weather.wind_direction}` : ''}
            </Text>
          </View>
        </View>
        <Ionicons name={weatherIconName(weather.weathercode)} size={44} color={ACCENT} />
      </View>
      <View style={wStyles.metrics}>
        {metrics.map(m => (
          <View key={m.label} style={wStyles.metric}>
            <Ionicons name={m.icon} size={14} color="#bbb" />
            <Text style={wStyles.metricLabel}>{m.label}</Text>
            <Text style={[wStyles.metricValue, m.valueColor ? { color: m.valueColor } : {}]}>{m.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const wStyles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  tempBig: { fontSize: 38, fontWeight: '800', color: '#1a1a1a' },
  windRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  windText: { fontSize: 13, color: '#888' },
  metrics: { flexDirection: 'row', justifyContent: 'space-between' },
  metric: { alignItems: 'center', flex: 1 },
  metricLabel: { fontSize: 10, color: '#bbb', marginTop: 3, textAlign: 'center' },
  metricValue: { fontSize: 13, fontWeight: '700', color: '#333', marginTop: 1 },
});

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function ForecastScreen({ lang, profile }) {
  const [location, setLocation]     = useState(profile?.homeLocation || '');
  const [selectedDay, setDay]       = useState(ALL_DAYS[0].iso);
  const [showMoreDays, setMoreDays] = useState(false);
  const [timeBlock, setTimeBlock]   = useState('fullday');
  const [eventType, setEventType]   = useState('casual');
  const [gender, setGender]         = useState(profile?.gender || 'neutral');
  const [tempSens, setTempSens]     = useState(profile?.tempSensitivity ?? 0);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState('');
  const [justSaved, setJustSaved]   = useState(false);

  useEffect(() => {
    if (profile?.homeLocation) setLocation(profile.homeLocation);
    if (profile?.tempSensitivity != null) setTempSens(profile.tempSensitivity);
    if (profile?.gender) setGender(profile.gender);
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
        gender,
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
    await addSaved({ type: 'outfit', location: location.trim(), date: selectedDay, timeBlock: block.label, eventType, weather: result.weather, outfit: result.outfit });
    setJustSaved(true);
  };

  const visibleDays = showMoreDays ? ALL_DAYS : ALL_DAYS.slice(0, 5);
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {visibleDays.map(d => (
            <TouchableOpacity key={d.iso} style={[styles.dayChip, selectedDay === d.iso && styles.dayChipActive, d.special && styles.dayChipSpecial]} onPress={() => setDay(d.iso)}>
              <Text style={[styles.dayLabel, selectedDay === d.iso && styles.dayLabelActive]}>{d.label}</Text>
              <Text style={[styles.daySub, selectedDay === d.iso && styles.daySubActive]}>{d.sub}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.dayChip, styles.moreDayChip]} onPress={() => setMoreDays(v => !v)}>
            <Ionicons name={showMoreDays ? 'chevron-back' : 'ellipsis-horizontal'} size={16} color={ACCENT} />
            <Text style={styles.moreDayText}>{showMoreDays ? 'Less' : 'More'}</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Time of day */}
        <Text style={[styles.label, { marginTop: 22 }]}>Time of day</Text>
        <View style={styles.chipGrid}>
          {TIME_BLOCKS.map(b => (
            <TouchableOpacity key={b.key} style={[styles.chip, timeBlock === b.key && styles.chipActive]} onPress={() => setTimeBlock(b.key)}>
              <Text style={[styles.chipLabel, timeBlock === b.key && styles.chipLabelActive]}>{b.label}</Text>
              <Text style={[styles.chipSub, timeBlock === b.key && styles.chipSubActive]}>{b.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Occasion */}
        <Text style={[styles.label, { marginTop: 22 }]}>Occasion</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {EVENT_TYPES.map(e => (
            <TouchableOpacity key={e.key} style={[styles.eventChip, eventType === e.key && styles.eventChipActive]} onPress={() => setEventType(e.key)}>
              <Ionicons name={e.icon} size={18} color={eventType === e.key ? ACCENT : '#bbb'} style={{ marginBottom: 4 }} />
              <Text style={[styles.eventLabel, eventType === e.key && styles.eventLabelActive]}>{e.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Gender */}
        <Text style={[styles.label, { marginTop: 22 }]}>Style</Text>
        <View style={styles.genderRow}>
          {GENDER_OPTIONS.map(g => (
            <TouchableOpacity key={g.key} style={[styles.genderBtn, gender === g.key && styles.genderBtnActive]} onPress={() => setGender(g.key)}>
              <Text style={[styles.genderLabel, gender === g.key && styles.genderLabelActive]}>{g.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Temperature slider */}
        <Text style={[styles.label, { marginTop: 22 }]}>{t(lang, 'temperaturePref')}</Text>
        <View style={styles.sliderRow}>
          <Ionicons name="thermometer-outline" size={20} color={ACCENT} />
          <Slider style={styles.slider} minimumValue={-3} maximumValue={3} step={1} value={tempSens} onValueChange={setTempSens} minimumTrackTintColor={ACCENT} maximumTrackTintColor="#e0e0e0" thumbTintColor={ACCENT} />
          <Ionicons name="thermometer" size={20} color="#e05252" />
        </View>
        <Text style={styles.sliderLabel}>{sensLabel}</Text>

        {/* Button */}
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
            {/* Weather detail */}
            <WeatherCard weather={result.weather} />

            {/* Hourly timeline */}
            {result.hourly && result.hourly.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeline}>
                {result.hourly.filter((_, i) => i % 2 === 0).map(h => (
                  <View key={h.hour} style={styles.tlItem}>
                    <Text style={styles.tlHour}>{h.hour < 12 ? `${h.hour||12}am` : h.hour === 12 ? '12pm' : `${h.hour - 12}pm`}</Text>
                    <Ionicons name={weatherIconName(h.weathercode)} size={15} color={ACCENT} style={{ marginVertical: 3 }} />
                    <Text style={styles.tlTemp}>{Math.round(h.temperature)}°</Text>
                    {h.precip_probability > 0 && (
                      <Text style={styles.tlPrecip}>{h.precip_probability}%</Text>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Mascot */}
            <View style={styles.mascotRow}>
              <PixelMascot animal={profile?.mascot || 'dog'} weather={result.weather} eventType={eventType} pixelSize={5} />
            </View>

            {/* Outfit recommendation */}
            <View style={styles.outfitSection}>
              <View style={styles.outfitHeader}>
                <Ionicons name="shirt-outline" size={16} color={ACCENT} style={{ marginRight: 6 }} />
                <Text style={styles.outfitTitle}>Your Outfit</Text>
              </View>
              {outfitBullets(result.outfit).map((line, i) => (
                <View key={i} style={styles.bullet}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>{line}.</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={[styles.saveBtn, justSaved && styles.saveBtnDone]} onPress={save} disabled={justSaved}>
              <Ionicons name={justSaved ? 'checkmark' : 'bookmark-outline'} size={16} color={justSaved ? '#43a047' : ACCENT} style={{ marginRight: 6 }} />
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f4ff' },
  content: { padding: 24, paddingBottom: 60 },
  heading: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 24 },
  label: { fontSize: 11, fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },

  dayChip: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginRight: 8, borderWidth: 1.5, borderColor: '#e8e8e8', alignItems: 'center', minWidth: 68 },
  dayChipActive: { borderColor: ACCENT, backgroundColor: '#f0eeff' },
  dayChipSpecial: { minWidth: 80 },
  moreDayChip: { borderStyle: 'dashed', borderColor: '#ccc', minWidth: 60 },
  dayLabel: { fontSize: 13, fontWeight: '700', color: '#555' },
  dayLabelActive: { color: ACCENT },
  daySub: { fontSize: 10, color: '#bbb', marginTop: 2 },
  daySubActive: { color: ACCENT },
  moreDayText: { fontSize: 11, color: ACCENT, marginTop: 2, fontWeight: '600' },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1.5, borderColor: '#e8e8e8' },
  chipActive: { borderColor: ACCENT, backgroundColor: '#f0eeff' },
  chipLabel: { fontSize: 13, fontWeight: '600', color: '#666' },
  chipLabelActive: { color: ACCENT },
  chipSub: { fontSize: 10, color: '#ccc', marginTop: 1 },
  chipSubActive: { color: ACCENT },

  eventChip: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginRight: 8, borderWidth: 1.5, borderColor: '#e8e8e8', alignItems: 'center', minWidth: 72 },
  eventChipActive: { borderColor: ACCENT, backgroundColor: '#f0eeff' },
  eventLabel: { fontSize: 12, fontWeight: '600', color: '#bbb' },
  eventLabelActive: { color: ACCENT },

  genderRow: { flexDirection: 'row', gap: 8 },
  genderBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#e8e8e8', alignItems: 'center', backgroundColor: '#fff' },
  genderBtnActive: { borderColor: ACCENT, backgroundColor: '#f0eeff' },
  genderLabel: { fontSize: 13, fontWeight: '600', color: '#aaa' },
  genderLabelActive: { color: ACCENT },

  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slider: { flex: 1 },
  sliderLabel: { textAlign: 'center', fontSize: 13, color: '#888', marginTop: 4, marginBottom: 4 },

  btn: { backgroundColor: ACCENT, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 28 },
  btnDisabled: { opacity: 0.6 },
  btnInner: { flexDirection: 'row', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  error: { color: '#e53935', textAlign: 'center', marginTop: 16, fontSize: 14 },

  resultCard: { backgroundColor: '#fff', borderRadius: 18, padding: 20, marginTop: 24, borderLeftWidth: 4, borderLeftColor: ACCENT, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },

  timeline: { marginBottom: 16 },
  tlItem: { alignItems: 'center', marginRight: 18, minWidth: 40 },
  tlHour: { fontSize: 10, color: '#aaa', marginBottom: 2 },
  tlTemp: { fontSize: 12, fontWeight: '700', color: '#333' },
  tlPrecip: { fontSize: 10, color: '#6c63ff', marginTop: 1 },

  mascotRow: { alignItems: 'center', marginBottom: 16, marginTop: 4 },
  outfitSection: { marginTop: 4 },
  outfitHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  outfitTitle: { fontSize: 13, fontWeight: '700', color: ACCENT, textTransform: 'uppercase', letterSpacing: 0.6 },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT, marginTop: 7, marginRight: 10, flexShrink: 0 },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 22, color: '#333' },

  saveBtn: { marginTop: 16, backgroundColor: '#f0eeff', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  saveBtnDone: { backgroundColor: '#e8f5e9' },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: ACCENT },
});
