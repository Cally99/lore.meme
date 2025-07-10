// src/lib/api/clients/userClient.ts
import { BaseApiClient } from './baseClient';

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  bio?: string;
  website?: string;
  location?: string;
}

export interface ProfileCompletion {
  sections: {
    personal: boolean;
    skills: boolean;
    experience: boolean;
    education: boolean;
    projects: boolean;
    resume: boolean;
  };
}

export interface NotificationPreferences {
  email: {
    jobAlerts: boolean;
    applicationUpdates: boolean;
    marketing: boolean;
  };
  web: {
    jobAlerts: boolean;
    applicationUpdates: boolean;
    messages: boolean;
  };
}

export class UserClient extends BaseApiClient {
  constructor() {
    super('/api/user');
  }
  
  async getProfile() {
    return this.get('/profile');
  }
  
  async updateProfile(data: UserProfile) {
    return this.put('/profile', data);
  }
  
  async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);
    
return this.upload('/avatar', formData);
  }
  
  async getProfileCompletion() {
    return this.get<ProfileCompletion>('/profile-completion');
  }
  
  async getNotificationPreferences() {
    return this.get<NotificationPreferences>('/notification-preferences');
  }
  
  async updateNotificationPreferences(preferences: NotificationPreferences) {
    return this.put('/notification-preferences', preferences);
  }
  
  async deactivateAccount(reason?: string) {
    return this.post('/deactivate', { reason });
  }
}

// Create a singleton instance
export const userClient = new UserClient();
