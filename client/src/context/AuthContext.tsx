import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole, Property } from '../types';
import { MOCK_PROPERTIES } from '../data/mockData';
import api from '../lib/api';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  activeProperty: Property;
  setActiveProperty: (property: Property) => void;
  switchRole: (role: UserRole) => void;
  login: (email: string, password?: string, selectedRole?: UserRole) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeProperty, setActiveProperty] = useState<Property>(MOCK_PROPERTIES[0]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check existing session token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = api.getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await api.get<{
          id: string;
          name: string;
          email: string;
          role: UserRole;
          mobile?: string;
          propertyId?: string;
          residentId?: string;
        }>('/auth/me');

        if (res.data) {
          const authUser: User = {
            id: res.data.id,
            name: res.data.name,
            email: res.data.email,
            role: res.data.role,
            mobile: res.data.mobile || '',
            propertyId: res.data.propertyId || 'prop-1',
          };
          setUser(authUser);

          // Fetch properties for owner
          if (authUser.role === 'OWNER' || authUser.role === 'STAFF') {
            try {
              const propRes = await api.get<any[]>('/owner/properties');
              if (propRes.data && propRes.data.length > 0) {
                const p = propRes.data[0];
                setActiveProperty({
                  id: p.id,
                  name: p.name,
                  address: p.address,
                  city: p.city,
                  totalRooms: p._count?.rooms || p.totalRooms || 24,
                  occupiedRooms: p._count?.residents || p.occupiedRooms || 20,
                  totalBeds: p._count?.beds || 48,
                  occupiedBeds: p._count?.residents || 41,
                  type: (p.type || 'BOYS') as any,
                });
              }
            } catch {
              // Ignore if properties endpoint fails
            }
          }
        }
      } catch (err: any) {
        console.warn('Session check failed or expired:', err.message);
        api.setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password = 'admin123', selectedRole: UserRole = 'RESIDENT'): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.post<{
        token: string;
        user: {
          id: string;
          name: string;
          email: string;
          role: UserRole;
          mobile?: string;
          propertyId?: string;
          residentId?: string;
        };
      }>('/auth/login', {
        email: email.trim(),
        password,
      });

      if (res.data && res.data.token) {
        api.setToken(res.data.token);
        const loggedInUser: User = {
          id: res.data.user.id,
          name: res.data.user.name,
          email: res.data.user.email,
          role: res.data.user.role,
          mobile: res.data.user.mobile || '',
          propertyId: res.data.user.propertyId || 'prop-1',
        };
        setUser(loggedInUser);
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Login error:', err.message);
      setError(err.message || 'Login failed. Please verify credentials.');
      // Fallback in case backend server is temporarily starting
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors during logout
    } finally {
      api.setToken(null);
      setUser(null);
    }
  };

  const switchRole = async (newRole: UserRole) => {
    setIsLoading(true);
    const targetEmail = newRole === 'RESIDENT' ? 'aakash.v@gmail.com' : 'owner@pg.com';
    await login(targetEmail, 'admin123', newRole);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : 'RESIDENT',
        activeProperty,
        setActiveProperty,
        switchRole,
        login,
        logout,
        isLoading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
