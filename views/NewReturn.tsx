
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

interface NewReturnProps {
  onBack: () => void;
}

const NewReturn: React.FC<NewReturnProps> = ({ onBack }) => {
  const { customers, products, addReturn, paymentMethods } = useData();
  const { user } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [items, setItems] = useState<NewOrderItem[]>([]);
  const [notes, setNotes] = useState<string>('');
  
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [currentItem, setCurrentItem] = useState<{productId: string, quantity: string, unitPrice: string}>({
      productId: '',
      quantity: '1',
      unitPrice: ''
  });

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
          setItems(newItems.filter((_, i) => i !== index));
      }
  };

  const handleSaveReturn = async () => {
    if (isSubmittingRef.current || !selectedCustomerId || items.length === 0) return;
    
    if (!window.confirm("Confirmar a entrada destes itens no estoque e gerar crédito para o cliente?")) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
        if (user?.email) {
            // A função addReturn cuidará de:
            // 1. Somar no estoque físico
            // 2. Criar registro financeiro negativo (crédito)
            await addReturn({
                customerId: selectedCustomerId,
                status: OrderStatus.Delivered, 
                sendToProduction: false,
                paymentMethodId: paymentMethods[0]?.id || '', // Genérico
                createdBy: user.email,
                notes: notes,
            }, items, user.email);
            alert("Devolução processada com sucesso. Itens retornaram ao estoque!");
            onBack();
        }
    } catch (err) {
        alert("Erro ao processar devolução.");
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
        <h1 className="text-3xl font-bold text-orange-600">Devolução de Itens (Entrada)</h1>
      </div>

      {!selectedCustomerId ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-fade-in">
          <h2 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-200">1. Selecionar Cliente</h2>
          <input type="text" placeholder="Buscar cliente..." value={customerSearchTerm} onChange={(e) => setCustomerSearchTerm(e.target.value)} className="w-full border-gray-300 rounded-md dark:bg-gray-700 dark:text-gray-200 p-3 shadow-inner" />
          <div className="mt-4 max-h-60 overflow-y-auto divide-y dark:divide-gray-700 border rounded-lg">
            {customerSearchResults.map(customer => (
              <div key={customer.id} onClick={() => handleSelectCustomer(customer.id)} className="p-4 cursor-pointer hover:bg-orange-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3">
                <UserCircleIcon className="w-6 h-6 text-gray-400" />
                <span className="font-bold text-gray-800 dark:text-gray-200">{customer.name}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="animate-fade-in space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border-2 border-orange-500 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 dark:bg-orange-900/50 rounded-full">
                      <UserCircleIcon className="w-8 h-8 text-orange-600" />
                  </div>
                  <div>
                      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Cliente da Devolução</p>
                      <h3 className="text-2xl font-black text-gray-800 dark:text-white uppercase leading-none">{selectedCustomer?.name}</h3>
                  </div>
              </div>
              <button onClick={() => setSelectedCustomerId('')} className="text-orange-600 hover:bg-orange-50 border border-orange-600 font-bold text-xs uppercase px-5 py-2.5 rounded-xl transition-all">
                  Alterar Cliente
              </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-4">2. Itens Devolvidos</h2>
                  <p className="text-xs text-gray-400 mb-4">* Os itens abaixo serão ADICIONADOS ao estoque físico automaticamente.</p>
                  <div className="relative mb-6">
                      <input type="text" placeholder="Digite o nome do produto que voltou..." value={productSearchTerm} onChange={e => setProductSearchTerm(e.target.value)} className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:text-white px-3 py-3 shadow-sm font-medium" />
                      {productSearchTerm && productSearchResults.length > 0 && (
                          <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border rounded-xl shadow-2xl max-h-80 overflow-y-auto">
                              {productSearchResults.map(p => (
                                  <div key={p.id} onClick={() => handleProductSelect(p)} className="p-4 hover:bg-orange-50 dark:hover:bg-gray-700 cursor-pointer border-b last:border-0 transition-colors flex justify-between items-center">
                                      <div className="flex-1">
                                          <div className="font-bold text-gray-800 dark:text-white">{p.name}</div>
                                          <div className="text-[10px] text-gray-400 font-mono uppercase">#{p.barcode}</div>
                                      </div>
                                      <div className="text-right">
                                          <div className="text-orange-600 font-black text-sm">R$ {p.basePrice.toFixed(2)}</div>
                                          <div className="text-[10px] text-gray-400">Estoque Atual: {p.currentStock}</div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>

                  {currentItem.productId && (
                      <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg mb-6 border-2 border-orange-200 flex flex-wrap gap-4 items-end animate-fade-in">
                          <div className="flex-1 min-w-[200px]">
                              <p className="text-[10px] font-black uppercase text-orange-600 mb-1">Produto Selecionado</p>
                              <p className="font-bold text-gray-800 dark:text-gray-100">{products.find(p => p.id === currentItem.productId)?.name}</p>
                          </div>
                          <div className="w-20">
                              <label className="text-[10px] font-black block uppercase text-gray-500 mb-1">Qtd Entra</label>
                              <input type="number" value={currentItem.quantity} onChange={e => setCurrentItem({...currentItem, quantity: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 font-bold text-center" />
                          </div>
                          <div className="w-32">
                              <label className="text-[10px] font-black block uppercase text-gray-500 mb-1">Valor Un. Crédito</label>
                              <input type="number" step="0.01" value={currentItem.unitPrice} onChange={e => setCurrentItem({...currentItem, unitPrice: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 font-bold text-right" />
                          </div>
                          <button onClick={handleAddItem} className="bg-orange-600 text-white px-6 py-2.5 rounded-xl font-black uppercase text-xs shadow-lg hover:bg-orange-700 transition">Adicionar</button>
                      </div>
                  )}

                  <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 font-black uppercase text-[10px]">
                              <tr>
                                <th className="px-4 py-2 text-left">Produto</th>
                                <th className="px-4 py-2 text-center">Quantidade</th>
                                <th className="px-4 py-2 text-right">Crédito Un.</th>
                                <th className="px-4 py-2 text-right">Subtotal</th>
                                <th className="px-4 py-2"></th>
                              </tr>
                          </thead>
                          <tbody className="divide-y dark:divide-gray-700">
                              {items.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                      <td className="px-4 py-3 font-bold">{products.find(p => p.id === item.productId)?.name}</td>
                                      <td className="px-4 py-3">
                                          <div className="flex items-center justify-center gap-3">
                                              <button onClick={() => updateItemQty(idx, -1)} className="p-1 rounded-full bg-gray-100 dark:bg-gray-700"><MinusIcon className="w-3 h-3" /></button>
                                              <span className="font-black text-lg">{item.quantity}</span>
                                              <button onClick={() => updateItemQty(idx, 1)} className="p-1 rounded-full bg-gray-100 dark:bg-gray-700"><PlusIcon className="w-3 h-3" /></button>
                                          </div>
                                      </td>
                                      <td className="px-4 py-3 text-right">R$ {item.unitPrice.toFixed(2)}</td>
                                      <td className="px-4 py-3 text-right font-black text-orange-600">R$ {(item.quantity * item.unitPrice).toFixed(2)}</td>
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
                  <h2 className="text-xl font-bold mb-6 border-b pb-2 uppercase text-[10px] text-gray-400 font-black">Resumo do Crédito</h2>
                  
                  <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-dashed border-orange-300 text-center">
                      <p className="text-[10px] font-black uppercase text-gray-500 mb-1">Crédito Gerado para o Cliente</p>
                      <p className="text-4xl font-black text-orange-600">{orderTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      <p className="text-[10px] mt-2 text-gray-400 italic font-medium">Este valor será descontado do saldo devedor do cliente.</p>
                  </div>

                  <div className="mb-6">
                      <label className="block text-[10px] font-black uppercase text-primary-600 mb-1">Motivo / Observações</label>
                      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" placeholder="Ex: Item com defeito, Sobra de obra, troca..." />
                  </div>

                  <button 
                    onClick={handleSaveReturn} 
                    disabled={items.length === 0 || isSubmitting} 
                    className="w-full py-5 text-white text-xl font-black rounded-2xl bg-orange-600 hover:bg-orange-700 shadow-xl transition active:scale-95 flex items-center justify-center uppercase disabled:bg-gray-400 disabled:shadow-none"
                  >
                      {isSubmitting ? 'Processando...' : 'Finalizar Devolução'}
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewReturn;
