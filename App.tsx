
import React, { useState, useEffect, useCallback } from 'react';
import { DataProvider } from './context/DataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './views/Dashboard';
import Orders from './views/Orders';
import Customers from './views/Customers';
import Production from './views/Production';
import Stock from './views/Stock';
import Products from './views/Products'; 
import OrderDetail from './views/OrderDetail';
import NewOrder from './views/NewOrder';
import NewReturn from './views/NewReturn';
import NewCustomer from './views/NewCustomer';
import NewProductionOrder from './views/NewProductionOrder';
import Dispatch from './views/Dispatch';
import Settings from './views/Settings';
import Login from './views/Login';
import Reports from './views/Reports';
import Finance from './views/Finance';
import { HomeIcon, ShoppingCartIcon, CogIcon, ArchiveIcon, TruckIcon, ChartBarIcon, UsersIcon, CurrencyDollarIcon, TagIcon } from './components/icons/Icons';
import { User } from './types';

export type ViewType = 'dashboard' | 'orders' | 'customers' | 'production' | 'stock' | 'products' | 'orderDetail' | 'newOrder' | 'newReturn' | 'newCustomer' | 'newProductionOrder' | 'expedicao' | 'settings' | 'reports' | 'finance';

// Mapa de permissões por view
const VIEW_PERMISSIONS: Record<ViewType, string> = {
    dashboard: 'canViewDashboard',
    orders: 'canViewOrders',
    customers: 'canViewCustomers',
    production: 'canViewProduction',
    stock: 'canViewStock',
    products: 'canViewProducts',
    expedicao: 'canViewExpedicao',
    finance: 'canViewFinance',
    reports: 'canViewReports',
    settings: 'canViewSettings',
    newOrder: 'canViewOrders',
    newReturn: 'canViewStock',
    newCustomer: 'canViewCustomers',
    newProductionOrder: 'canViewProduction',
    orderDetail: 'canViewOrders'
};

interface BottomNavProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setCurrentView }) => {
    const { user } = useAuth();
    
    const navItems: { view: ViewType; label: string; icon: React.ElementType; permission: string }[] = [
        { view: 'dashboard', label: 'Home', icon: HomeIcon, permission: 'canViewDashboard' },
        { view: 'orders', label: 'Pedidos', icon: ShoppingCartIcon, permission: 'canViewOrders' },
        { view: 'production', label: 'Prod.', icon: CogIcon, permission: 'canViewProduction' },
        { view: 'stock', label: 'Estoque', icon: ArchiveIcon, permission: 'canViewStock' },
        { view: 'expedicao', label: 'Exped.', icon: TruckIcon, permission: 'canViewExpedicao' },
        { view: 'finance', label: 'Financ.', icon: CurrencyDollarIcon, permission: 'canViewFinance' },
        { view: 'customers', label: 'Clientes', icon: UsersIcon, permission: 'canViewCustomers' },
        { view: 'reports', label: 'Relat.', icon: ChartBarIcon, permission: 'canViewReports' },
    ];
    
    const hasPermission = (perm: string) => {
        if(!user) return false;
        if(user.isAdmin) return true;
        return !!(user[perm as keyof User]);
    }

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-start px-2 py-2 z-50 overflow-x-auto no-scrollbar gap-2 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
            {navItems.map(item => (
                hasPermission(item.permission) && (
                    <button
                        key={item.view}
                        onClick={() => setCurrentView(item.view)}
                        className={`flex flex-col items-center justify-center min-w-[64px] p-1 rounded-lg transition-colors flex-shrink-0 ${
                            currentView === item.view 
                            ? 'text-primary-600 dark:text-primary-400 bg-blue-50 dark:bg-gray-700' 
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                        <item.icon className="w-6 h-6 mb-1" />
                        <span className="text-[10px] leading-none font-medium">{item.label}</span>
                    </button>
                )
            ))}
        </div>
    );
};

const AppContent: React.FC = () => {
    const { user, isLoading } = useAuth();
    const [currentView, setCurrentView] = useState<ViewType | null>(null);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

    const findFirstAvailableView = useCallback((u: User): ViewType => {
        if (u.isAdmin || u.canViewDashboard) return 'dashboard';
        if (u.canViewOrders) return 'orders';
        if (u.canViewProduction) return 'production';
        if (u.canViewStock) return 'stock';
        if (u.canViewFinance) return 'finance';
        return 'orders';
    }, []);

    useEffect(() => {
        if (user && currentView === null) {
            setCurrentView(findFirstAvailableView(user));
        }
    }, [user, currentView, findFirstAvailableView]);

    useEffect(() => {
        if (user && !user.isAdmin && currentView) {
            const requiredPerm = VIEW_PERMISSIONS[currentView];
            if (requiredPerm && !(user[requiredPerm as keyof User])) {
                setCurrentView(findFirstAvailableView(user));
            }
        }
    }, [currentView, user, findFirstAvailableView]);

    if (isLoading || (user && currentView === null)) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
                <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400 font-bold animate-pulse uppercase tracking-widest text-xs">VilaFlex ERP</p>
            </div>
        );
    }

    if (!user) {
        return <Login />;
    }

    const handleViewOrder = (orderId: string) => {
        setSelectedOrderId(orderId);
        setCurrentView('orderDetail');
    };

    const renderView = () => {
        const actualView = currentView || findFirstAvailableView(user);

        switch (actualView) {
            case 'dashboard': return <Dashboard onNewOrder={() => setCurrentView('newOrder')} />;
            case 'orders': return <Orders onViewOrder={handleViewOrder} onNewOrder={() => setCurrentView('newOrder')} onNewReturn={() => setCurrentView('newReturn')} />;
            case 'customers': return <Customers onNewCustomer={() => setCurrentView('newCustomer')} />;
            case 'production': return <Production onNewProductionOrder={() => setCurrentView('newProductionOrder')} />;
            case 'stock': return <Stock />;
            case 'products': return <Products />; 
            case 'orderDetail': 
                return selectedOrderId ? <OrderDetail orderId={selectedOrderId} onBack={() => setCurrentView('orders')} /> : <Orders onViewOrder={handleViewOrder} onNewOrder={() => setCurrentView('newOrder')} onNewReturn={() => setCurrentView('newReturn')} />;
            case 'newOrder': return <NewOrder onBack={() => setCurrentView('orders')} onAddNewCustomer={() => setCurrentView('newCustomer')} />;
            case 'newReturn': return <NewReturn onBack={() => setCurrentView('stock')} />;
            case 'newCustomer': return <NewCustomer onBack={() => setCurrentView('customers')} />;
            case 'newProductionOrder': return <NewProductionOrder onBack={() => setCurrentView('production')} />;
            case 'expedicao': return <Dispatch onViewOrder={handleViewOrder} />;
            case 'finance': return <Finance />;
            case 'settings': return <Settings />;
            case 'reports': return <Reports />;
            default: return <div className="p-10 text-center">Página em construção...</div>;
        }
    };

    if (!currentView) return null;

    return (
        <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans relative">
            <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
            <div className="flex flex-col flex-1 w-full relative h-full">
                <Header onNavigate={setCurrentView} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-4 pb-20 md:pb-4">
                    {renderView()}
                </main>
                <BottomNav currentView={currentView} setCurrentView={setCurrentView} />
            </div>
        </div>
    );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
};

export default App;
