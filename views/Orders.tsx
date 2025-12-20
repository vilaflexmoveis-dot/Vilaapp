
import React, { useMemo, useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Order, OrderStatus } from '../types';
import { TrashIcon, PlusIcon, EyeIcon, EyeOffIcon, ArrowLeftIcon } from '../components/icons/Icons';
import { useAuth } from '../context/AuthContext';

export const getStatusClass = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.Open:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case OrderStatus.InProduction:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case OrderStatus.Ready:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case OrderStatus.Delivered:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case OrderStatus.Cancelled:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
};

interface OrderRowProps {
    order: Order;
    onViewOrder: (orderId: string) => void;
}

const OrderRow: React.FC<OrderRowProps> = ({ order, onViewOrder }) => {
    const { customers, orderItems, deleteOrder } = useData();
    const { user } = useAuth();
    const customer = customers.find(c => c.id === order.customerId);
    const total = useMemo(() => 
        orderItems
            .filter(item => item.orderId === order.id)
            .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
        [orderItems, order.id]
    );

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.')) {
            if(user?.email) {
                deleteOrder(order.id, user.email);
            }
        }
    };

    return (
        <tr 
            className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
            onClick={() => onViewOrder(order.id)}
        >
            <td className="py-3 px-4 sm:px-6 text-left whitespace-nowrap">#{order.orderNumber}</td>
            <td className="py-3 px-4 sm:px-6 text-left font-medium">{customer?.name || 'N/A'}</td>
            <td className="py-3 px-4 sm:px-6 text-center">{new Date(order.orderDate).toLocaleDateString('pt-BR')}</td>
            <td className="py-3 px-4 sm:px-6 text-center">
                <span className={`py-1 px-3 rounded-full text-xs font-bold ${getStatusClass(order.status)}`}>
                    {order.status}
                </span>
            </td>
            <td className="py-3 px-4 sm:px-6 text-right font-bold text-primary-600">
                {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </td>
            <td className="py-3 px-4 sm:px-6 text-center">
                <button 
                    onClick={handleDelete} 
                    className="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 dark:hover:bg-gray-700 transition-colors"
                    title="Excluir Pedido"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            </td>
        </tr>
    );
}

interface OrdersProps {
    onViewOrder: (orderId: string) => void;
    onNewOrder: () => void;
    onNewReturn: () => void;
}

const Orders: React.FC<OrdersProps> = ({ onViewOrder, onNewOrder, onNewReturn }) => {
  const { orders, customers } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  const [showDelivered, setShowDelivered] = useState(false);
  const [visibleCount, setVisibleCount] = useState(15);

  useEffect(() => {
    setVisibleCount(15);
  }, [searchTerm, filterStatus, showDelivered]);

  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Se showDelivered for falso, remove os entregues, a menos que o filtro de status seja especificamente "Entregue"
    if (!showDelivered && filterStatus !== OrderStatus.Delivered) {
        filtered = filtered.filter(o => o.status !== OrderStatus.Delivered);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(order => order.status === filterStatus);
    }

    if (searchTerm.trim() !== '') {
      const lowercasedSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(order => {
        const customer = customers.find(c => c.id === order.customerId);
        return customer?.name.toLowerCase().includes(lowercasedSearch) || 
               order.orderNumber.toString().includes(searchTerm);
      });
    }
    
    return filtered;
  }, [orders, customers, searchTerm, filterStatus, showDelivered]);

  const sortedOrders = filteredOrders.sort((a, b) => b.orderNumber - a.orderNumber);
  const displayedOrders = sortedOrders.slice(0, visibleCount);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 15);
  };

  return (
    <div className="container mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Pedidos</h1>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Buscar cliente ou nº..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow sm:w-48 px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as OrderStatus | 'all')}
            className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          >
            <option value="all">Todos Status</option>
            {Object.values(OrderStatus).map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          
          <button 
            onClick={() => setShowDelivered(!showDelivered)}
            className={`p-2 rounded-lg border transition-all ${showDelivered ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-300 dark:border-gray-600'}`}
            title={showDelivered ? "Ocultar Entregues" : "Mostrar Entregues"}
          >
            {showDelivered ? <EyeIcon className="w-5 h-5" /> : <EyeOffIcon className="w-5 h-5" />}
          </button>

          <button 
            onClick={onNewReturn}
            className="bg-orange-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-700 transition duration-300 flex items-center shadow-md"
            title="Registrar Devolução de Itens"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1 rotate-45" /> Devolução
          </button>

          <button 
            onClick={onNewOrder}
            className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-700 transition duration-300 flex items-center shadow-md"
          >
            <PlusIcon className="w-5 h-5 mr-1" /> Novo Pedido
          </button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase text-xs font-bold leading-normal">
                    <tr>
                        <th className="py-3 px-4 sm:px-6 text-left">Nº</th>
                        <th className="py-3 px-4 sm:px-6 text-left">Cliente</th>
                        <th className="py-3 px-4 sm:px-6 text-center">Data</th>
                        <th className="py-3 px-4 sm:px-6 text-center">Status</th>
                        <th className="py-3 px-4 sm:px-6 text-right">Total</th>
                        <th className="py-3 px-4 sm:px-6 text-center">Ações</th>
                    </tr>
                </thead>
                <tbody className="text-gray-800 dark:text-gray-200 text-sm font-light">
                    {displayedOrders.map(order => (
                        <OrderRow key={order.id} order={order} onViewOrder={onViewOrder} />
                    ))}
                    {displayedOrders.length === 0 && (
                        <tr>
                            <td colSpan={6} className="text-center py-10 text-gray-500">Nenhum pedido encontrado.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
        
        {visibleCount < sortedOrders.length && (
            <div className="p-4 text-center border-t border-gray-200 dark:border-gray-700">
                <button 
                    onClick={handleLoadMore}
                    className="text-primary-600 dark:text-primary-400 font-bold hover:underline"
                >
                    + Carregar mais pedidos
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
