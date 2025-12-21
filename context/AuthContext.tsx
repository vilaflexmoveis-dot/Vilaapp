
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User } from '../types';
import { mockUsers } from '../data/mockData';

interface AuthContextType {
  user: User | null;
  login: (identifier: string, password?: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Credenciais Master Fixas para emergência (Sincronia perdida)
const MASTER_ADMIN_USER = 'Admin';
const MASTER_ADMIN_PASS = 'Bqnsepc10@@';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage for persisted user
    const storedUser = localStorage.getItem('factory_user');
    if (storedUser) {
        try {
            setUser(JSON.parse(storedUser));
        } catch (e) {
            console.error("Failed to parse stored user", e);
            localStorage.removeItem('factory_user');
        }
    }
    setIsLoading(false);
  }, []);

  const login = async (identifier: string, password?: string): Promise<boolean> => {
    const cleanIdentifier = identifier.trim();
    const cleanPassword = password ? String(password) : '';

    // 1. CHECAGEM MASTER (Override absoluto para casos de erro de sincronia)
    if (
      (cleanIdentifier.toLowerCase() === MASTER_ADMIN_USER.toLowerCase() || 
       cleanIdentifier.toLowerCase() === 'admin@vilaflex.com.br') && 
      cleanPassword === MASTER_ADMIN_PASS
    ) {
        const adminFallback: User = mockUsers.find(u => u.name === 'Admin') || {
            id: 'MASTER-ADMIN',
            name: 'Admin',
            email: 'admin@vilaflex.com.br',
            isAdmin: true,
            canViewDashboard: true,
            canViewOrders: true,
            canViewCustomers: true,
            canViewProduction: true,
            canViewExpedicao: true,
            canViewStock: true,
            canViewProducts: true,
            canViewFinance: true,
            canViewReports: true,
            canViewSettings: true
        };
        setUser(adminFallback);
        localStorage.setItem('factory_user', JSON.stringify(adminFallback));
        return true;
    }

    // 2. BUSCA NORMAL (Usuários sincronizados ou locais)
    let currentUsers: User[] = [];
    const storedAppUsers = localStorage.getItem('factory_app_users');
    if (storedAppUsers) {
        try {
            currentUsers = JSON.parse(storedAppUsers);
        } catch (e) {
            console.error("Failed to parse stored app users", e);
        }
    }

    // Garante o admin padrão do mockData na lista se ele não estiver
    const defaultAdmin = mockUsers.find(u => u.name === 'Admin');
    if (defaultAdmin && !currentUsers.some(u => u.name === 'Admin')) {
        currentUsers.push(defaultAdmin);
    }

    const foundUser = currentUsers.find(u => 
        (u.email && u.email.toLowerCase() === cleanIdentifier.toLowerCase()) || 
        (u.name === cleanIdentifier) ||
        (u.name.toLowerCase() === cleanIdentifier.toLowerCase() && u.name === 'Admin')
    );
    
    // Check password if provided
    if (foundUser && (!password || String(foundUser.password) === cleanPassword)) {
        setUser(foundUser);
        localStorage.setItem('factory_user', JSON.stringify(foundUser));
        return true;
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('factory_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
