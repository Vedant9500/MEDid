import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import apiService from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth token on app load
    const token = localStorage.getItem('auth_token');
    if (token) {
      // In a real app, validate token with backend
      // For demo, create a mock user
      setUser({
        id: 'demo-user-id',
        email: 'demo@medid.com',
        name: 'Dr. Demo User',
        role: 'doctor',
        hospital: 'Demo General Hospital',
        permissions: ['patient:read', 'patient:write', 'emergency:access'],
        lastLogin: new Date(),
      });
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const response = await apiService.login(email, password);
      localStorage.setItem('auth_token', response.access_token);
      setUser(response.user);
    } catch (error) {
      throw new Error(apiService.handleApiError(error));
    }
  };

  const loginDemo = async (): Promise<void> => {
    try {
      const response = await apiService.getDemoToken();
      localStorage.setItem('auth_token', response.access_token);
      
      // Set demo user
      const demoUser: User = {
        id: response.user_info.user_id || 'demo-user',
        email: 'demo@medid.com',
        name: 'Dr. Demo User',
        role: response.user_info.role || 'doctor',
        hospital: response.user_info.hospital || 'Demo General Hospital',
        permissions: ['patient:read', 'patient:write', 'emergency:access', 'admin:read'],
        lastLogin: new Date(),
      };
      
      setUser(demoUser);
    } catch (error) {
      throw new Error(apiService.handleApiError(error));
    }
  };

  const logout = (): void => {
    localStorage.removeItem('auth_token');
    setUser(null);
    // Optionally call API logout endpoint
    apiService.logout().catch(console.error);
  };

  const updateUser = (userData: Partial<User>): void => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    loginDemo,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};