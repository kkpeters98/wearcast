import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = '@wearcast_profile';
const SAVED_KEY = '@wearcast_saved';

export const defaultProfile = {
  homeLocation: '',
  language: 'en',
  tempSensitivity: 0,
};

export async function loadProfile() {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    return raw ? { ...defaultProfile, ...JSON.parse(raw) } : { ...defaultProfile };
  } catch {
    return { ...defaultProfile };
  }
}

export async function saveProfile(profile) {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function loadSaved() {
  try {
    const raw = await AsyncStorage.getItem(SAVED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addSaved(item) {
  const list = await loadSaved();
  const updated = [{ ...item, id: Date.now().toString() }, ...list];
  await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(updated));
  return updated;
}

export async function deleteSaved(id) {
  const list = await loadSaved();
  const updated = list.filter(i => i.id !== id);
  await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(updated));
  return updated;
}
