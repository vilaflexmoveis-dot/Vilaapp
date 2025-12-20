
import React, { useMemo, useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Customer, OrderStatus, CustomerProductPrice } from '../types';
import { PlusIcon, PencilIcon, TrashIcon } from '../components/icons/Icons';
import { getStatusClass } from './Orders';
import Modal from '../components/Modal';

const CustomerOrders: React.FC<{ customerId: string }> = ({ customerId }) => {
    const { orders, orderItems } = useData();

    const customerOrders = useMemo(() => {
        const filteredOrders = orders.filter(o => o.customerId === customerId);
        return filteredOrders.sort((a, b) => {
            const statusOrder = {
                [OrderStatus.Open]: 1,
                [OrderStatus.InProduction]: 2,
                [OrderStatus.Ready]: 3,
                [OrderStatus.Delivered]: 4,
                [OrderStatus.Cancelled]: 5,
            };
            if (statusOrder[a.status] !== statusOrder[b.status]) {
                return statusOrder[a.status] - statusOrder[b.status];
            }
            return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
        });
    }, [orders, customerId]);

    const getOrderTotal = (orderId: string) => {
        return orderItems
            .filter(item => item.orderId === orderId)
            .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    };

    if (customerOrders.length === 0) {
        return <p className="p-4 text-center text-gray-500">Nenhum pedido encontrado para este cliente.</p>;
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 overflow-x-auto">
            <h4 className="font-bold mb-2 text-gray-700 dark:text-gray-200">Histórico de Pedidos</h4>
            <table className="min-w-full">
                <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                    <tr>
                        <th className="text-left py-2 px-3">Nº Pedido</th>
                        <th className="text-left py-2 px-3">Data</th>
                        <th className="text-center py-2 px-3">Status</th>
                        <th className="text-right py-2 px-3">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {customerOrders.map(order => (
                        <tr key={order.id} className="border-t border-gray-200 dark:border-gray-600">
                            <td className="py-2 px-3">#{order.orderNumber}</td>
                            <td className="py-2 px-3">{new Date(order.orderDate).toLocaleDateString('pt-BR')}</td>
                            <td className="py-2 px-3 text-center">
                                <span className={`py-1 px-2 rounded-full text-xs ${getStatusClass(order.status)}`}>
                                    {order.status}
                                </span>
                            </td>
                            <td className="py-2 px-3 text-right font-medium">
                                {getOrderTotal(order.id).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const CustomerRow: React.FC<{ 
    customer: Customer; 
    isExpanded: boolean;
    onToggle: () => void;
    onEdit: (customer: Customer) => void;
    onDelete: (customerId: string) => void;
}> = ({ customer, isExpanded, onToggle, onEdit, onDelete }) => {
    const { orders, payments, orderItems } = useData();

    const { totalComprado, totalPago, saldoDevedor } = useMemo(() => {
        const deliveredOrders = orders.filter(o => o.customerId === customer.id && o.status === OrderStatus.Delivered);
        
        const totalComprado = deliveredOrders.reduce((orderSum, order) => {
            const itemsTotal = orderItems
                .filter(item => item.orderId === order.id)
                .reduce((itemSum, item) => itemSum + item.quantity * item.unitPrice, 0);
            return orderSum + itemsTotal;
        }, 0);

        const totalPago = payments
            .filter(p => p.customerId === customer.id)
            .reduce((sum, payment) => sum + payment.amountPaid, 0);

        return {
            totalComprado,
            totalPago,
            saldoDevedor: totalComprado - totalPago
        };
    }, [customer.id, orders, payments, orderItems]);

    const fullAddress = `${customer.address || ''} ${customer.number ? `, ${customer.number}` : ''} ${customer.city ? `- ${customer.city}` : ''}`;

    return (
        <>
            <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="py-3 px-4 sm:px-6 text-left whitespace-nowrap">
                    <button onClick={onToggle} className="font-medium text-primary-600 dark:text-primary-400 hover:underline text-left">
                        {customer.name || 'Sem Nome'}
                    </button>
                    {customer.contactPerson && <p className="text-xs text-gray-500">Cont.: {customer.contactPerson}</p>}
                </td>
                <td className={`py-3 px-4 sm:px-6 text-right font-bold ${saldoDevedor > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {saldoDevedor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="py-3 px-4 sm:px-6 text-right">{totalComprado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td className="py-3 px-4 sm:px-6 text-left max-w-xs truncate text-xs" title={fullAddress}>
                    {fullAddress}
                </td>
                <td className="py-3 px-4 sm:px-6 text-left">{String(customer.phone || 'S/T')}</td>
                <td className="py-3 px-4 sm:px-6 text-center">
                    <div className="flex item-center justify-center space-x-2">
                        <button onClick={() => onEdit(customer)} className="text-blue-500 hover:text-blue-700 p-1">
                            <PencilIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => onDelete(customer.id)} className="text-red-500 hover:text-red-700 p-1">
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                </td>
            </tr>
            {isExpanded && (
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                    <td colSpan={6}>
                       <CustomerOrders customerId={customer.id} />
                    </td>
                </tr>
            )}
        </>
    );
};

interface CustomersProps {
    onNewCustomer: () => void;
}

const Customers: React.FC<CustomersProps> = ({ onNewCustomer }) => {
  const { customers, updateCustomer, deleteCustomer, products } = useData();
  const { user } = useAuth();
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return customers.filter(c => {
        // Proteção contra tipos não-string (ex: números vindos da planilha)
        const name = String(c.name || '').toLowerCase();
        const phone = String(c.phone || '').toLowerCase();
        const cpf = String(c.cpfCnpj || '').toLowerCase();
        return name.includes(term) || phone.includes(term) || cpf.includes(term);
    });
  }, [customers, searchTerm]);

  const displayedCustomers = filteredCustomers.slice(0, visibleCount);

  const handleToggleRow = (customerId: string) => {
    setExpandedCustomerId(prevId => (prevId === customerId ? null : customerId));
  };
  
  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 10);
  };

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({
      name: '',
      phone: '',
      contactPerson: '',
      cpfCnpj: '',
      email: '',
      cep: '',
      address: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      notes: '',
      discountPercentage: '0',
      specialPrices: [] as CustomerProductPrice[]
  });
  
  const [selectedProdForPrice, setSelectedProdForPrice] = useState('');
  const [priceValue, setPriceValue] = useState('');

  const handleEditClick = (customer: Customer) => {
      setEditingCustomer(customer);
      setEditForm({
          name: customer.name,
          phone: String(customer.phone),
          contactPerson: customer.contactPerson || '',
          cpfCnpj: customer.cpfCnpj || '',
          email: customer.email,
          cep: customer.cep || '',
          address: customer.address,
          number: customer.number || '',
          neighborhood: customer.neighborhood || '',
          city: customer.city || '',
          state: customer.state || '',
          notes: customer.notes || '',
          discountPercentage: customer.discountPercentage?.toString() || '0',
          specialPrices: customer.specialPrices || []
      });
      setIsEditModalOpen(true);
  };

  const handleDeleteClick = (customerId: string) => {
      if(window.confirm('Tem certeza que deseja excluir este cliente?')) {
          if(user?.email) {
              deleteCustomer(customerId, user.email);
          }
      }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
      e.preventDefault();
      if(editingCustomer && user?.email) {
          updateCustomer({
              ...editingCustomer,
              name: editForm.name,
              phone: editForm.phone,
              contactPerson: editForm.contactPerson,
              cpfCnpj: editForm.cpfCnpj,
              email: editForm.email,
              cep: editForm.cep,
              address: editForm.address,
              number: editForm.number,
              neighborhood: editForm.neighborhood,
              city: editForm.city,
              state: editForm.state,
              notes: editForm.notes,
              discountPercentage: parseFloat(editForm.discountPercentage),
              specialPrices: editForm.specialPrices
          }, user.email);
          setIsEditModalOpen(false);
      }
  };

  const addSpecialPrice = () => {
      if (!selectedProdForPrice || !priceValue) return;
      
      const newPrice = parseFloat(priceValue);
      if (isNaN(newPrice)) return;

      const updatedPrices = [...editForm.specialPrices];
      const existingIndex = updatedPrices.findIndex(sp => sp.productId === selectedProdForPrice);
      
      if (existingIndex > -1) {
          updatedPrices[existingIndex].price = newPrice;
      } else {
          updatedPrices.push({ productId: selectedProdForPrice, price: newPrice });
      }
      
      setEditForm({ ...editForm, specialPrices: updatedPrices });
      setSelectedProdForPrice('');
      setPriceValue('');
  };

  const removeSpecialPrice = (productId: string) => {
      setEditForm({
          ...editForm,
          specialPrices: editForm.specialPrices.filter(sp => sp.productId !== productId)
      });
  };


  return (
    <div className="container mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Clientes</h1>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <input 
                type="text" 
                placeholder="Buscar cliente..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="rounded-lg border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 text-sm w-full md:w-64"
            />
            <button 
                onClick={onNewCustomer}
                className="w-full sm:w-auto flex items-center justify-center bg-primary-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-700 transition duration-300 whitespace-nowrap"
            >
                <PlusIcon className="w-5 h-5 mr-2" />
                Novo Cliente
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase text-sm leading-normal">
                    <tr>
                        <th className="py-3 px-4 sm:px-6 text-left">Nome</th>
                        <th className="py-3 px-4 sm:px-6 text-right">Saldo Devedor</th>
                        <th className="py-3 px-4 sm:px-6 text-right">Total Comprado</th>
                        <th className="py-3 px-4 sm:px-6 text-left">Endereço</th>
                        <th className="py-3 px-4 sm:px-6 text-left">Telefone</th>
                        <th className="py-3 px-4 sm:px-6 text-center">Ações</th>
                    </tr>
                </thead>
                <tbody className="text-gray-800 dark:text-gray-200 text-sm font-light">
                    {displayedCustomers.map(customer => (
                        <CustomerRow 
                            key={customer.id} 
                            customer={customer}
                            isExpanded={expandedCustomerId === customer.id}
                            onToggle={() => handleToggleRow(customer.id)}
                            onEdit={handleEditClick}
                            onDelete={handleDeleteClick}
                        />
                    ))}
                    {displayedCustomers.length === 0 && (
                        <tr>
                            <td colSpan={6} className="text-center py-10 text-gray-500">Nenhum cliente encontrado.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Cliente">
          <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome</label>
                    <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm py-2 px-3" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Telefone</label>
                    <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm py-2 px-3" required />
                </div>
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Desconto Padrão (%)</label>
                  <input type="number" value={editForm.discountPercentage} onChange={e => setEditForm({...editForm, discountPercentage: e.target.value})} min="0" max="100" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm py-2 px-3" />
              </div>

              {/* Special Prices Section - restricted to Admin */}
              {user?.isAdmin && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                      <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-2">Tabela de Preços do Cliente (Apenas Admin)</h3>
                      <div className="flex flex-col sm:flex-row gap-2 mb-2">
                          <select 
                            value={selectedProdForPrice} 
                            onChange={e => setSelectedProdForPrice(e.target.value)}
                            className="flex-grow rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                          >
                              <option value="">Selecione um Produto...</option>
                              {products.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                          </select>
                          <input 
                            type="number" 
                            placeholder="R$" 
                            value={priceValue}
                            onChange={e => setPriceValue(e.target.value)}
                            className="w-full sm:w-32 rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                          />
                          <button 
                            type="button" 
                            onClick={addSpecialPrice}
                            className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-sm"
                          >
                              Incluir
                          </button>
                      </div>

                      <div className="max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-md p-2">
                          {editForm.specialPrices.map((sp, idx) => {
                              const prod = products.find(p => p.id === sp.productId);
                              return (
                                  <div key={idx} className="flex justify-between items-center py-1 border-b dark:border-gray-700 last:border-0">
                                      <span className="text-xs">{prod?.name}</span>
                                      <div className="flex items-center gap-2">
                                          <span className="font-bold text-green-600">{sp.price.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
                                          <button type="button" onClick={() => removeSpecialPrice(sp.productId)} className="text-red-500">
                                              <TrashIcon className="w-4 h-4" />
                                          </button>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              )}

              <div className="flex justify-end pt-4 space-x-3">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition">Cancelar</button>
                  <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition">Salvar Alterações</button>
              </div>
          </form>
      </Modal>
    </div>
  );
};

export default Customers;
