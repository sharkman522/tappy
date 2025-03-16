// User and settings related types
export interface UserSettings {
  id?: string;
  user_id: string;
  notifications_enabled: boolean;
  nap_mode_enabled: boolean;
  current_outfit: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile {
  id?: string;
  name: string;
  points: number;
  achievements: Achievement[];
  outfits: Outfit[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
}

export interface Outfit {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  pointsRequired?: number;
}
