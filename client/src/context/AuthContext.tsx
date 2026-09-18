import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole, Property } from '../types';
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

const DEFAULT_PROPERTY: Property = {
  id: 'prop-1',
  name: 'Urban Nest Platinum Living',
  address: 'Plot 42, Sector 45, Near Huda City Centre, Gurugram',
  city: 'Gurugram',
  phone: '+91 98765 43210',
  email: 'gurgaon@urbannestpg.com',
  totalRooms: 12,
  occupiedRooms: 10,
  totalBeds: 24,
  occupiedBeds: 20,
  type: 'CO_LIVING',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('urbannest_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeProperty, setActiveProperty] = useState<Property>(DEFAULT_PROPERTY);
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
            residentId: res.data.residentId,
          };
          setUser(authUser);
          localStorage.setItem('urbannest_user_session', JSON.stringify(authUser));

          // Fetch properties for owner/staff
          if (authUser.role === 'OWNER' || authUser.role === 'SUPER_ADMIN' || authUser.role === 'MANAGER' || authUser.role === 'STAFF') {
            try {
              const propRes = await api.get<any[]>('/owner/properties');
              if (propRes.data && propRes.data.length > 0) {
                const p = propRes.data[0];
                setActiveProperty({
                  id: p.id,
                  name: p.name,
                  address: p.address,
                  city: p.city || 'Gurugram',
                  totalRooms: p._count?.rooms || p.totalRooms || 0,
                  occupiedRooms: p._count?.residents || p.occupiedRooms || 0,
                  totalBeds: p._count?.beds || 0,
                  occupiedBeds: p._count?.residents || 0,
                  type: (p.type || 'BOYS') as any,
                });
              }
            } catch {
              // Ignore property fetch error
            }
          }
        } else {
          // No user data returned from /auth/me
          api.setToken(null);
          localStorage.removeItem('urbannest_user_session');
          setUser(null);
        }
      } catch (err: any) {
        console.warn('Session verification failed:', err.message);
        // Clear invalid token & session on 401/403
        api.setToken(null);
        localStorage.removeItem('urbannest_user_session');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password = 'admin123', selectedRole?: UserRole): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();

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
        email: cleanEmail,
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
          residentId: res.data.user.residentId,
        };
        setUser(loggedInUser);
        localStorage.setItem('urbannest_user_session', JSON.stringify(loggedInUser));

        // Fetch properties if owner/staff
        if (loggedInUser.role === 'OWNER' || loggedInUser.role === 'SUPER_ADMIN' || loggedInUser.role === 'MANAGER') {
          try {
            const propRes = await api.get<any[]>('/owner/properties');
            if (propRes.data && propRes.data.length > 0) {
              const p = propRes.data[0];
              setActiveProperty({
                id: p.id,
                name: p.name,
                address: p.address,
                city: p.city || 'Gurugram',
                totalRooms: p._count?.rooms || p.totalRooms || 0,
                occupiedRooms: p._count?.residents || p.occupiedRooms || 0,
                totalBeds: p._count?.beds || 0,
                occupiedBeds: p._count?.residents || 0,
                type: (p.type || 'BOYS') as any,
              });
            }
          } catch {
            // ignore
          }
        }

        setIsLoading(false);
        return true;
      }
      throw new Error(res.message || 'Invalid server response during authentication.');
    } catch (err: any) {
      const errMsg = err.message || 'Unable to connect to server. Please try again.';
      setError(errMsg);
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors during logout
    } finally {
      api.setToken(null);
      localStorage.removeItem('urbannest_user_session');
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
        role: user ? user.role : 'OWNER',
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
