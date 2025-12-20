
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { PencilIcon, PlusIcon, TrashIcon } from '../components/icons/Icons';
import Modal from '../components/Modal';

const Products: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct } = useData();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(10);

  // State for CRUD Product (Modal)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
      name: '',
      barcode: '',
      basePrice: '',
      costPrice: '',
      currentStock: '0',
      minimumStock: '0'
  });

  // --- Calculations for Margin Display ---
  const calculateMargin = () => {
      const price = parseFloat(productForm.basePrice) || 0;
      const cost = parseFloat(productForm.costPrice) || 0;
      if (price === 0) return { percent: 0, value: 0 };
      const profit = price - cost;
      const margin = (profit / price) * 100;
      return { percent: margin, value: profit };
  };

  const marginData = calculateMargin();

  const filteredProducts = products.filter(p => {
      const name = (p.name || '').toLowerCase();
      const barcode = (p.barcode || '').toString().toLowerCase();
      const term = searchTerm.toLowerCase();
      return name.includes(term) || barcode.includes(term);
  });

  const displayedProducts = filteredProducts.slice(0, visibleCount);

  // --- CRUD Product Handlers ---
  const openProductModal = (product?: Product) => {
      if (product) {
          setEditingProduct(product);
          setProductForm({
              name: product.name,
              barcode: product.barcode,
              basePrice: product.basePrice.toString(),
              costPrice: (product.costPrice || 0).toString(),
              currentStock: product.currentStock.toString(),
              minimumStock: product.minimumStock?.toString() || '0'
          });
      } else {
          setEditingProduct(null);
          setProductForm({
              name: '',
              barcode: '',
              basePrice: '',
              costPrice: '',
              currentStock: '0',
              minimumStock: '0'
          });
      }
      setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
      e.preventDefault();
      if(!productForm.name || !productForm.basePrice) {
          alert("Nome e Preço Base são obrigatórios.");
          return;
      }
      const price = parseFloat(productForm.basePrice);
      const cost = parseFloat(productForm.costPrice) || 0;
      const stock = parseInt(productForm.currentStock, 10);
      const minStock = parseInt(productForm.minimumStock, 10);

      if (user?.email) {
          if (editingProduct) {
              updateProduct({
                  ...editingProduct,
                  name: productForm.name,
                  barcode: productForm.barcode,
                  basePrice: price,
                  costPrice: cost,
                  currentStock: stock,
                  minimumStock: minStock
              }, user.email);
          } else {
              addProduct({
                  name: productForm.name,
                  barcode: productForm.barcode,
                  basePrice: price,
                  costPrice: cost,
                  currentStock: stock,
                  minimumStock: minStock
              }, user.email);
          }
          setIsProductModalOpen(false);
      }
  };

  const handleDeleteProduct = (productId: string) => {
      if(window.confirm("Tem certeza que deseja excluir este produto?")) {
          if(user?.email) {
              deleteProduct(productId, user.email);
          }
      }
  };
  
  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 10);
  };

  return (
    <div className="container mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Cadastro de Produtos</h1>
        <div className="flex gap-4 w-full sm:w-auto">
            <input 
                type="text"
                placeholder="Buscar por nome ou código..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="rounded-lg border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 w-full sm:w-64"
            />
            {user?.isAdmin && (
                <button
                    onClick={() => openProductModal()}
                    className="flex items-center bg-primary-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-700 transition duration-300 whitespace-nowrap"
                >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Novo Produto
                </button>
            )}
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase text-sm leading-normal">
                    <tr>
                        <th className="py-3 px-4 text-left">Produto</th>
                        <th className="py-3 px-4 text-center">Código</th>
                        <th className="py-3 px-4 text-right">Custo</th>
                        <th className="py-3 px-4 text-right">Venda</th>
                        <th className="py-3 px-4 text-center">Estoque Min.</th>
                        {user?.isAdmin && <th className="py-3 px-4 text-center">Ações</th>}
                    </tr>
                </thead>
                <tbody className="text-gray-800 dark:text-gray-200 text-sm font-light">
                    {displayedProducts.map(product => (
                       <tr key={product.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                           <td className="py-3 px-4 text-left font-medium">{product.name || 'Sem Nome'}</td>
                           <td className="py-3 px-4 text-center text-gray-500">{product.barcode || 'S/C'}</td>
                           <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                               {product.costPrice ? `R$ ${product.costPrice.toFixed(2)}` : '-'}
                           </td>
                           <td className="py-3 px-4 text-right font-bold text-green-600 dark:text-green-400">
                               R$ {product.basePrice.toFixed(2)}
                           </td>
                           <td className="py-3 px-4 text-center">{product.minimumStock || 0}</td>
                           {user?.isAdmin && (
                               <td className="py-3 px-4 text-center">
                                   <div className="flex item-center justify-center space-x-2">
                                       <button onClick={() => openProductModal(product)} className="text-blue-500 hover:text-blue-700 p-2" title="Editar">
                                           <PencilIcon className="w-5 h-5" />
                                       </button>
                                       <button onClick={() => handleDeleteProduct(product.id)} className="text-red-500 hover:text-red-700 p-2" title="Excluir">
                                            <TrashIcon className="w-5 h-5" />
                                       </button>
                                   </div>
                               </td>
                           )}
                       </tr>
                    ))}
                    {displayedProducts.length === 0 && (
                        <tr>
                            <td colSpan={user?.isAdmin ? 6 : 5} className="text-center py-6 text-gray-500">Nenhum produto encontrado.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
        
        {visibleCount < filteredProducts.length && (
            <div className="p-4 text-center border-t border-gray-200 dark:border-gray-700">
                <button 
                    onClick={handleLoadMore}
                    className="text-primary-600 dark:text-primary-400 font-medium hover:underline flex items-center justify-center mx-auto"
                >
                    <PlusIcon className="w-4 h-4 mr-1" />
                    Visualizar mais 10
                </button>
            </div>
        )}
      </div>

      <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title={editingProduct ? "Editar Produto" : "Novo Produto"}>
          <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Produto</label>
                  <input 
                    type="text" 
                    value={productForm.name} 
                    onChange={e => setProductForm({...productForm, name: e.target.value})} 
                    required 
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm py-2 px-3" 
                  />
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Código de Barras</label>
                  <input 
                    type="text" 
                    value={productForm.barcode} 
                    onChange={e => setProductForm({...productForm, barcode: e.target.value})} 
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm py-2 px-3" 
                  />
              </div>
              
              <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preço de Custo (R$)</label>
                      <input 
                        type="number" 
                        value={productForm.costPrice} 
                        onChange={e => setProductForm({...productForm, costPrice: e.target.value})} 
                        step="0.01"
                        min="0"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm py-2 px-3" 
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preço de Venda (R$)</label>
                      <input 
                        type="number" 
                        value={productForm.basePrice} 
                        onChange={e => setProductForm({...productForm, basePrice: e.target.value})} 
                        required 
                        step="0.01"
                        min="0"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm py-2 px-3" 
                      />
                  </div>
                  
                  {/* Profit Margin Indicator */}
                  <div className="col-span-2 flex justify-between items-center text-sm pt-1 px-1">
                      <span className="text-gray-500 dark:text-gray-400">Lucro Estimado:</span>
                      <div className="flex items-center space-x-4">
                          <span className={`font-bold ${marginData.value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                              R$ {marginData.value.toFixed(2)}
                          </span>
                          <span className={`font-bold ${marginData.percent > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>
                              {marginData.percent.toFixed(1)}%
                          </span>
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  {/* Show Current Stock only on creation or read-only on edit */}
                  <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estoque Inicial</label>
                      <input 
                        type="number" 
                        value={productForm.currentStock} 
                        onChange={e => setProductForm({...productForm, currentStock: e.target.value})} 
                        required 
                        min="0"
                        disabled={!!editingProduct} // Disable if editing, changes should be made in Stock view
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm py-2 px-3 disabled:opacity-50" 
                      />
                      {editingProduct && <span className="text-xs text-gray-500">Ajuste na aba Estoque</span>}
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estoque Mínimo</label>
                      <input 
                        type="number" 
                        value={productForm.minimumStock} 
                        onChange={e => setProductForm({...productForm, minimumStock: e.target.value})} 
                        min="0"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm py-2 px-3" 
                      />
                  </div>
              </div>

              <div className="flex justify-end pt-4 space-x-3">
                  <button type="button" onClick={() => setIsProductModalOpen(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition">Cancelar</button>
                  <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition">Salvar Produto</button>
              </div>
          </form>
      </Modal>
    </div>
  );
};

export default Products;
