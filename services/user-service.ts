import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { UserSettings, UserProfile, Achievement, Outfit } from '../types/user';

// Storage keys
const USER_SETTINGS_KEY = 'tappy_user_settings';
const USER_PROFILE_KEY = 'tappy_user_profile';

// Default settings and profile
const DEFAULT_SETTINGS: UserSettings = {
  user_id: 'anonymous', // Default user ID until auth is implemented
  notifications_enabled: true,
  nap_mode_enabled: false,
  current_outfit: '1', // Default outfit ID
};

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: '1', name: 'First Trip', description: 'Completed your first journey with Tappy', unlocked: true },
  { id: '2', name: 'Early Bird', description: 'Took a trip before 7am', unlocked: false },
  { id: '3', name: '5 Journeys', description: 'Completed 5 journeys with Tappy', unlocked: false },
  { id: '4', name: '10 Journeys', description: 'Completed 10 journeys with Tappy', unlocked: false },
  { id: '5', name: 'Night Owl', description: 'Took a trip after 10pm', unlocked: false },
];

const DEFAULT_OUTFITS: Outfit[] = [
  { id: '1', name: 'Default', description: 'Classic Tappy look', unlocked: true },
  { id: '2', name: 'Raincoat', description: 'Keeps Tappy dry on rainy days', unlocked: false, pointsRequired: 50 },
  { id: '3', name: 'Bus Driver', description: 'Tappy in a bus driver uniform', unlocked: false, pointsRequired: 100 },
  { id: '4', name: 'Train Captain', description: 'Tappy in a train captain uniform', unlocked: false, pointsRequired: 150 },
];

const DEFAULT_PROFILE: UserProfile = {
  name: 'Traveler',
  points: 0,
  achievements: DEFAULT_ACHIEVEMENTS,
  outfits: DEFAULT_OUTFITS,
};

/**
 * User service for managing user settings and profile
 */
export const userService = {
  /**
   * Initialize user settings and profile
   * This should be called when the app starts
   */
  initialize: async () => {
    try {
      // Check if we have settings in AsyncStorage
      const settingsJson = await AsyncStorage.getItem(USER_SETTINGS_KEY);
      const profileJson = await AsyncStorage.getItem(USER_PROFILE_KEY);
      
      // If no settings exist, create default ones
      if (!settingsJson) {
        await AsyncStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
        
        // Also try to save to Supabase if available
        try {
          await supabase.from('user_settings').upsert({
            user_id: DEFAULT_SETTINGS.user_id,
            notifications_enabled: DEFAULT_SETTINGS.notifications_enabled,
            nap_mode_enabled: DEFAULT_SETTINGS.nap_mode_enabled,
            current_outfit: DEFAULT_SETTINGS.current_outfit,
          });
        } catch (error) {
          console.log('Could not save settings to Supabase, using local storage only');
        }
      }
      
      // If no profile exists, create default one
      if (!profileJson) {
        await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(DEFAULT_PROFILE));
        
        // Also try to save to Supabase if available
        try {
          await supabase.from('user_profiles').upsert({
            user_id: DEFAULT_SETTINGS.user_id,
            name: DEFAULT_PROFILE.name,
            points: DEFAULT_PROFILE.points,
            achievements: DEFAULT_PROFILE.achievements,
            outfits: DEFAULT_PROFILE.outfits,
          });
        } catch (error) {
          console.log('Could not save profile to Supabase, using local storage only');
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing user settings:', error);
      return false;
    }
  },
  
  /**
   * Get user settings
   */
  getSettings: async (): Promise<UserSettings> => {
    try {
      // Try to get from Supabase first
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', DEFAULT_SETTINGS.user_id)
        .single();
      
      if (data && !error) {
        // Update local storage with latest from server
        await AsyncStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(data));
        return data as UserSettings;
      }
      
      // Fall back to local storage
      const settingsJson = await AsyncStorage.getItem(USER_SETTINGS_KEY);
      if (settingsJson) {
        return JSON.parse(settingsJson) as UserSettings;
      }
      
      // If all else fails, return defaults
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error getting user settings:', error);
      
      // Try local storage as fallback
      try {
        const settingsJson = await AsyncStorage.getItem(USER_SETTINGS_KEY);
        if (settingsJson) {
          return JSON.parse(settingsJson) as UserSettings;
        }
      } catch (e) {
        console.error('Error getting settings from local storage:', e);
      }
      
      return DEFAULT_SETTINGS;
    }
  },
  
  /**
   * Update user settings
   */
  updateSettings: async (settings: Partial<UserSettings>): Promise<UserSettings> => {
    try {
      // Get current settings
      const currentSettings = await userService.getSettings();
      
      // Merge with new settings
      const updatedSettings: UserSettings = {
        ...currentSettings,
        ...settings,
      };
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(updatedSettings));
      
      // Try to save to Supabase
      try {
        await supabase.from('user_settings').upsert({
          user_id: updatedSettings.user_id,
          notifications_enabled: updatedSettings.notifications_enabled,
          nap_mode_enabled: updatedSettings.nap_mode_enabled,
          current_outfit: updatedSettings.current_outfit,
        });
      } catch (error) {
        console.log('Could not save settings to Supabase, using local storage only');
      }
      
      return updatedSettings;
    } catch (error) {
      console.error('Error updating user settings:', error);
      throw error;
    }
  },
  
  /**
   * Get user profile
   */
  getProfile: async (): Promise<UserProfile> => {
    try {
      // Try to get from Supabase first
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', DEFAULT_SETTINGS.user_id)
        .single();
      
      if (data && !error) {
        // Update local storage with latest from server
        await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(data));
        return data as UserProfile;
      }
      
      // Fall back to local storage
      const profileJson = await AsyncStorage.getItem(USER_PROFILE_KEY);
      if (profileJson) {
        return JSON.parse(profileJson) as UserProfile;
      }
      
      // If all else fails, return defaults
      return DEFAULT_PROFILE;
    } catch (error) {
      console.error('Error getting user profile:', error);
      
      // Try local storage as fallback
      try {
        const profileJson = await AsyncStorage.getItem(USER_PROFILE_KEY);
        if (profileJson) {
          return JSON.parse(profileJson) as UserProfile;
        }
      } catch (e) {
        console.error('Error getting profile from local storage:', e);
      }
      
      return DEFAULT_PROFILE;
    }
  },
  
  /**
   * Update user profile
   */
  updateProfile: async (profile: Partial<UserProfile>): Promise<UserProfile> => {
    try {
      // Get current profile
      const currentProfile = await userService.getProfile();
      
      // Merge with new profile
      const updatedProfile: UserProfile = {
        ...currentProfile,
        ...profile,
      };
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(updatedProfile));
      
      // Try to save to Supabase
      try {
        await supabase.from('user_profiles').upsert({
          user_id: DEFAULT_SETTINGS.user_id,
          name: updatedProfile.name,
          points: updatedProfile.points,
          achievements: updatedProfile.achievements,
          outfits: updatedProfile.outfits,
        });
      } catch (error) {
        console.log('Could not save profile to Supabase, using local storage only');
      }
      
      return updatedProfile;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },
  
  /**
   * Add points to user profile
   */
  addPoints: async (points: number): Promise<UserProfile> => {
    const profile = await userService.getProfile();
    const updatedProfile = {
      ...profile,
      points: profile.points + points
    };
    
    return userService.updateProfile(updatedProfile);
  },
  
  /**
   * Unlock an achievement
   */
  unlockAchievement: async (achievementId: string): Promise<UserProfile> => {
    const profile = await userService.getProfile();
    
    // Find and update the achievement
    const updatedAchievements = profile.achievements.map(achievement => {
      if (achievement.id === achievementId) {
        return { ...achievement, unlocked: true };
      }
      return achievement;
    });
    
    return userService.updateProfile({
      ...profile,
      achievements: updatedAchievements
    });
  },
  
  /**
   * Unlock an outfit
   */
  unlockOutfit: async (outfitId: string): Promise<UserProfile> => {
    const profile = await userService.getProfile();
    
    // Find and update the outfit
    const updatedOutfits = profile.outfits.map(outfit => {
      if (outfit.id === outfitId) {
        return { ...outfit, unlocked: true };
      }
      return outfit;
    });
    
    return userService.updateProfile({
      ...profile,
      outfits: updatedOutfits
    });
  },
  
  /**
   * Change current outfit
   */
  changeOutfit: async (outfitId: string): Promise<UserSettings> => {
    return userService.updateSettings({ current_outfit: outfitId });
  }
};
