import React, { useState, useRef } from 'react';
import {
  View, TextInput, FlatList, TouchableOpacity, Text, StyleSheet, ActivityIndicator,
} from 'react-native';

export default function LocationInput({ value, onChange, placeholder, lang }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const search = (text) => {
    onChange(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5&addressdetails=1`,
          { headers: { 'Accept-Language': lang || 'en', 'User-Agent': 'WearCastApp/1.0' } }
        );
        const data = await res.json();
        setSuggestions(data.map(r => ({ label: r.display_name, value: r.display_name })));
      } catch {
        setSuggestions([]);
      }
      setLoading(false);
    }, 350);
  };

  const pick = (item) => {
    onChange(item.value);
    setSuggestions([]);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={search}
          placeholder={placeholder}
          placeholderTextColor="#bbb"
          autoCorrect={false}
        />
        {loading && <ActivityIndicator size="small" color="#6c63ff" style={styles.spinner} />}
      </View>
      {suggestions.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={(_, i) => String(i)}
            keyboardShouldPersistTaps="always"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.suggestion} onPress={() => pick(item)}>
                <Text style={styles.suggestionText} numberOfLines={2}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', zIndex: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1, backgroundColor: '#f7f7ff', borderRadius: 12, padding: 14,
    fontSize: 15, color: '#1a1a1a', borderWidth: 1.5, borderColor: '#e0e0e0',
  },
  spinner: { position: 'absolute', right: 12 },
  dropdown: {
    position: 'absolute', top: 54, left: 0, right: 0,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4, zIndex: 20,
  },
  suggestion: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  suggestionText: { fontSize: 14, color: '#333' },
});
