import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, Shirt, Lock, Check } from 'lucide-react-native';

// Components
import TappyCharacter from '@/components/TappyCharacter';
import SpeechBubble from '@/components/SpeechBubble';

// Services
import { userService } from '@/services/user-service';

// Types
import { Outfit, UserProfile, UserSettings } from '@/types/user';

export default function OutfitsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<string>('1');
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const userProfile = await userService.getProfile();
        const userSettings = await userService.getSettings();
        
        setProfile(userProfile);
        setSettings(userSettings);
        setSelectedOutfit(userSettings.current_outfit);
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  const handleOutfitSelect = async (outfitId: string) => {
    // Check if outfit is unlocked
    const outfit = profile?.outfits.find(o => o.id === outfitId);
    
    if (!outfit) return;
    
    if (!outfit.unlocked) {
      if (outfit.pointsRequired && profile && profile.points >= outfit.pointsRequired) {
        // User has enough points to unlock
        try {
          await userService.unlockOutfit(outfitId);
          const updatedProfile = await userService.getProfile();
          setProfile(updatedProfile);
          
          // Now select the outfit
          await selectOutfit(outfitId);
        } catch (error) {
          console.error('Error unlocking outfit:', error);
          Alert.alert('Error', 'Failed to unlock outfit. Please try again.');
        }
      } else {
        // Not enough points
        Alert.alert(
          'Outfit Locked', 
          `You need ${outfit.pointsRequired} Tappy Points to unlock this outfit. Keep using the app to earn more points!`
        );
      }
    } else {
      // Outfit is already unlocked, just select it
      await selectOutfit(outfitId);
    }
  };
  
  const selectOutfit = async (outfitId: string) => {
    try {
      setSelectedOutfit(outfitId);
      const updatedSettings = await userService.changeOutfit(outfitId);
      setSettings(updatedSettings);
    } catch (error) {
      console.error('Error selecting outfit:', error);
      Alert.alert('Error', 'Failed to select outfit. Please try again.');
      // Revert selection if error
      setSelectedOutfit(settings?.current_outfit || '1');
    }
  };
  
  const renderOutfit = ({ item }: { item: Outfit }) => {
    const isUnlocked = item.unlocked;
    const isSelected = selectedOutfit === item.id;
    
    return (
      <TouchableOpacity 
        style={[
          styles.outfitItem,
          isSelected && styles.selectedOutfit
        ]}
        onPress={() => handleOutfitSelect(item.id)}
        disabled={loading}
      >
        <View style={styles.outfitPreview}>
          <TappyCharacter 
            expression="happy" 
            size="small" 
            outfit={item.id}
            style={styles.outfitTappy}
          />
          {!isUnlocked && (
            <View style={styles.lockOverlay}>
              <Lock size={24} color="#FFFFFF" />
            </View>
          )}
        </View>
        
        <View style={styles.outfitInfo}>
          <Text style={styles.outfitName}>{item.name}</Text>
          <Text style={styles.outfitDescription}>{item.description}</Text>
          
          {!isUnlocked && item.pointsRequired && (
            <View style={styles.pointsRequired}>
              <Text style={styles.pointsText}>
                {profile && profile.points >= (item.pointsRequired || 0) 
                  ? 'Tap to unlock' 
                  : `${item.pointsRequired} points required`}
              </Text>
            </View>
          )}
        </View>
        
        {isSelected && (
          <View style={styles.selectedBadge}>
            <Check size={16} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Tappy's Outfits</Text>
        <View style={styles.headerRight} />
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4BB377" />
          <Text style={styles.loadingText}>Loading outfits...</Text>
        </View>
      ) : (
        <>
          {/* Current Tappy with Selected Outfit */}
          <View style={styles.previewContainer}>
            <TappyCharacter 
              expression="happy" 
              size="medium" 
              outfit={selectedOutfit}
              animationType="pulse"
            />
            <SpeechBubble 
              text="How do I look?" 
              position="top" 
              style={styles.speechBubble}
            />
          </View>
          
          {/* Points Info */}
          <View style={styles.pointsContainer}>
            <Shirt size={18} color="#4BB377" style={styles.pointsIcon} />
            <Text style={styles.pointsLabel}>Your Tappy Points: </Text>
            <Text style={styles.pointsValue}>{profile?.points || 0}</Text>
          </View>
          
          {/* Outfits List */}
          <FlatList
            data={profile?.outfits || []}
            renderItem={renderOutfit}
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
  previewContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  speechBubble: {
    maxWidth: '60%',
    marginBottom: 15,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    paddingHorizontal: 16,
  },
  pointsIcon: {
    marginRight: 6,
  },
  pointsLabel: {
    fontSize: 16,
    color: '#4B5563',
  },
  pointsValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4BB377',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  outfitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedOutfit: {
    borderWidth: 2,
    borderColor: '#4BB377',
  },
  outfitPreview: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  outfitTappy: {
    transform: [{ scale: 0.8 }],
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outfitInfo: {
    flex: 1,
  },
  outfitName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  outfitDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  pointsRequired: {
    marginTop: 2,
  },
  pointsText: {
    fontSize: 12,
    color: '#4BB377',
    fontWeight: '500',
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4BB377',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
