
import React, { useState } from 'react';
import { ViewType } from '../App';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { HomeIcon, ShoppingCartIcon, UsersIcon, CogIcon, ArchiveIcon, TruckIcon, ChartBarIcon, CurrencyDollarIcon, TagIcon, ArchiveIcon as SyncIcon } from './icons/Icons';
import { User } from '../types';

interface SidebarProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
  const { user } = useAuth();
  const { syncFromGoogleSheetUrl, googleSheetUrl } = useData();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = async () => {
      if (isSyncing) return;
      setIsSyncing(true);
      try {
          await syncFromGoogleSheetUrl(googleSheetUrl, false);
      } finally {
          setIsSyncing(false);
      }
  };

  const navItems: { view: ViewType; label: string; icon: React.ElementType; permission: string }[] = [
    { view: 'dashboard', label: 'Dashboard', icon: HomeIcon, permission: 'canViewDashboard' },
    { view: 'orders', label: 'Pedidos', icon: ShoppingCartIcon, permission: 'canViewOrders' },
    { view: 'customers', label: 'Clientes', icon: UsersIcon, permission: 'canViewCustomers' },
    { view: 'production', label: 'Produção', icon: CogIcon, permission: 'canViewProduction' },
    { view: 'expedicao', label: 'Expedição', icon: TruckIcon, permission: 'canViewExpedicao' },
    { view: 'stock', label: 'Estoque', icon: ArchiveIcon, permission: 'canViewStock' },
    { view: 'products', label: 'Produtos', icon: TagIcon, permission: 'canViewProducts' },
    { view: 'finance', label: 'Financeiro', icon: CurrencyDollarIcon, permission: 'canViewFinance' },
    { view: 'reports', label: 'Relatórios', icon: ChartBarIcon, permission: 'canViewReports' },
  ];
  
  const hasPermission = (perm: string) => {
      if(!user) return false;
      if(user.isAdmin) return true;
      return !!(user[perm as keyof User]);
  }

  return (
    <div className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <div className="flex flex-col items-center justify-center h-20 border-b border-gray-200 dark:border-gray-700 px-4">
         <button 
            onClick={handleManualSync}
            className={`text-2xl font-extrabold text-primary-600 dark:text-primary-400 hover:opacity-80 transition-all flex items-center gap-2 ${isSyncing ? 'animate-pulse' : ''}`}
            title="Clique para Sincronizar"
         >
            VilaFlex
            {isSyncing && <SyncIcon className="w-4 h-4 animate-spin" />}
         </button>
         <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">v2.8.5 - Stable</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <nav className="flex-1 px-2 py-4 space-y-2">
          {navItems.map(item => (
            hasPermission(item.permission) && (
            <button
              key={item.view}
              onClick={() => setCurrentView(item.view)}
              className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                currentView === item.view
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </button>
            )
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
