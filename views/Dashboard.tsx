
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import Card from '../components/Card';
import { CurrencyDollarIcon, ArchiveIcon, PlusIcon, CheckCircleIcon, CogIcon, TruckIcon, ShoppingCartIcon } from '../components/icons/Icons';
import { OrderStatus, ProductionStatus } from '../types';
import Modal from '../components/Modal';
import { getStatusClass } from './Orders';
import { useAuth } from '../context/AuthContext';

interface DashboardProps {
    onNewOrder: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNewOrder }) => {
  const { orders, payments, products, customers, orderItems, productionOrders } = useData();
  const { user } = useAuth();
  const [modalContent, setModalContent] = useState<'productionToday' | 'salesToday' | 'lowStock' | 'readyForDispatch' | null>(null);

  // Helper para normalizar datas de qualquer fonte (String ISO, DD/MM/YYYY ou Date Object)
  const normalizeDate = (dateVal: any): string => {
    if (!dateVal) return '';
    try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) {
            // Se falhar, tenta tratar formatos manuais comuns (DD/MM/YYYY)
            if (typeof dateVal === 'string' && dateVal.includes('/')) {
                const parts = dateVal.split('/');
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
            return '';
        }
        return d.toISOString().split('T')[0];
    } catch (e) {
        return '';
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Vendas de Hoje (Baseado em PEDIDOS criados hoje)
  const salesTodayList = useMemo(() => {
    return (orders || []).filter(o => {
        if (!o || !o.orderDate) return false;
        return normalizeDate(o.orderDate) === todayStr && o.status !== OrderStatus.Cancelled;
    });
  }, [orders, todayStr]);

  const salesTodayValue = useMemo(() => {
    return salesTodayList.reduce((sum, order) => {
        const items = (orderItems || []).filter(i => i.orderId === order.id);
        const total = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unitPrice) || 0), 0);
        return sum + total;
    }, 0);
  }, [salesTodayList, orderItems]);

  // 2. Produção de Hoje (Unidades finalizadas hoje)
  const productionTodayList = useMemo(() => {
    return (productionOrders || []).filter(p => 
        p && p.status === ProductionStatus.Finished && 
        p.completionDate && normalizeDate(p.completionDate) === todayStr
    );
  }, [productionOrders, todayStr]);

  const productionTodayCount = useMemo(() => {
    return productionTodayList.reduce((sum, p) => sum + (Number(p.produced) || 0), 0);
  }, [productionTodayList]);

  // 3. Prontos para Expedição
  const readyForDispatchList = useMemo(() => (orders || []).filter(o => o && o.status === OrderStatus.Ready), [orders]);
  
  // 4. Estoque Baixo
  const lowStockProductsList = useMemo(() => {
    if (!products) return [];
    return products.map(product => {
        const committed = (orderItems || []).reduce((sum, item) => {
            if (!item || item.productId !== product.id) return sum;
            const order = (orders || []).find(o => o.id === item.orderId);
            if (order && order.status !== OrderStatus.Delivered && order.status !== OrderStatus.Cancelled) {
                return sum + (Number(item.quantity) || 0);
            }
            return sum;
        }, 0);
        const availableStock = (Number(product.currentStock) || 0) - committed;
        return { ...product, availableStock };
    }).filter(p => p.availableStock < (Number(p.minimumStock) || 0));
  }, [products, orderItems, orders]);

  const getModalTitle = () => {
    if (modalContent === 'productionToday') return 'Produção de Hoje';
    if (modalContent === 'salesToday') return 'Novas Vendas (Hoje)';
    if (modalContent === 'lowStock') return 'Produtos com Estoque Baixo';
    if (modalContent === 'readyForDispatch') return 'Pedidos Prontos para Liberação';
    return '';
  };

  // Safe search for customer names to prevent crashes
  const getCustomerName = (id: string) => customers?.find(c => c.id === id)?.name || 'N/A';

  return (
    <div className="container mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Dashboard Admin</h1>
        {(user?.isAdmin || user?.isSales) && (
            <button
                onClick={onNewOrder}
                className="w-full sm:w-auto flex items-center justify-center bg-primary-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-700 transition duration-300 shadow-md touch-manipulation"
            >
                <PlusIcon className="w-5 h-5 mr-2" />
                Novo Pedido
            </button>
        )}
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <button onClick={() => setModalContent('salesToday')} className="text-left w-full hover:scale-[1.01] transition-transform">
            <Card title="Vendas Hoje (Pedidos)" value={salesTodayValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={ShoppingCartIcon} color="bg-green-600" />
        </button>
        <button onClick={() => setModalContent('productionToday')} className="text-left w-full hover:scale-[1.01] transition-transform">
            <Card title="Produção Hoje (Unid.)" value={productionTodayCount} icon={CogIcon} color="bg-blue-600" />
        </button>
        <button onClick={() => setModalContent('readyForDispatch')} className="text-left w-full hover:scale-[1.01] transition-transform">
            <Card title="Prontos p/ Expedição" value={readyForDispatchList.length} icon={CheckCircleIcon} color="bg-purple-600" />
        </button>
        <button onClick={() => setModalContent('lowStock')} className="text-left w-full hover:scale-[1.01] transition-transform">
            <Card title="Estoque Crítico" value={lowStockProductsList.length} icon={ArchiveIcon} color="bg-red-600" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Vendas de Hoje - Listagem */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-[400px]">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200 flex items-center">
                    <ShoppingCartIcon className="w-6 h-6 mr-2 text-green-600" />
                    Novos Pedidos (Hoje)
                </h2>
                <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full">{salesTodayList.length} total</span>
            </div>
            <div className="flex-1 overflow-y-auto">
                {salesTodayList.length > 0 ? (
                    <table className="min-w-full table-auto text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                            <tr>
                                <th className="py-2 px-3 text-left">Cliente</th>
                                <th className="py-2 px-3 text-right">Valor Pedido</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                            {salesTodayList.map(order => {
                                const orderTotal = orderItems.filter(i => i.orderId === order.id).reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
                                return (
                                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="py-3 px-3">
                                            <p className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-[180px]">{getCustomerName(order.customerId)}</p>
                                            <p className="text-[10px] text-gray-500 uppercase">Pedido #{order.orderNumber}</p>
                                        </td>
                                        <td className="py-3 px-3 text-right font-black text-green-600">
                                            {orderTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                        <ShoppingCartIcon className="w-12 h-12 mb-2" />
                        <p className="text-sm font-medium">Nenhum pedido hoje ainda.</p>
                    </div>
                )}
            </div>
        </div>

        {/* Produção de Hoje - Listagem */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-[400px]">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200 flex items-center">
                    <CogIcon className="w-6 h-6 mr-2 text-blue-600" />
                    Finalizados Hoje
                </h2>
                <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">{productionTodayCount} un.</span>
            </div>
            <div className="flex-1 overflow-y-auto">
                {productionTodayList.length > 0 ? (
                    <table className="min-w-full table-auto text-sm">
                         <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                            <tr>
                                <th className="py-2 px-3 text-left">Produto</th>
                                <th className="py-2 px-3 text-center">Qtd.</th>
                                <th className="py-2 px-3 text-right">Hora</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                            {productionTodayList.map(p => {
                                const product = products.find(prod => prod.id === p.productId);
                                return (
                                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="py-3 px-3">
                                            <p className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-[150px]">{product?.name || 'Desconhecido'}</p>
                                        </td>
                                        <td className="py-3 px-3 text-center font-black text-blue-600">{p.produced}</td>
                                        <td className="py-3 px-3 text-right text-xs text-gray-500">
                                            {p.completionDate ? new Date(p.completionDate).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                        <CogIcon className="w-12 h-12 mb-2" />
                        <p className="text-sm font-medium">Nenhum lote finalizado hoje.</p>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Modais de Detalhe */}
      <Modal isOpen={modalContent !== null} onClose={() => setModalContent(null)} title={getModalTitle()}>
        <div className="overflow-x-auto min-h-[200px]">
        {modalContent === 'salesToday' && (
             <table className="min-w-full table-auto">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase text-xs font-bold leading-normal">
                    <tr>
                        <th className="py-3 px-4 text-left">Nº Pedido</th>
                        <th className="py-3 px-4 text-left">Cliente</th>
                        <th className="py-3 px-4 text-right">Valor Total</th>
                    </tr>
                </thead>
                <tbody className="text-gray-800 dark:text-gray-200 text-sm">
                    {salesTodayList.map(order => {
                        const total = orderItems.filter(i => i.orderId === order.id).reduce((s, it) => s + (it.quantity * it.unitPrice), 0);
                        return (
                            <tr key={order.id} className="border-b dark:border-gray-700">
                                <td className="py-3 px-4 font-bold">#{order.orderNumber}</td>
                                <td className="py-3 px-4">{getCustomerName(order.customerId)}</td>
                                <td className="py-3 px-4 text-right font-black text-green-600">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        )}
        {modalContent === 'productionToday' && (
           <table className="min-w-full table-auto">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase text-xs font-bold">
                    <tr>
                        <th className="py-3 px-4 text-left">Produto</th>
                        <th className="py-3 px-4 text-center">Quantidade</th>
                        <th className="py-3 px-4 text-center">Hora</th>
                    </tr>
                </thead>
                <tbody className="text-gray-800 dark:text-gray-200 text-sm">
                    {productionTodayList.map(p => (
                        <tr key={p.id} className="border-b dark:border-gray-700">
                            <td className="py-3 px-4">{products.find(prod => prod.id === p.productId)?.name}</td>
                            <td className="py-3 px-4 text-center font-bold">{p.produced}</td>
                            <td className="py-3 px-4 text-center">{p.completionDate ? new Date(p.completionDate).toLocaleTimeString() : '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
        {modalContent === 'lowStock' && (
            <table className="min-w-full table-auto">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase text-xs font-bold">
                    <tr>
                        <th className="py-3 px-4 text-left">Produto</th>
                        <th className="py-3 px-4 text-center">Disponível</th>
                        <th className="py-3 px-4 text-center">Mínimo</th>
                    </tr>
                </thead>
                <tbody className="text-gray-800 dark:text-gray-200 text-sm">
                    {lowStockProductsList.map(product => (
                        <tr key={product.id} className="border-b dark:border-gray-700">
                            <td className="py-3 px-4 font-medium">{product.name}</td>
                            <td className="py-3 px-4 text-center font-bold text-red-600">{product.availableStock}</td>
                            <td className="py-3 px-4 text-center text-gray-500">{product.minimumStock || 0}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
