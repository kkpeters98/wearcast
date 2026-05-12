import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen    from './src/screens/HomeScreen';
import ForecastScreen from './src/screens/ForecastScreen';
import TripScreen    from './src/screens/TripScreen';
import SavedScreen   from './src/screens/SavedScreen';
import ProfileScreen from './src/screens/ProfileScreen';

import { loadProfile } from './src/storage';
import { t } from './src/i18n';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function MainTabs({ lang, profile, onProfileUpdate }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#f0f0f0',
          paddingBottom: 6,
          height: 62,
        },
        tabBarActiveTintColor: '#6c63ff',
        tabBarInactiveTintColor: '#bbb',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: -2 },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Home:     focused ? 'home'             : 'home-outline',
            Forecast: focused ? 'partly-sunny'     : 'partly-sunny-outline',
            Trip:     focused ? 'bag'              : 'bag-outline',
            Saved:    focused ? 'bookmark'         : 'bookmark-outline',
            Profile:  focused ? 'person'           : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"     options={{ tabBarLabel: 'Home' }}>
        {props => <HomeScreen {...props} lang={lang} />}
      </Tab.Screen>
      <Tab.Screen name="Forecast" options={{ tabBarLabel: t(lang, 'forecastFit') }}>
        {props => <ForecastScreen {...props} lang={lang} profile={profile} />}
      </Tab.Screen>
      <Tab.Screen name="Trip"     options={{ tabBarLabel: t(lang, 'planTrip') }}>
        {props => <TripScreen {...props} lang={lang} profile={profile} />}
      </Tab.Screen>
      <Tab.Screen name="Saved"    options={{ tabBarLabel: t(lang, 'savedOutfits') }}>
        {props => <SavedScreen {...props} lang={lang} />}
      </Tab.Screen>
      <Tab.Screen name="Profile"  options={{ tabBarLabel: t(lang, 'profile') }}>
        {props => <ProfileScreen {...props} lang={lang} profile={profile} onProfileUpdate={onProfileUpdate} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [profile, setProfile] = useState(null);

  useEffect(() => { loadProfile().then(setProfile); }, []);

  if (!profile) return null;

  return (
    <NavigationContainer>
      <MainTabs lang={profile.language || 'en'} profile={profile} onProfileUpdate={setProfile} />
    </NavigationContainer>
  );
}
