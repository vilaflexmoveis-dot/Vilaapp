
import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { Order, OrderStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { CheckIcon, CurrencyDollarIcon, PlusIcon } from '../components/icons/Icons';

// Sub-component for Pending Settlements Row
const PendingSettlementRow: React.FC<{ 
    order: Order; 
    totalOrder: number; 
    totalPaid: number; 
    onSettle: (order: Order, pendingAmount: number) => void 
}> = ({ order, totalOrder, totalPaid, onSettle }) => {
    const { customers } = useData();
    const customer = customers.find(c => c.id === order.customerId);
    const pendingAmount = totalOrder - totalPaid;

    return (
        <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
            <td className="py-3 px-4 text-left font-medium">#{order.orderNumber}</td>
            <td className="py-3 px-4 text-left">{customer?.name || 'N/A'}</td>
            <td className="py-3 px-4 text-center">{new Date(order.orderDate).toLocaleDateString('pt-BR')}</td>
            <td className="py-3 px-4 text-center">
                 <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                     order.status === OrderStatus.Open ? 'bg-blue-100 text-blue-800' :
                     order.status === OrderStatus.Delivered ? 'bg-green-100 text-green-800' : 'bg-gray-100'
                 }`}>
                    {order.status}
                 </span>
            </td>
            <td className="py-3 px-4 text-right text-gray-500">{totalOrder.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td className="py-3 px-4 text-right text-green-600 font-medium">{totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td className="py-3 px-4 text-right font-bold text-red-500">{pendingAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td className="py-3 px-4 text-center">
                <button 
                    onClick={() => onSettle(order, pendingAmount)}
                    className="bg-primary-600 text-white text-xs font-bold py-1.5 px-3 rounded hover:bg-primary-700 transition shadow-sm"
                >
                    Pagar
                </button>
            </td>
        </tr>
    );
};

const Finance: React.FC = () => {
  const { payments, customers, paymentMethods, orders, orderItems, addPayment } = useData();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentForm, setPaymentForm] = useState({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      methodId: ''
  });

  const pendingSettlements = useMemo(() => {
      const candidates = orders.filter(o => o.status !== OrderStatus.Cancelled);
      const term = searchTerm.toLowerCase();
      
      return candidates.map(order => {
          const totalOrder = orderItems
            .filter(i => i.orderId === order.id)
            .reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
          
          const totalPaid = payments
            .filter(p => p.orderId === order.id)
            .reduce((sum, p) => sum + p.amountPaid, 0);
          
          const customerName = customers.find(c => c.id === order.customerId)?.name.toLowerCase() || '';

          return {
              order,
              totalOrder,
              totalPaid,
              customerName,
              isFullyPaid: totalPaid >= totalOrder - 0.01 
          };
      }).filter(item => !item.isFullyPaid && item.customerName.includes(term)); 
  }, [orders, orderItems, payments, searchTerm, customers]);

  const filteredHistory = useMemo(() => {
      let data = [...payments];

      if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          data = data.filter(payment => {
              const customer = customers.find(c => c.id === payment.customerId);
              return customer?.name.toLowerCase().includes(term);
          });
      }

      return data.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  }, [payments, customers, searchTerm]);


  const openPaymentModal = (order: Order, pendingAmount: number) => {
      setSelectedOrder(order);
      setPaymentForm({
          amount: pendingAmount.toFixed(2),
          date: new Date().toISOString().split('T')[0],
          methodId: order.paymentMethodId || ''
      });
      setIsModalOpen(true);
  };

  const handleSavePayment = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedOrder || !user?.email) return;
      
      const amount = parseFloat(paymentForm.amount);
      if (isNaN(amount) || amount <= 0) {
          alert("Valor inválido");
          return;
      }
      if (!paymentForm.methodId) {
          alert("Selecione uma forma de pagamento");
          return;
      }

      addPayment({
          customerId: selectedOrder.customerId,
          orderId: selectedOrder.id,
          amountPaid: amount,
          paymentDate: paymentForm.date,
          paymentMethodId: paymentForm.methodId
      }, user.email);

      setIsModalOpen(false);
  };

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">Financeiro & Recebimentos</h1>
      
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button 
            className={`py-2 px-6 font-bold border-b-2 text-sm sm:text-base transition-colors ${activeTab === 'pending' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`} 
            onClick={() => setActiveTab('pending')}
        >
            Contas a Receber ({pendingSettlements.length})
        </button>
        <button 
            className={`py-2 px-6 font-bold border-b-2 text-sm sm:text-base transition-colors ${activeTab === 'history' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`} 
            onClick={() => setActiveTab('history')}
        >
            Histórico de Entradas
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <input 
                type="text" 
                placeholder="Buscar por nome do cliente..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-1/2 px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
        </div>

        {activeTab === 'pending' && (
             <div className="overflow-x-auto">
                <table className="min-w-full table-auto">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase text-xs font-bold leading-normal">
                        <tr>
                            <th className="py-3 px-4 text-left">Pedido</th>
                            <th className="py-3 px-4 text-left">Cliente</th>
                            <th className="py-3 px-4 text-center">Data</th>
                            <th className="py-3 px-4 text-center">Status</th>
                            <th className="py-3 px-4 text-right">Total</th>
                            <th className="py-3 px-4 text-right">Recebido</th>
                            <th className="py-3 px-4 text-right">Saldo</th>
                            <th className="py-3 px-4 text-center">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-800 dark:text-gray-200 text-sm font-light">
                        {pendingSettlements.map(item => (
                            <PendingSettlementRow 
                                key={item.order.id} 
                                order={item.order} 
                                totalOrder={item.totalOrder} 
                                totalPaid={item.totalPaid} 
                                onSettle={openPaymentModal}
                            />
                        ))}
                        {pendingSettlements.length === 0 && (
                            <tr>
                                <td colSpan={8} className="text-center py-20 text-gray-500">
                                    Nenhum recebimento pendente encontrado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        )}

        {activeTab === 'history' && (
            <div className="overflow-x-auto">
                <table className="min-w-full table-auto">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase text-xs font-bold leading-normal">
                        <tr>
                            <th className="py-3 px-4 sm:px-6 text-left">Data</th>
                            <th className="py-3 px-4 sm:px-6 text-left">Cliente</th>
                            <th className="py-3 px-4 sm:px-6 text-center">Origem</th>
                            <th className="py-3 px-4 sm:px-6 text-left">Forma</th>
                            <th className="py-3 px-4 sm:px-6 text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-800 dark:text-gray-200 text-sm font-light">
                        {filteredHistory.map(payment => {
                            const customer = customers.find(c => c.id === payment.customerId);
                            const paymentMethod = paymentMethods.find(pm => pm.id === payment.paymentMethodId);
                            return (
                                <tr key={payment.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="py-3 px-4 sm:px-6 text-left">{new Date(payment.paymentDate).toLocaleDateString('pt-BR')}</td>
                                    <td className="py-3 px-4 sm:px-6 text-left font-medium">{customer?.name || 'N/A'}</td>
                                    <td className="py-3 px-4 sm:px-6 text-center text-xs">{payment.orderId ? `Pedido #${orders.find(o => o.id === payment.orderId)?.orderNumber || '??'}` : 'Avulso'}</td>
                                    <td className="py-3 px-4 sm:px-6 text-left">{paymentMethod?.name || 'N/A'}</td>
                                    <td className="py-3 px-4 sm:px-6 text-right font-bold text-green-600">{payment.amountPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                </tr>
                            );
                        })}
                        {filteredHistory.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-20 text-gray-500">
                                    Nenhum registro de pagamento encontrado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Pagamento">
          <form onSubmit={handleSavePayment} className="space-y-4">
              <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-sm mb-4 border border-gray-200 dark:border-gray-600">
                  <p className="font-bold text-gray-600 dark:text-gray-400 uppercase tracking-tight text-xs mb-1">Informações do Lançamento</p>
                  <p><span className="text-gray-500">Cliente:</span> <strong>{customers.find(c => c.id === selectedOrder?.customerId)?.name}</strong></p>
                  <p><span className="text-gray-500">Documento:</span> <strong>Pedido #{selectedOrder?.orderNumber}</strong></p>
              </div>
              
              <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px]">Valor a Receber (R$)</label>
                  <input 
                    type="number" 
                    value={paymentForm.amount} 
                    onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})}
                    step="0.01"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-3 font-bold text-lg"
                    required
                  />
              </div>

              <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px]">Data do Lançamento</label>
                  <input 
                    type="date" 
                    value={paymentForm.date} 
                    onChange={e => setPaymentForm({...paymentForm, date: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2"
                    required
                  />
              </div>

              <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px] mb-2">Forma de Pagamento</label>
                  <div className="grid grid-cols-2 gap-2">
                      {paymentMethods.map(pm => (
                          <button
                            key={pm.id}
                            type="button"
                            onClick={() => setPaymentForm({...paymentForm, methodId: pm.id})}
                            className={`px-3 py-3 text-sm font-bold border rounded-lg transition-all ${
                                paymentForm.methodId === pm.id 
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600'
                            }`}
                          >
                              {pm.name}
                          </button>
                      ))}
                  </div>
              </div>

              <div className="pt-6 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-100 text-gray-600 px-6 py-3 rounded-lg hover:bg-gray-200 font-bold">Voltar</button>
                  <button type="submit" className="bg-green-600 text-white px-8 py-3 rounded-xl hover:bg-green-700 font-extrabold flex items-center shadow-lg shadow-green-200 dark:shadow-none">
                      <CheckIcon className="w-5 h-5 mr-2" /> Confirmar Recebimento
                  </button>
              </div>
          </form>
      </Modal>
    </div>
  );
};

export default Finance;
