
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeftIcon, DocumentDownloadIcon, XCircleIcon } from '../components/icons/Icons';
import { OrderStatus } from '../types';

const getStatusClass = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.Open: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case OrderStatus.InProduction: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case OrderStatus.Ready: return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case OrderStatus.Delivered: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case OrderStatus.Cancelled: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
};

const formatSafeDate = (dateVal?: string | number | Date) => {
    if (!dateVal || dateVal === '0' || dateVal === 'null' || dateVal === 'undefined') return 'Não informada';
    
    try {
        // Se for string no formato YYYY-MM-DD, tratamos diretamente para evitar deslocamento de fuso
        if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
            const [year, month, day] = dateVal.split('-').map(Number);
            return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
        }

        const d = new Date(dateVal);
        if (isNaN(d.getTime()) || d.getFullYear() < 1900) return 'Não informada';
        return d.toLocaleDateString('pt-BR');
    } catch (e) {
        return 'Não informada';
    }
};

interface OrderDetailProps {
  orderId: string;
  onBack: () => void;
}

const OrderDetail: React.FC<OrderDetailProps> = ({ orderId, onBack }) => {
  const { orders, customers, orderItems, products, updateOrderStatus, payments } = useData();
  const { user } = useAuth();

  const order = orders.find(o => o.id === orderId);
  if (!order) return <div className="text-center p-10"><h2 className="text-2xl font-bold mb-4">Pedido não encontrado</h2><button onClick={onBack} className="text-primary-600 hover:underline">Voltar</button></div>;

  const customer = customers.find(c => c.id === order.customerId);
  const items = orderItems.filter(item => item.orderId === order.id);
  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const handleCancelOrder = () => {
    if (!user?.email) return;
    if (window.confirm('Deseja CANCELAR este pedido?')) {
      updateOrderStatus(order.id, OrderStatus.Cancelled, user.email);
    }
  };

  const isFinalStatus = order.status === OrderStatus.Delivered || order.status === OrderStatus.Cancelled;

  return (
    <div className="container mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <button onClick={onBack} className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors mr-4">
          <ArrowLeftIcon className="w-5 h-5 mr-2" /> Voltar
        </button>
        <div className="text-right">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Pedido #{order.orderNumber}</h1>
            <span className={`mt-1 inline-block py-1 px-3 rounded-full text-sm font-semibold ${getStatusClass(order.status)}`}>{order.status}</span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-tighter">Cliente</h3>
                <p className="font-bold text-lg text-gray-800 dark:text-gray-100">{customer?.name}</p>
                <p className="text-gray-600 dark:text-gray-300 text-xs">{customer?.phone}</p>
            </div>
            <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-tighter">Data do Pedido</h3>
                <p className="font-bold text-lg text-gray-800 dark:text-gray-100">{new Date(order.orderDate).toLocaleDateString('pt-BR')}</p>
            </div>
            <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-tighter text-primary-600 font-black">Previsão Entrega</h3>
                <p className="font-black text-lg text-primary-600">{formatSafeDate(order.deliveryDate)}</p>
            </div>
            <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-tighter">Criado Por</h3>
                <p className="font-medium text-gray-800 dark:text-gray-100 text-xs truncate">{order.createdBy}</p>
            </div>
        </div>
        {order.notes && (
            <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase mb-1">Observações</h3>
                <p className="text-gray-800 dark:text-gray-200 bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-md border border-yellow-200 dark:border-yellow-900/50 whitespace-pre-line text-sm">{order.notes}</p>
            </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6">
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 font-black uppercase text-xs">
                    <tr><th className="px-6 py-3">Produto</th><th className="px-6 py-3 text-center">Qtd</th><th className="px-6 py-3 text-right">Preço Unit.</th><th className="px-6 py-3 text-right">Total</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {items.map(item => (
                        <tr key={item.id} className="dark:text-gray-300">
                            <td className="px-6 py-4 font-bold">{products.find(p => p.id === item.productId)?.name || 'N/A'}</td>
                            <td className="px-6 py-4 text-center font-bold">{item.quantity}</td>
                            <td className="px-6 py-4 text-right">{item.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            <td className="px-6 py-4 text-right font-bold">{(item.quantity * item.unitPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-700">
                    <tr><td colSpan={3} className="px-6 py-4 text-right font-black text-gray-900 dark:text-white">TOTAL GERAL</td><td className="px-6 py-4 text-right font-black text-primary-600 text-lg">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td></tr>
                </tfoot>
            </table>
        </div>
      </div>
      
      <div className="flex justify-end space-x-4 pb-10">
        {!isFinalStatus && (
            <button onClick={handleCancelOrder} className="bg-red-50 text-red-700 font-bold py-3 px-6 rounded-lg hover:bg-red-100 uppercase text-xs">Cancelar Pedido</button>
        )}
      </div>
    </div>
  );
};

export default OrderDetail;
