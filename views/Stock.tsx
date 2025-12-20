
import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { Product, OrderStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { CheckIcon, XCircleIcon, DocumentDownloadIcon, PlusIcon } from '../components/icons/Icons';

const Stock: React.FC = () => {
  const { products, orderItems, orders, updateProductDetails } = useData();
  const { user } = useAuth();
  const [visibleCount, setVisibleCount] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');

  const [editingStockProductId, setEditingStockProductId] = useState<string | null>(null);
  const [newQuantity, setNewQuantity] = useState<string>('');
  
  const handleEditStockClick = (product: Product) => {
    setEditingStockProductId(product.id);
    setNewQuantity(product.currentStock.toString());
  };

  const handleCancelStockEdit = () => {
    setEditingStockProductId(null);
    setNewQuantity('');
  };

  const handleSaveStock = (productId: string) => {
    const quantity = parseInt(newQuantity, 10);
    const product = products.find(p => p.id === productId);
    const minStock = product?.minimumStock || 0;

    if (user?.email && !isNaN(quantity) && quantity >= 0) {
        updateProductDetails(productId, { currentStock: quantity, minimumStock: minStock }, user.email);
        handleCancelStockEdit();
    } else {
        alert("Quantidade inválida.");
    }
  };

  const stockData = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    
    const filteredProducts = products.filter(p => {
        const name = (p.name || '').toLowerCase();
        const barcode = (p.barcode || '').toString().toLowerCase();
        return name.includes(term) || barcode.includes(term);
    });

    const activeOrderIds = new Set(
        orders
            .filter(o => o.status === OrderStatus.Open || o.status === OrderStatus.InProduction || o.status === OrderStatus.Ready)
            .map(o => o.id)
    );

    const committedMap = new Map<string, number>();
    orderItems.forEach(item => {
        if (activeOrderIds.has(item.orderId)) {
            const current = committedMap.get(item.productId) || 0;
            committedMap.set(item.productId, current + item.quantity);
        }
    });

    return filteredProducts.map(product => {
      const committed = committedMap.get(product.id) || 0;
      return { 
        ...product, 
        committedQty: committed, 
        availableStock: product.currentStock - committed 
      };
    });
  }, [products, orderItems, orders, searchTerm]);

  const handlePrintStockReport = () => {
      if (typeof (window as any).jspdf === 'undefined') {
          alert('Erro: Biblioteca de PDF não carregada.');
          return;
      }
      const doc = new (window as any).jspdf.jsPDF();
      doc.setFontSize(18);
      doc.text('Inventário de Estoque - VilaFlex', 105, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Data: ${new Date().toLocaleString('pt-BR')}`, 105, 28, { align: 'center' });

      const body = stockData.map(p => [p.name, p.barcode || '-', p.currentStock]);

      (doc as any).autoTable({
          startY: 35,
          head: [['Produto', 'Código', 'Físico']],
          body: body,
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 9 },
          columnStyles: {
              0: { cellWidth: 'auto' },
              1: { cellWidth: 40 },
              2: { cellWidth: 20, halign: 'center' }
          }
      });

      doc.save(`Inventario_Estoque_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
  };

  const displayedStock = stockData.slice(0, visibleCount);

  return (
    <div className="container mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Controle de Estoque</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <input 
                type="text"
                placeholder="Filtrar produtos..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="flex-grow sm:w-64 rounded-lg border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 text-sm"
            />
            {user?.isAdmin && (
                <button onClick={handlePrintStockReport} className="bg-gray-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-700 flex items-center transition shadow-md">
                    <DocumentDownloadIcon className="w-5 h-5 mr-2" /> PDF
                </button>
            )}
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase text-[10px] font-black leading-normal">
                    <tr>
                        <th className="py-3 px-4 sm:px-6 text-left">Produto</th>
                        <th className="py-3 px-4 sm:px-6 text-center">Disp. Real</th>
                        <th className="py-3 px-4 sm:px-6 text-center">Comprometido</th>
                        <th className="py-3 px-4 sm:px-6 text-center">Físico</th>
                        <th className="py-3 px-4 sm:px-6 text-center">Mínimo</th>
                        <th className="py-3 px-4 sm:px-6 text-center">Ações</th>
                    </tr>
                </thead>
                <tbody className="text-gray-800 dark:text-gray-200 text-sm font-light">
                    {displayedStock.map(product => (
                       <tr key={product.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                           <td className="py-3 px-4 sm:px-6 text-left whitespace-nowrap">
                                <span className="font-bold">{product.name || 'Sem Nome'}</span>
                                <p className="text-[10px] text-gray-400 font-mono uppercase">{product.barcode || 'Sem Código'}</p>
                           </td>
                           <td className={`py-3 px-4 sm:px-6 text-center font-black text-lg ${product.availableStock < (product.minimumStock || 0) ? 'text-red-600' : 'text-green-600'}`}>
                               {product.availableStock}
                           </td>
                           <td className="py-3 px-4 sm:px-6 text-center text-orange-600 font-bold">{product.committedQty}</td>
                           <td className="py-3 px-4 sm:px-6 text-center">
                               {editingStockProductId === product.id ? (
                                   <input type="number" value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} className="w-20 text-center bg-white dark:bg-gray-700 border rounded py-1 font-bold" autoFocus />
                               ) : (
                                   <span className="font-extrabold text-lg">{product.currentStock}</span>
                               )}
                           </td>
                           <td className="py-3 px-4 sm:px-6 text-center text-gray-500 font-medium">{product.minimumStock || 0}</td>
                           <td className="py-3 px-4 sm:px-6 text-center">
                               {user?.isStock || user?.isAdmin ? (
                                   editingStockProductId === product.id ? (
                                       <div className="flex item-center justify-center space-x-2">
                                           <button onClick={() => handleSaveStock(product.id)} className="text-green-500 p-1"><CheckIcon className="w-5 h-5" /></button>
                                           <button onClick={handleCancelStockEdit} className="text-red-500 p-1"><XCircleIcon className="w-5 h-5" /></button>
                                       </div>
                                   ) : (
                                       <button onClick={() => handleEditStockClick(product)} className="bg-blue-50 text-blue-600 dark:bg-blue-900/30 px-3 py-1 rounded-md text-[10px] font-bold uppercase hover:bg-blue-100 transition">Ajustar</button>
                                   )
                               ) : (
                                   <span className="text-[10px] text-gray-400 italic">Restrito</span>
                               )}
                           </td>
                       </tr>
                    ))}
                    {displayedStock.length === 0 && (
                        <tr>
                            <td colSpan={6} className="text-center py-10 text-gray-500 italic uppercase font-bold">Nenhum produto em estoque.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
        {stockData.length > visibleCount && (
            <div className="p-4 text-center border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => setVisibleCount(prev => prev + 20)} className="text-primary-600 font-bold hover:underline uppercase text-xs">Carregar Mais Produtos</button>
            </div>
        )}
      </div>
    </div>
  );
};

export default Stock;
