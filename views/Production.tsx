
import React, { useMemo, useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { ProductionPriority, ProductionStatus, OrderStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { CheckCircleIcon, PlusIcon, TrashIcon, CogIcon, PencilIcon } from '../components/icons/Icons';
import Modal from '../components/Modal';

const getPriorityClass = (priority: ProductionPriority) => {
    switch (priority) {
        case ProductionPriority.Immediate: return 'bg-red-500 text-white';
        case ProductionPriority.Today: return 'bg-orange-500 text-white';
        case ProductionPriority.Tomorrow: return 'bg-yellow-500 text-black';
        case ProductionPriority.Stock: return 'bg-blue-500 text-white';
        default: return 'bg-gray-500 text-white';
    }
}

interface ProductionProps {
  onNewProductionOrder: () => void;
}

const Production: React.FC<ProductionProps> = ({ onNewProductionOrder }) => {
  const { productionOrders, products, orders, orderItems, updateProductionStatus, updateProductionPriority, addProductionOrder, deleteProductionOrder, updateProductionOrderQuantity } = useData();
  const { user } = useAuth();
  const [priorityFilter, setPriorityFilter] = useState<ProductionPriority | 'all'>('all');
  const [stockQuantities, setStockQuantities] = useState<{ [productId: string]: string }>({});
  const [visibleCount, setVisibleCount] = useState(12);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<string>('');
  
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);

  useEffect(() => {
    setVisibleCount(12);
  }, [priorityFilter]);

  
    const pendingProductionByProduct = useMemo(() => {
        const openOrders = orders.filter(o => o.status === OrderStatus.Open);
        const demandMap = new Map<string, number>();

        openOrders.forEach(o => {
            const items = orderItems.filter(i => i.orderId === o.id);
            items.forEach(i => {
                demandMap.set(i.productId, (demandMap.get(i.productId) || 0) + i.quantity);
            });
        });

        const committedToReadyMap = new Map<string, number>();
        orders.filter(o => o.status === OrderStatus.Ready).forEach(o => {
             const items = orderItems.filter(i => i.orderId === o.id);
             items.forEach(i => {
                 committedToReadyMap.set(i.productId, (committedToReadyMap.get(i.productId) || 0) + i.quantity);
             });
        });

        const incomingProductionMap = new Map<string, number>();
        productionOrders.filter(p => p.status !== ProductionStatus.Finished).forEach(p => {
            incomingProductionMap.set(p.productId, (incomingProductionMap.get(p.productId) || 0) + (p.quantity - p.produced));
        });

        const suggestions: { productId: string, productName: string, totalQuantity: number, reason: string }[] = [];

        products.forEach(product => {
            const demand = demandMap.get(product.id) || 0;
            const committed = committedToReadyMap.get(product.id) || 0;
            const physical = product.currentStock;
            const free = Math.max(0, physical - committed);
            const incoming = incomingProductionMap.get(product.id) || 0;
            const min = product.minimumStock || 0;
            
            // Caso 1: Atender pedidos em aberto
            const netNeedForOrders = Math.max(0, demand - free - incoming);
            
            // Caso 2: Repor estoque mínimo
            const netNeedForStock = Math.max(0, min - (free + netNeedForOrders + incoming));

            const totalNeed = netNeedForOrders + netNeedForStock;

            if (totalNeed > 0) {
                suggestions.push({
                    productId: product.id,
                    productName: product.name,
                    totalQuantity: totalNeed,
                    reason: netNeedForOrders > 0 ? 'Falta para Pedidos' : 'Abaixo do Mínimo'
                });
            }
        });
        
        return suggestions;
    }, [orders, orderItems, products, productionOrders]);

  const activeProductionOrders = useMemo(() => {
      return productionOrders.filter(p => p.status === ProductionStatus.Producing || p.status === ProductionStatus.Pending);
  }, [productionOrders]);

  const totalInProduction = useMemo(() => {
      return activeProductionOrders.reduce((sum, p) => sum + p.quantity, 0);
  }, [activeProductionOrders]);

  const productionBreakdown = useMemo(() => {
      const breakdown = new Map<string, number>();
      activeProductionOrders.forEach(p => {
          breakdown.set(p.productId, (breakdown.get(p.productId) || 0) + p.quantity);
      });
      return Array.from(breakdown.entries()).map(([id, qty]) => ({
          name: products.find(prod => prod.id === id)?.name || 'Desconhecido',
          qty
      }));
  }, [activeProductionOrders, products]);

  const filteredProductionOrders = useMemo(() => {
    let filtered = productionOrders.filter(p => p.status !== ProductionStatus.Finished);
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(p => p.priority === priorityFilter);
    }
    return filtered.sort((a, b) => {
      const priorityOrder = {
        [ProductionPriority.Immediate]: 1,
        [ProductionPriority.Today]: 2,
        [ProductionPriority.Tomorrow]: 3,
        [ProductionPriority.Stock]: 4,
      };
      const pA = priorityOrder[a.priority] || 5;
      const pB = priorityOrder[b.priority] || 5;
      if (pA !== pB) return pA - pB;
      return new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime();
    });
  }, [productionOrders, priorityFilter]);

  const displayedProductionOrders = filteredProductionOrders.slice(0, visibleCount);

  const handleFinishProduction = (pOrderId: string, quantity: number) => {
    if (user?.email) {
      updateProductionStatus(pOrderId, ProductionStatus.Finished, user.email, quantity);
    }
  };

  const handlePriorityChange = (pOrderId: string, newPriority: ProductionPriority) => {
    if (user?.email) {
      updateProductionPriority(pOrderId, newPriority, user.email);
    }
  };

  const handleProduceForStock = (productId: string) => {
      const enteredQty = parseInt(stockQuantities[productId] || '0', 10);
      const suggestion = pendingProductionByProduct.find(p => p.productId === productId);
      const qtyToProduce = enteredQty > 0 ? enteredQty : (suggestion ? suggestion.totalQuantity : 0);

      if (user?.email && qtyToProduce > 0) {
          addProductionOrder({ productId, quantity: qtyToProduce, priority: ProductionPriority.Stock }, user.email);
          setStockQuantities(prev => ({ ...prev, [productId]: '' }));
          alert(`Iniciado produção de ${qtyToProduce} unidades.`);
      }
  };

  return (
    <div className="container mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Produção</h1>
        <button 
            onClick={onNewProductionOrder}
            className="w-full sm:w-auto flex items-center justify-center bg-primary-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-700 transition shadow-md"
        >
            <PlusIcon className="w-5 h-5 mr-2" /> Nova Produção
        </button>
      </div>

      <button 
        onClick={() => setIsBreakdownModalOpen(true)}
        className="w-full bg-blue-600 text-white rounded-xl shadow-lg p-5 mb-8 flex items-center justify-between hover:bg-blue-700 transition transform active:scale-95"
      >
          <div className="flex items-center">
              <CogIcon className="w-10 h-10 mr-4 animate-spin-slow" />
              <div>
                  <h2 className="text-xl font-bold">Total em Produção</h2>
                  <p className="text-blue-100 text-xs font-medium uppercase tracking-widest">Clique para ver o detalhamento</p>
              </div>
          </div>
          <div className="text-5xl font-black">{totalInProduction}</div>
      </button>
      
        <div className="mb-10 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-primary-600">
            <h2 className="text-xl font-extrabold mb-4 text-gray-800 dark:text-gray-100 flex items-center uppercase tracking-tight">
                Sugestão de Produção
            </h2>
            {pendingProductionByProduct.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {pendingProductionByProduct.map(item => (
                        <div key={item.productId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                            <div className="flex-1">
                                <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">{item.productName}</p>
                                <div className="flex gap-2 mt-1">
                                    <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded uppercase">{item.reason}</span>
                                    <span className="text-xs font-bold text-gray-500">Sugestão: {item.totalQuantity} un.</span>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="number"
                                    placeholder={item.totalQuantity.toString()}
                                    value={stockQuantities[item.productId] || ''}
                                    onChange={(e) => setStockQuantities(prev => ({ ...prev, [item.productId]: e.target.value }))}
                                    className="w-16 px-2 py-1 text-sm font-bold text-center border rounded-md dark:bg-gray-800 dark:border-gray-600"
                                    min="1"
                                />
                                <button
                                    onClick={() => handleProduceForStock(item.productId)}
                                    className="bg-primary-600 text-white font-bold py-1.5 px-3 rounded-md text-[10px] uppercase hover:bg-primary-700"
                                >
                                    Produzir
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-green-600 font-extrabold py-6 italic">Tudo em ordem! O estoque e a produção atual suprem a demanda.</p>
            )}
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {displayedProductionOrders.map(pOrder => {
              const product = products.find(p => p.id === pOrder.productId);
              
              return (
                  <div key={pOrder.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                      <div className={`absolute top-0 left-0 w-1 h-full ${getPriorityClass(pOrder.priority).split(' ')[0]}`}></div>
                      
                      <div className="mb-4">
                        <div className="flex justify-between items-start">
                            <h3 className="text-lg font-black text-gray-800 dark:text-gray-100 leading-tight pr-4">{product?.name}</h3>
                            <button 
                                onClick={() => user?.email && deleteProductionOrder(pOrder.id, user.email)}
                                className="text-gray-300 hover:text-red-500 transition-colors"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Iniciado em: {new Date(pOrder.creationDate).toLocaleDateString()}</p>
                      </div>

                      <div className="flex items-center justify-between mb-2">
                          <div className="text-3xl font-black text-primary-600 dark:text-primary-400">
                             {pOrder.quantity} <span className="text-xs text-gray-400 uppercase">Unid.</span>
                          </div>
                          <select
                                value={pOrder.priority}
                                onChange={(e) => handlePriorityChange(pOrder.id, e.target.value as ProductionPriority)}
                                className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter cursor-pointer border-none ring-0 ${getPriorityClass(pOrder.priority)}`}
                            >
                                {Object.values(ProductionPriority).map(priority => (
                                    <option key={priority} value={priority} className="text-black">{priority}</option>
                                ))}
                          </select>
                      </div>

                      <button 
                            onClick={() => handleFinishProduction(pOrder.id, pOrder.quantity)}
                            className="w-full mt-4 bg-green-600 text-white text-sm font-black py-3 rounded-xl hover:bg-green-700 transition shadow-md flex items-center justify-center uppercase tracking-wider"
                        >
                            <CheckCircleIcon className="w-5 h-5 mr-2"/> Finalizar Lote
                      </button>
                  </div>
              )
          })}
      </div>

      <Modal isOpen={isBreakdownModalOpen} onClose={() => setIsBreakdownModalOpen(false)} title="Resumo da Produção Ativa">
          <div className="divide-y dark:divide-gray-700">
              {productionBreakdown.map((item, idx) => (
                  <div key={idx} className="py-3 flex justify-between items-center">
                      <span className="font-bold text-gray-700 dark:text-gray-200">{item.name}</span>
                      <span className="text-2xl font-black text-primary-600">{item.qty}</span>
                  </div>
              ))}
              {productionBreakdown.length === 0 && <p className="text-center py-10 text-gray-400 font-bold uppercase">Nada em produção no momento.</p>}
          </div>
      </Modal>
    </div>
  );
};

export default Production;
