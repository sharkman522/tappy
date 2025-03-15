import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Bell, Moon, Award, Shirt } from 'lucide-react-native';

// Components
import TappyCharacter from '@/components/TappyCharacter';
import SpeechBubble from '@/components/SpeechBubble';

// Mock Data
import { userProfile } from '@/utils/mockData';

export default function SettingsScreen() {
  const [notifications, setNotifications] = React.useState(true);
  const [napMode, setNapMode] = React.useState(false);
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Tappy Character & Speech Bubble */}
        <View style={styles.tappyContainer}>
          <TappyCharacter 
            expression="happy" 
            size="medium" 
          />
          <SpeechBubble 
            text="Here's your Tappy Travel Card!" 
            position="top" 
            style={styles.speechBubble}
          />
        </View>
        
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <Text style={styles.username}>{userProfile.name}</Text>
          <View style={styles.pointsContainer}>
            <Text style={styles.pointsLabel}>Tappy Points</Text>
            <Text style={styles.pointsValue}>{userProfile.points}</Text>
          </View>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>
              {userProfile.achievements.filter(a => a.unlocked).length} Achievements Unlocked
            </Text>
          </View>
        </View>
        
        {/* Settings Sections */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          {/* Notification Setting */}
          <View style={styles.settingItem}>
            <Bell size={20} color="#4BB377" style={styles.settingIcon} />
            <Text style={styles.settingLabel}>Notifications</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#D1D5DB', true: '#4BB377' }}
              thumbColor="#FFFFFF"
              style={styles.switch}
            />
          </View>
          
          {/* Nap Mode Setting */}
          <View style={styles.settingItem}>
            <Moon size={20} color="#4BB377" style={styles.settingIcon} />
            <Text style={styles.settingLabel}>Nap Mode</Text>
            <Switch
              value={napMode}
              onValueChange={setNapMode}
              trackColor={{ false: '#D1D5DB', true: '#4BB377' }}
              thumbColor="#FFFFFF"
              style={styles.switch}
            />
          </View>
        </View>
        
        {/* Achievements Section */}
        <TouchableOpacity style={styles.navigationItem}>
          <Award size={20} color="#4BB377" style={styles.settingIcon} />
          <Text style={styles.settingLabel}>Achievements</Text>
          <ChevronRight size={20} color="#9CA3AF" style={styles.chevron} />
        </TouchableOpacity>
        
        {/* Tappy's Outfits Section */}
        <TouchableOpacity style={styles.navigationItem}>
          <Shirt size={20} color="#4BB377" style={styles.settingIcon} />
          <Text style={styles.settingLabel}>Tappy's Outfits</Text>
          <ChevronRight size={20} color="#9CA3AF" style={styles.chevron} />
        </TouchableOpacity>
        
        {/* App Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.appVersion}>Tappy Travels v1.0.0</Text>
          <Text style={styles.copyright}>© 2025 Tappy Team</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  tappyContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 15,
  },
  speechBubble: {
    maxWidth: '80%',
    marginBottom: 20,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    margin: 15,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    alignItems: 'center',
  },
  username: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 10,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  pointsLabel: {
    fontSize: 16,
    color: '#4B5563',
    marginRight: 10,
  },
  pointsValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4BB377',
  },
  badgeContainer: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 5,
  },
  badgeText: {
    color: '#1E40AF',
    fontSize: 14,
    fontWeight: '500',
  },
  settingsSection: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    margin: 15,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  navigationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    paddingHorizontal: 15,
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 15,
  },
  settingIcon: {
    marginRight: 15,
  },
  settingLabel: {
    flex: 1,
    fontSize: 16,
    color: '#4B5563',
  },
  switch: {
    marginLeft: 10,
  },
  chevron: {
    marginLeft: 10,
  },
  infoSection: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 30,
  },
  appVersion: {
    fontSize: 14,
    color: '#6B7280',
  },
  copyright: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 5,
  },
});