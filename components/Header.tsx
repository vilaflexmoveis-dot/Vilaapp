
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserCircleIcon, CogIcon, BellIcon, ArchiveIcon, ShoppingCartIcon, ArchiveIcon as SyncIcon } from './icons/Icons';
import { ViewType } from '../App';
import { OrderStatus } from '../types';

interface HeaderProps {
  onNavigate: (view: ViewType) => void;
}

const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const { orders, products, orderItems, syncFromGoogleSheetUrl, googleSheetUrl } = useData();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
        await syncFromGoogleSheetUrl(googleSheetUrl, false);
    } finally {
        setIsSyncing(false);
    }
  };

  // Close notifications on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
            setShowNotifications(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Calculate notifications
  const openOrdersCount = useMemo(() => orders.filter(o => o.status === OrderStatus.Open).length, [orders]);
  
  const lowStockCount = useMemo(() => {
    return products.filter(product => {
      const committed = orderItems.reduce((sum, item) => {
        const order = orders.find(o => o.id === item.orderId);
        if (item.productId === product.id && order && order.status !== OrderStatus.Delivered && order.status !== OrderStatus.Cancelled) {
          return sum + item.quantity;
        }
        return sum;
      }, 0);
      return (product.currentStock - committed) < (product.minimumStock || 0);
    }).length;
  }, [products, orderItems, orders]);

  const totalNotifications = openOrdersCount + lowStockCount;

  return (
    <header className="flex items-center justify-between h-16 px-4 sm:px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-4">
        <button 
          onClick={handleManualSync}
          className={`text-xl font-black text-primary-600 dark:text-primary-400 md:hidden flex items-center gap-1 ${isSyncing ? 'animate-pulse' : ''}`}
        >
          VilaFlex
          {isSyncing && <SyncIcon className="w-3.5 h-3.5 animate-spin" />}
        </button>
        <h2 className="hidden sm:block text-lg font-semibold text-gray-700 dark:text-gray-200 truncate max-w-[150px]">Olá, {user?.name.split(' ')[0]}!</h2>
      </div>
      <div className="flex items-center space-x-2 sm:space-x-4">
        
        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
            <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-1 rounded-full text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 focus:outline-none transition-colors"
                title="Notificações"
            >
                <BellIcon className="w-6 h-6" />
                {totalNotifications > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                        {totalNotifications}
                    </span>
                )}
            </button>

            {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden z-50 animate-fade-in-down">
                    <div className="py-2">
                        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Notificações</h3>
                        </div>
                        {totalNotifications === 0 ? (
                            <div className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                Nenhuma notificação nova.
                            </div>
                        ) : (
                            <>
                                {openOrdersCount > 0 && (
                                    <button 
                                        onClick={() => { onNavigate('orders'); setShowNotifications(false); }}
                                        className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center transition-colors"
                                    >
                                        <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900 rounded-full p-2">
                                            <ShoppingCartIcon className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                {openOrdersCount} Pedido(s) Aberto(s)
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Aguardando produção/aprovação.
                                            </p>
                                        </div>
                                    </button>
                                )}
                                {lowStockCount > 0 && (
                                    <button 
                                        onClick={() => { onNavigate('stock'); setShowNotifications(false); }}
                                        className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center transition-colors border-t border-gray-100 dark:border-gray-700"
                                    >
                                        <div className="flex-shrink-0 bg-red-100 dark:bg-red-900 rounded-full p-2">
                                            <ArchiveIcon className="w-5 h-5 text-red-600 dark:text-red-300" />
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                {lowStockCount} Produto(s) com Estoque Baixo
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Verifique o inventário.
                                            </p>
                                        </div>
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>

        <div className="flex items-center">
            {user?.isAdmin && (
              <button 
                onClick={() => onNavigate('settings')}
                className="mr-3 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
                title="Configurações"
              >
                <CogIcon className="w-6 h-6" />
              </button>
            )}
            <UserCircleIcon className="w-8 h-8 text-gray-500" />
            <span className="hidden sm:inline ml-2 text-sm font-medium text-gray-700 dark:text-gray-200">{user?.name}</span>
        </div>
        <button 
            onClick={logout}
            className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
        >
            Sair
        </button>
      </div>
    </header>
  );
};

export default Header;
