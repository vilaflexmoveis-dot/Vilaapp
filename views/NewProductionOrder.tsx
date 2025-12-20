import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ProductionPriority } from '../types';
import { ArrowLeftIcon } from '../components/icons/Icons';

interface NewProductionOrderProps {
  onBack: () => void;
}

const NewProductionOrder: React.FC<NewProductionOrderProps> = ({ onBack }) => {
  const { products, addProductionOrder } = useData();
  const { user } = useAuth();
  
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [priority, setPriority] = useState<ProductionPriority>(ProductionPriority.Stock);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const numQuantity = parseInt(quantity, 10);
    if (!productId || !numQuantity || numQuantity <= 0) {
        alert('Selecione um produto e informe uma quantidade válida.');
        return;
    }
    if (user?.email) {
        addProductionOrder({ productId, quantity: numQuantity, priority }, user.email);
        alert('Ordem de produção criada com sucesso!');
        onBack();
    }
  };

  return (
    <div className="container mx-auto max-w-2xl">
        <div className="flex items-center mb-6">
            <button onClick={onBack} className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors mr-4">
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Voltar
            </button>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Nova Ordem de Produção</h1>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sm:p-8">
            <form onSubmit={handleSave} className="space-y-6">
                <div>
                    <label htmlFor="product" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Produto
                    </label>
                    <div className="mt-1">
                        <select
                            id="product"
                            value={productId}
                            onChange={e => setProductId(e.target.value)}
                            required
                            className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                        >
                            <option value="">Selecione um produto...</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                </div>

                 <div>
                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Quantidade a Produzir
                    </label>
                    <div className="mt-1">
                        <input
                            type="number"
                            name="quantity"
                            id="quantity"
                            value={quantity}
                            onChange={e => setQuantity(e.target.value)}
                            required
                            min="1"
                            className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                        />
                    </div>
                </div>
                
                <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Prioridade
                    </label>
                    <div className="mt-1">
                        <select
                            id="priority"
                            value={priority}
                            onChange={e => setPriority(e.target.value as ProductionPriority)}
                            required
                            className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                        >
                           {Object.values(ProductionPriority).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                </div>

                <div className="pt-4 flex justify-end">
                    <button
                        type="button"
                        onClick={onBack}
                        className="bg-white dark:bg-gray-700 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                        Criar Ordem
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};

export default NewProductionOrder;