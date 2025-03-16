import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Award, ChevronLeft } from 'lucide-react-native';

// Components
import TappyCharacter from '@/components/TappyCharacter';
import SpeechBubble from '@/components/SpeechBubble';

// Services
import { userService } from '@/services/user-service';

// Types
import { Achievement, UserProfile } from '@/types/user';

export default function AchievementsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const userProfile = await userService.getProfile();
        setProfile(userProfile);
      } catch (error) {
        console.error('Error loading user profile:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadProfile();
  }, []);
  
  const renderAchievement = ({ item }: { item: Achievement }) => {
    const isUnlocked = item.unlocked;
    
    return (
      <View style={[
        styles.achievementItem,
        isUnlocked ? styles.unlockedItem : styles.lockedItem
      ]}>
        <View style={styles.achievementIcon}>
          <Award 
            size={24} 
            color={isUnlocked ? "#4BB377" : "#9CA3AF"} 
          />
        </View>
        <View style={styles.achievementContent}>
          <Text style={[
            styles.achievementTitle,
            isUnlocked ? styles.unlockedText : styles.lockedText
          ]}>
            {item.name}
          </Text>
          <Text style={styles.achievementDescription}>
            {item.description}
          </Text>
        </View>
        {isUnlocked && (
          <View style={styles.unlockedBadge}>
            <Text style={styles.unlockedBadgeText}>Unlocked</Text>
          </View>
        )}
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Stack.Screen 
        options={{
          headerShown: false,
        }}
      />
      
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Achievements</Text>
        <View style={styles.headerRight} />
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4BB377" />
          <Text style={styles.loadingText}>Loading achievements...</Text>
        </View>
      ) : (
        <>
          {/* Tappy Character & Speech Bubble */}
          <View style={styles.tappyContainer}>
            <TappyCharacter 
              expression="happy" 
              size="small" 
              outfit={profile?.outfits.find(o => o.unlocked)?.id || '1'}
            />
            <SpeechBubble 
              text={`You've unlocked ${profile?.achievements.filter(a => a.unlocked).length || 0} out of ${profile?.achievements.length || 0} achievements!`} 
              position="top" 
              style={styles.speechBubble}
            />
          </View>
          
          {/* Achievements List */}
          <FlatList
            data={profile?.achievements || []}
            renderItem={renderAchievement}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerRight: {
    width: 40, // Balance the header
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4B5563',
  },
  tappyContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  speechBubble: {
    maxWidth: '85%',
    marginBottom: 15,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  unlockedItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#4BB377',
  },
  lockedItem: {
    opacity: 0.7,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  unlockedText: {
    color: '#1F2937',
  },
  lockedText: {
    color: '#6B7280',
  },
  achievementDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  unlockedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  unlockedBadgeText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
});
