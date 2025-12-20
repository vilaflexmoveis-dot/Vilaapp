
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Product, OrderStatus } from '../types';
import { ArrowLeftIcon, TrashIcon, PlusIcon, MinusIcon, UserCircleIcon, PencilIcon } from '../components/icons/Icons';

type NewOrderItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

interface NewOrderProps {
  onBack: () => void;
  onAddNewCustomer: () => void;
}

const NewOrder: React.FC<NewOrderProps> = ({ onBack, onAddNewCustomer }) => {
  const { customers, products, addOrder, paymentMethods, orderItems, orders } = useData();
  const { user } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false); // Bloqueio imediato para evitar race conditions

  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [items, setItems] = useState<NewOrderItem[]>([]);
  const [paymentMethodId, setPaymentMethodId] = useState<string>(''); 
  const [notes, setNotes] = useState<string>('');
  
  const [deliveryDate, setDeliveryDate] = useState<string>(() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
  });
  
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [currentItem, setCurrentItem] = useState<{productId: string, quantity: string, unitPrice: string}>({
      productId: '',
      quantity: '1',
      unitPrice: ''
  });

  const getProductAvailability = (product: Product) => {
    const committed = orderItems.reduce((sum, item) => {
        const order = orders.find(o => o.id === item.orderId);
        if (item.productId === product.id && order && 
            (order.status === OrderStatus.Open || 
             order.status === OrderStatus.InProduction || 
             order.status === OrderStatus.Ready)) {
            return sum + item.quantity;
        }
        return sum;
    }, 0);
    return product.currentStock - committed;
  };

  const currentAvailableStock = useMemo(() => {
    if (!currentItem.productId) return 0;
    const product = products.find(p => p.id === currentItem.productId);
    return product ? getProductAvailability(product) : 0;
  }, [currentItem.productId, products, orderItems, orders]);

  useEffect(() => {
    if (paymentMethods.length > 0 && !paymentMethodId) {
        const defaultMethod = paymentMethods.find(pm => pm.name === 'Dinheiro') || paymentMethods[0];
        setPaymentMethodId(defaultMethod.id);
    }
  }, [paymentMethods, paymentMethodId]);

  const customerSearchResults = useMemo(() => {
    const term = (customerSearchTerm || '').trim().toLowerCase();
    if (!term) return [];
    return customers.filter(c => String(c.name || '').toLowerCase().includes(term) || String(c.cpfCnpj || '').includes(term));
  }, [customers, customerSearchTerm]);

  const selectedCustomer = useMemo(() => customers.find(c => c.id === selectedCustomerId), [customers, selectedCustomerId]);
  const orderTotal = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), [items]);

  const productSearchResults = useMemo(() => {
    const term = (productSearchTerm || '').trim().toLowerCase();
    if (!term) return [];
    return products.filter(p => String(p.name || '').toLowerCase().includes(term) || String(p.barcode || '').includes(term));
  }, [products, productSearchTerm]);

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setCustomerSearchTerm('');
  };

  const handleProductSelect = (product: Product) => {
    let finalPrice = product.basePrice;
    if (selectedCustomer) {
        const special = selectedCustomer.specialPrices?.find(sp => sp.productId === product.id);
        if (special) {
            finalPrice = special.price;
        } else if (selectedCustomer.discountPercentage) {
            finalPrice = product.basePrice * (1 - selectedCustomer.discountPercentage / 100);
        }
    }
    setCurrentItem({ ...currentItem, productId: product.id, quantity: '1', unitPrice: finalPrice.toFixed(2) });
    setProductSearchTerm('');
  };

  const handleAddItem = () => {
    const quantity = parseInt(currentItem.quantity, 10);
    const unitPrice = parseFloat(currentItem.unitPrice);
    if (currentItem.productId && quantity > 0 && !isNaN(unitPrice)) {
        setItems([...items, { productId: currentItem.productId, quantity, unitPrice }]);
        setCurrentItem({ productId: '', quantity: '1', unitPrice: '' });
    }
  };

  const updateItemQty = (index: number, delta: number) => {
      const newItems = [...items];
      const newQty = newItems[index].quantity + delta;
      if (newQty > 0) {
          newItems[index].quantity = newQty;
          setItems(newItems);
      } else {
          // Se for zero ou menos, remove o item
          setItems(newItems.filter((_, i) => i !== index));
      }
  };

  const handleSaveOrder = async () => {
    if (isSubmittingRef.current || !selectedCustomerId || items.length === 0) return;
    
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
        if (user?.email) {
            await addOrder({
                customerId: selectedCustomerId,
                status: OrderStatus.Open, 
                sendToProduction: false,
                paymentMethodId,
                createdBy: user.email,
                notes: notes,
                deliveryDate: deliveryDate, 
            }, items, user.email);
            onBack();
        }
    } catch (err) {
        alert("Erro ao salvar pedido. Verifique sua conexão.");
        isSubmittingRef.current = false;
        setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto pb-10">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors mr-4 uppercase text-xs font-black">
          <ArrowLeftIcon className="w-5 h-5 mr-1" /> Voltar
        </button>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Novo Pedido</h1>
      </div>

      {!selectedCustomerId ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-fade-in">
          <h2 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-200">1. Selecionar Cliente</h2>
          <input type="text" placeholder="Nome ou CPF..." value={customerSearchTerm} onChange={(e) => setCustomerSearchTerm(e.target.value)} className="w-full border-gray-300 rounded-md dark:bg-gray-700 dark:text-gray-200 p-3 shadow-inner" />
          <div className="mt-4 max-h-60 overflow-y-auto divide-y dark:divide-gray-700 border rounded-lg">
            {customerSearchResults.map(customer => (
              <div key={customer.id} onClick={() => handleSelectCustomer(customer.id)} className="p-4 cursor-pointer hover:bg-primary-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3">
                <UserCircleIcon className="w-6 h-6 text-gray-400" />
                <span className="font-bold text-gray-800 dark:text-gray-200">{customer.name}</span>
              </div>
            ))}
          </div>
          <button onClick={onAddNewCustomer} className="mt-6 w-full py-3 text-sm text-primary-600 font-black uppercase tracking-widest hover:bg-primary-50 border-2 border-dashed border-primary-200 rounded-xl transition-all">+ Cadastrar Novo Cliente</button>
        </div>
      ) : (
        <div className="animate-fade-in space-y-6">
          {/* CONFIRMAÇÃO DO CLIENTE SELECIONADO */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-2 border-primary-500 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary-100 dark:bg-primary-900/50 rounded-full">
                      <UserCircleIcon className="w-8 h-8 text-primary-600" />
                  </div>
                  <div>
                      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Cliente Selecionado</p>
                      <h3 className="text-2xl font-black text-gray-800 dark:text-white uppercase leading-none">{selectedCustomer?.name}</h3>
                      <p className="text-sm text-gray-500 font-medium">{selectedCustomer?.cpfCnpj || 'CPF/CNPJ não informado'}</p>
                  </div>
              </div>
              <button onClick={() => setSelectedCustomerId('')} className="flex items-center gap-2 text-primary-600 hover:bg-primary-50 border border-primary-600 font-bold text-xs uppercase px-5 py-2.5 rounded-xl transition-all active:scale-95">
                  <PencilIcon className="w-4 h-4" /> Alterar Cliente
              </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-4">2. Itens do Pedido</h2>
                  <div className="relative mb-6">
                      <input type="text" placeholder="Digite o nome do produto..." value={productSearchTerm} onChange={e => setProductSearchTerm(e.target.value)} className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:text-white px-3 py-3 shadow-sm font-medium" />
                      {productSearchTerm && productSearchResults.length > 0 && (
                          <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border rounded-xl shadow-2xl max-h-80 overflow-y-auto">
                              {productSearchResults.map(p => {
                                  const avail = getProductAvailability(p);
                                  return (
                                      <div key={p.id} onClick={() => handleProductSelect(p)} className="p-4 hover:bg-primary-50 dark:hover:bg-gray-700 cursor-pointer border-b last:border-0 transition-colors flex justify-between items-center">
                                          <div className="flex-1">
                                              <div className="font-bold text-gray-800 dark:text-white">{p.name}</div>
                                              <div className="text-[10px] text-gray-400 font-mono uppercase">#{p.barcode}</div>
                                          </div>
                                          <div className="text-right">
                                              <div className="text-primary-600 font-black text-sm">{p.basePrice.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</div>
                                              <div className={`text-[10px] font-black uppercase px-2 py-0.5 rounded mt-1 inline-block ${avail <= 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                  Estoque: {avail} un
                                              </div>
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      )}
                  </div>

                  {currentItem.productId && (
                      <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg mb-6 border flex flex-wrap gap-4 items-end animate-fade-in shadow-inner">
                          <div className="flex-1 min-w-[200px]">
                              <p className="text-[10px] font-black uppercase text-blue-600 mb-1">Produto</p>
                              <p className="font-bold text-gray-800 dark:text-gray-100">{products.find(p => p.id === currentItem.productId)?.name}</p>
                          </div>
                          
                          <div className="w-24 text-center">
                              <label className="text-[10px] font-black block uppercase text-gray-500 mb-1">Disponível</label>
                              <div className={`p-2 rounded-md font-black text-sm border bg-white dark:bg-gray-800 ${currentAvailableStock <= 0 ? 'text-red-600 border-red-200 animate-pulse' : 'text-green-600 border-green-200'}`}>
                                  {currentAvailableStock} un
                              </div>
                          </div>

                          <div className="w-20">
                              <label className="text-[10px] font-black block uppercase text-gray-500 mb-1">Qtd</label>
                              <input type="number" value={currentItem.quantity} onChange={e => setCurrentItem({...currentItem, quantity: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 font-bold text-center" />
                          </div>
                          <div className="w-32">
                              <label className="text-[10px] font-black block uppercase text-gray-500 mb-1">Preço</label>
                              <input type="number" step="0.01" value={currentItem.unitPrice} onChange={e => setCurrentItem({...currentItem, unitPrice: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 font-bold text-right" />
                          </div>
                          <button onClick={handleAddItem} className="bg-primary-600 text-white px-6 py-2.5 rounded-xl font-black uppercase text-xs shadow-lg hover:bg-primary-700 transition">Incluir</button>
                      </div>
                  )}

                  <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 font-black uppercase text-[10px]">
                              <tr>
                                <th className="px-4 py-2 text-left">Produto</th>
                                <th className="px-4 py-2 text-center">Quantidade</th>
                                <th className="px-4 py-2 text-right">Unitário</th>
                                <th className="px-4 py-2 text-right">Total</th>
                                <th className="px-4 py-2"></th>
                              </tr>
                          </thead>
                          <tbody className="divide-y dark:divide-gray-700">
                              {items.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                      <td className="px-4 py-3 font-bold">{products.find(p => p.id === item.productId)?.name}</td>
                                      <td className="px-4 py-3">
                                          <div className="flex items-center justify-center gap-3">
                                              <button 
                                                  onClick={() => updateItemQty(idx, -1)}
                                                  className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                                                  title="Diminuir"
                                              >
                                                  <MinusIcon className="w-4 h-4" />
                                              </button>
                                              <span className="font-black text-lg min-w-[30px] text-center">{item.quantity}</span>
                                              <button 
                                                  onClick={() => updateItemQty(idx, 1)}
                                                  className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-green-100 hover:text-green-600 transition-colors"
                                                  title="Aumentar"
                                              >
                                                  <PlusIcon className="w-4 h-4" />
                                              </button>
                                          </div>
                                      </td>
                                      <td className="px-4 py-3 text-right text-gray-500">{item.unitPrice.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</td>
                                      <td className="px-4 py-3 text-right font-black text-primary-600">{(item.quantity * item.unitPrice).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</td>
                                      <td className="px-4 py-3 text-right">
                                          <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 transition-transform hover:scale-110">
                                              <TrashIcon className="w-5 h-5" />
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sticky top-4">
                  <h2 className="text-xl font-bold mb-6 border-b pb-2 uppercase text-[10px] text-gray-400 font-black">Pagamento e Prazo</h2>
                  
                  <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 text-center">
                      <p className="text-[10px] font-black uppercase text-gray-500 mb-1">Total do Pedido</p>
                      <p className="text-4xl font-black text-green-600">{orderTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>

                  <div className="mb-6">
                      <label className="block text-[10px] font-black uppercase text-primary-600 mb-2">Forma de Pagamento</label>
                      <div className="grid grid-cols-2 gap-2">
                          {paymentMethods.map(pm => (
                              <button key={pm.id} type="button" onClick={() => setPaymentMethodId(pm.id)} className={`px-2 py-2 text-[10px] font-bold border rounded-lg transition-all ${paymentMethodId === pm.id ? 'bg-primary-600 text-white border-primary-600 shadow-md scale-105' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'}`}>{pm.name}</button>
                          ))}
                      </div>
                  </div>

                  <div className="mb-6">
                      <label className="block text-[10px] font-black uppercase text-primary-600 mb-1">Previsão de Entrega</label>
                      <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white font-bold" />
                  </div>

                  <button 
                    onClick={handleSaveOrder} 
                    disabled={items.length === 0 || isSubmitting} 
                    className="w-full py-5 text-white text-xl font-black rounded-2xl bg-green-600 hover:bg-green-700 shadow-xl transition active:scale-95 flex items-center justify-center uppercase disabled:bg-gray-400 disabled:shadow-none"
                  >
                      {isSubmitting ? 'Salvando...' : 'Finalizar Pedido'}
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewOrder;
