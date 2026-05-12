import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import LocationInput from '../components/LocationInput';
import { saveProfile } from '../storage';
import { t } from '../i18n';

const LANGUAGES = [
  { code: 'en', label: 'English',  flag: 'EN' },
  { code: 'es', label: 'Español',  flag: 'ES' },
  { code: 'fr', label: 'Français', flag: 'FR' },
];

export default function ProfileScreen({ lang, profile, onProfileUpdate }) {
  const [homeLocation, setHomeLocation] = useState(profile?.homeLocation || '');
  const [language, setLanguage]         = useState(profile?.language || 'en');
  const [tempSens, setTempSens]         = useState(profile?.tempSensitivity ?? 0);
  const [saved, setSaved]               = useState(false);

  const save = async () => {
    const updated = { homeLocation, language, tempSensitivity: tempSens };
    await saveProfile(updated);
    onProfileUpdate(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tempLabel = tempSens < -1 ? t(language, 'runsCold') : tempSens > 1 ? t(language, 'runsWarm') : 'Neutral';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text style={styles.heading}>{t(language, 'profile')}</Text>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={16} color="#6c63ff" style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>{t(language, 'homeLocation')}</Text>
          </View>
          <Text style={styles.hint}>Pre-fills your location on Forecast and Trip screens.</Text>
          <LocationInput
            value={homeLocation}
            onChange={setHomeLocation}
            placeholder={t(language, 'homeLocationPlaceholder')}
            lang={language}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="language-outline" size={16} color="#6c63ff" style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>{t(language, 'language')}</Text>
          </View>
          <View style={styles.langRow}>
            {LANGUAGES.map(l => (
              <TouchableOpacity
                key={l.code}
                style={[styles.langBtn, language === l.code && styles.langBtnActive]}
                onPress={() => setLanguage(l.code)}
              >
                <Text style={styles.langFlag}>{l.flag}</Text>
                <Text style={[styles.langLabel, language === l.code && styles.langLabelActive]}>{l.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="thermometer-outline" size={16} color="#6c63ff" style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>{t(language, 'temperaturePref')}</Text>
          </View>
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
          <Text style={styles.sliderLabel}>{tempLabel}</Text>
        </View>

        <TouchableOpacity style={[styles.btn, saved && styles.btnSaved]} onPress={save}>
          <Ionicons name={saved ? 'checkmark' : 'save-outline'} size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.btnText}>{saved ? t(language, 'saved') : 'Save Profile'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafafa' },
  content: { padding: 24, paddingBottom: 60 },
  heading: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 28 },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#333' },
  hint: { fontSize: 12, color: '#bbb', marginBottom: 10 },
  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
    borderColor: '#e0e0e0', alignItems: 'center', backgroundColor: '#fff',
  },
  langBtnActive: { borderColor: '#6c63ff', backgroundColor: '#f0eeff' },
  langFlag: { fontSize: 13, fontWeight: '800', color: '#888', marginBottom: 2 },
  langLabel: { fontSize: 12, color: '#aaa' },
  langLabelActive: { color: '#6c63ff', fontWeight: '600' },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slider: { flex: 1 },
  sliderLabel: { textAlign: 'center', fontSize: 13, color: '#888', marginTop: 4 },
  btn: {
    backgroundColor: '#6c63ff', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  btnSaved: { backgroundColor: '#43a047' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
