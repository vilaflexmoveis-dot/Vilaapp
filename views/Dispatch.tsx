
import React, { useMemo, useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Order, OrderStatus, Product } from '../types';
import { getStatusClass } from './Orders';
import SignatureModal from '../components/SignatureModal';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { PlusIcon } from '../components/icons/Icons';

interface StockData extends Product {
    committedQty: number;
    availableStock: number;
}

// Helper robusto para formatar datas e evitar erro de 1969 e erros de fuso horário
const formatSafeDate = (dateStr?: string | number) => {
    if (!dateStr || dateStr === '0' || dateStr === 0 || dateStr === 'null' || dateStr === 'undefined') {
        return 'Não informada';
    }
    
    try {
        // Se a data vier no formato AAAA-MM-DD (comum em inputs), tratamos manualmente para evitar erro de fuso horário
        if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('-').map(Number);
            const localDate = new Date(year, month - 1, day);
            return localDate.toLocaleDateString('pt-BR');
        }

        const date = new Date(dateStr);
        if (isNaN(date.getTime()) || date.getFullYear() < 1980) {
            return 'Não informada';
        }
        return date.toLocaleDateString('pt-BR');
    } catch (e) {
        return 'Não informada';
    }
};

const DispatchRow: React.FC<{ order: Order; stockData: StockData[] }> = ({ order, stockData }) => {
    const { customers, orderItems, products, saveSignature, updateOrderStatus, payments } = useData();
    const { user } = useAuth();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

    const customer = customers.find(c => c.id === order.customerId);
    const total = useMemo(() => 
        orderItems
            .filter(item => item.orderId === order.id)
            .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
        [orderItems, order.id]
    );

    // Identifica se o pedido está totalmente pago
    const isPaid = useMemo(() => {
        const orderPayments = payments.filter(p => p.orderId === order.id);
        const totalPaid = orderPayments.reduce((sum, p) => sum + p.amountPaid, 0);
        return totalPaid >= (total - 0.05); // Margem para arredondamentos
    }, [payments, order.id, total]);

    const handleSaveSignatureAndClose = (signature: string) => {
        if (user?.email) {
            saveSignature(order.id, signature, user.email);
            setIsSignatureModalOpen(false);
            alert('Assinatura salva com sucesso! Agora gere o romaneio para concluir a entrega.');
        }
    };

    const handleClearSignature = () => {
        if(window.confirm('Tem certeza que deseja remover esta assinatura?')) {
            if (user?.email) {
                saveSignature(order.id, '', user.email);
            }
        }
    };

    const handleGeneratePDF = () => {
        if (typeof (window as any).jspdf === 'undefined' || !(window as any).jspdf.jsPDF) {
            alert('Erro: Biblioteca de PDF não carregada. Recarregue a página.');
            return null;
        }

        try {
            const doc = new (window as any).jspdf.jsPDF();
            const now = new Date();
            
            // PRIORIDADE: Usa a data fixa salva no romaneio. Se não houver (primeira vez), usa agora.
            const emissionSource = order.romaneioDate ? new Date(order.romaneioDate) : now;
            
            const creationDate = new Date(order.orderDate);
            const dateStr = emissionSource.toLocaleDateString('pt-BR');
            const timeStr = emissionSource.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            const creationDateStr = creationDate.toLocaleDateString('pt-BR');
            const creationTimeStr = creationDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('VilaFlex ERP', 105, 20, { align: 'center' });
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('CNPJ: 00.000.000/0001-00', 105, 26, { align: 'center' });
            doc.setLineWidth(0.5);
            doc.line(15, 30, 195, 30);

            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Romaneio de Entrega', 105, 40, { align: 'center' });
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Pedido Nº: ${order.orderNumber}`, 15, 50);
            doc.text(`Criado em: ${creationDateStr} às ${creationTimeStr}`, 15, 56);
            
            // Inclusão da Data de Entrega tratada no PDF
            doc.setFont('helvetica', 'bold');
            doc.text(`DATA PREVISTA ENTREGA: ${formatSafeDate(order.deliveryDate)}`, 15, 62);
            doc.setFont('helvetica', 'normal');

            // Pagamento Condicional
            const orderPayment = payments.find(p => p.orderId === order.id);
            if (orderPayment) {
                const pDate = new Date(orderPayment.paymentDate);
                doc.text(`PAGO EM: ${pDate.toLocaleDateString('pt-BR')} às ${pDate.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}`, 15, 68);
            }

            doc.text(`Emissão: ${dateStr} às ${timeStr}`, 195, 50, { align: 'right' });

            const addressParts = [customer?.address, customer?.number, customer?.neighborhood, customer?.city].filter(part => part).join(' ');

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Dados do Cliente', 15, 80);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Nome: ${customer?.name || 'N/A'}`, 15, 87);
            doc.text(`Endereço: ${addressParts || 'N/A'}`, 15, 93);
            doc.text(`Telefone: ${customer?.phone || 'N/A'}`, 15, 99);

            const tableColumn = ["Produto", "Qtd", "Vlr. Unit", "Total"];
            const tableRows: any[][] = [];
            orderItems.filter(item => item.orderId === order.id).forEach(item => {
                const product = products.find(p => p.id === item.productId);
                tableRows.push([
                    product?.name || 'N/A',
                    item.quantity,
                    item.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                    (item.quantity * item.unitPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                ]);
            });

            if((doc as any).autoTable) {
                (doc as any).autoTable({
                    head: [tableColumn],
                    body: tableRows,
                    startY: 105,
                    theme: 'striped',
                    headStyles: { fillColor: [29, 78, 216] },
                    styles: { fontSize: 9, overflow: 'linebreak' },
                    columnStyles: {
                        0: { cellWidth: 'auto' },
                        1: { cellWidth: 20, halign: 'center' },
                        2: { cellWidth: 35, halign: 'right' },
                        3: { cellWidth: 35, halign: 'right' }
                    }
                });
            }

            const finalY = (doc as any).lastAutoTable.finalY || 140;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`Total: ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 195, finalY + 10, { align: 'right' });

            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            const term = "Declaro, para os devidos fins, que o produto descrito neste documento foi recebido em perfeitas condições, sem avarias visíveis no ato da entrega. A assinatura deste termo confirma a inspeção visual do produto e a aceitação do mesmo neste estado.";
            const splitTerm = doc.splitTextToSize(term, 180);
            doc.text(splitTerm, 15, finalY + 25);

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Recebido por:', 15, finalY + 50);
            doc.line(15, finalY + 70, 120, finalY + 70); 
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`${customer?.name || ''}`, 15, finalY + 75);

            if (order.deliverySignature) {
                try {
                    doc.addImage(order.deliverySignature, 'PNG', 15, finalY + 52, 70, 18);
                } catch(e) {}
            }

            return doc;
        } catch (error) {
            console.error("PDF Gen Error:", error);
            alert("Erro ao gerar PDF.");
            return null;
        }
    };

    const handleSendWhatsApp = () => {
        if (!customer?.phone) {
            alert('Cliente sem telefone cadastrado.');
            return;
        }

        // MARCAR COMO ENTREGUE PRIMEIRO NO BANCO
        // O DataContext cuidará de salvar a romaneioDate se for a primeira vez
        if (user?.email && order.status !== OrderStatus.Delivered) {
             updateOrderStatus(order.id, OrderStatus.Delivered, user.email);
        }

        const cleanPhone = customer.phone.replace(/\D/g, '');
        const message = `Olá ${customer.name}, seu pedido #${order.orderNumber} está saindo para entrega! Segue o link para visualizar o romaneio no ERP VilaFlex.`;
        const waUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');

        setIsActionModalOpen(false);
    };

    const handlePrint = () => {
        // MARCAR COMO ENTREGUE PRIMEIRO NO BANCO
        // O DataContext cuidará de salvar a romaneioDate se for a primeira vez
        if (user?.email && order.status !== OrderStatus.Delivered) {
             updateOrderStatus(order.id, OrderStatus.Delivered, user.email);
        }

        const doc = handleGeneratePDF();
        if (!doc) return;

        doc.save(`Romaneio-Pedido-${order.orderNumber}.pdf`);
        setIsActionModalOpen(false);
    };

    return (
        <>
            <tr 
                className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <td className="py-3 px-4 sm:px-6 text-left whitespace-nowrap">
                    <div className="flex items-center gap-2">
                        <span className="font-bold">#{order.orderNumber}</span>
                        {isPaid && (
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.6)]" title="Pedido Totalmente Pago"></div>
                        )}
                    </div>
                </td>
                <td className="py-3 px-4 sm:px-6 text-left">{customer?.name || 'N/A'}</td>
                <td className="py-3 px-4 sm:px-6 text-center">
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] text-gray-400 uppercase font-bold">Prev. Entrega</span>
                        <span className="font-bold">{formatSafeDate(order.deliveryDate)}</span>
                    </div>
                </td>
                <td className="py-3 px-4 sm:px-6 text-center">
                    <span className={`py-1 px-3 rounded-full text-xs ${getStatusClass(order.status)}`}>
                        {order.status}
                    </span>
                </td>
                <td className="py-3 px-4 sm:px-6 text-right font-medium">
                    <div className="flex flex-col items-end">
                        <span>{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        {isPaid && (
                            <span className="text-[9px] font-black text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1 rounded mt-0.5 tracking-tighter">PAGO</span>
                        )}
                    </div>
                </td>
            </tr>
            {isExpanded && (
                <tr className="bg-white dark:bg-gray-800 animate-fade-in">
                    <td colSpan={5} className="p-4 sm:p-6">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">Detalhes da Entrega</h3>
                            {isPaid && (
                                <div className="flex items-center text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full border border-green-100 dark:border-green-800">
                                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                                    <span className="text-xs font-bold uppercase">Pagamento Confirmado</span>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-200">Itens do Pedido:</h4>
                                <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-300">
                                    {orderItems.filter(i => i.orderId === order.id).map(item => {
                                        const product = products.find(p => p.id === item.productId);
                                        return <li key={item.id}>{item.quantity}x {product?.name}</li>;
                                    })}
                                </ul>
                                <div className="mt-4 text-sm">
                                    <p><span className="font-semibold">Endereço:</span> {[customer?.address, customer?.number, customer?.neighborhood, customer?.city].filter(Boolean).join(', ')}</p>
                                    <p><span className="font-semibold">Telefone:</span> {customer?.phone || 'N/A'}</p>
                                    <p className="mt-1"><span className="font-bold text-primary-600">Previsão: {formatSafeDate(order.deliveryDate)}</span></p>
                                    {order.romaneioDate && (
                                        <p className="mt-2 text-xs text-gray-500 italic">Documento gerado em: {new Date(order.romaneioDate).toLocaleString('pt-BR')}</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-200">Assinatura do Cliente:</h4>
                                {order.deliverySignature ? (
                                    <div>
                                        <img src={order.deliverySignature} alt="Assinatura" className="border rounded-md bg-white p-1 max-w-xs"/>
                                        <button onClick={handleClearSignature} className="text-sm text-red-500 hover:underline mt-2">Remover Assinatura</button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setIsSignatureModalOpen(true)}
                                        className="bg-primary-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-700 transition duration-300 touch-manipulation"
                                    >
                                        Assinar
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="mt-6 border-t pt-4 dark:border-gray-700 flex justify-end">
                            <button onClick={() => setIsActionModalOpen(true)} className="bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition duration-300 touch-manipulation">
                                {order.romaneioDate ? 'Reimprimir Romaneio' : 'Gerar Romaneio de Entrega'}
                            </button>
                        </div>
                    </td>
                </tr>
            )}
            <Modal isOpen={isActionModalOpen} onClose={() => setIsActionModalOpen(false)} title="Gerar Romaneio de Entrega">
                <div className="text-center p-4">
                    <p className="mb-4">Como deseja prosseguir com o romaneio do pedido #{order.orderNumber}?</p>
                    {!order.romaneioDate && <p className="mb-6 text-sm text-gray-500">Ao gerar o documento, o pedido será marcado automaticamente como <strong>Entregue</strong> e a data atual será fixada como hora de emissão.</p>}
                    {order.romaneioDate && <p className="mb-6 text-sm text-blue-600 font-bold">Este romaneio já possui uma data de emissão fixa: {new Date(order.romaneioDate).toLocaleString('pt-BR')}.</p>}
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <button onClick={handlePrint} className="bg-primary-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-700 touch-manipulation">Imprimir PDF</button>
                        <button onClick={handleSendWhatsApp} className="bg-green-50 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-600 touch-manipulation flex items-center justify-center">
                           <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.232 3.484 8.412-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.309 1.656zm6.222-4.115l.346.204c1.288.767 2.769 1.15 4.316 1.15 5.148 0 9.336-4.188 9.338-9.338.001-2.494-.972-4.838-2.738-6.606-1.767-1.769-4.111-2.742-6.603-2.742-5.15 0-9.338 4.188-9.341 9.338-.001 1.705.469 3.376 1.358 4.825l.226.374-1.048 3.824 3.931-1.031zm11.034-7.394c-.116-.194-.426-.31-.881-.542-.456-.233-2.691-1.328-3.107-1.483-.415-.155-.717-.233-1.018.233-.3.465-1.163 1.483-1.423 1.794-.26.31-.519.349-.974.116-.456-.233-1.926-.71-3.67-2.264-1.357-1.21-2.273-2.705-2.532-3.171-.26-.465-.027-.717.205-.949.21-.208.456-.542.684-.814.228-.271.304-.465.456-.776.152-.311.076-.582-.038-.814-.114-.233-1.018-2.454-1.393-3.36-.364-.881-.734-.761-1.018-.776l-.867-.016c-.3 0-.788.113-1.2.56-.412.448-1.574 1.54-1.574 3.755 0 2.215 1.612 4.355 1.838 4.665.228.311 3.172 4.845 7.684 6.793 1.073.463 1.912.74 2.565.948 1.077.342 2.057.294 2.831.178.864-.13 2.691-1.1 3.072-2.164.382-1.065.382-1.978.269-2.171z"/></svg>
                           Enviar via WhatsApp
                        </button>
                    </div>
                </div>
            </Modal>
            <SignatureModal 
                isOpen={isSignatureModalOpen} 
                onClose={() => setIsSignatureModalOpen(false)} 
                onSave={handleSaveSignatureAndClose}
            />
        </>
    );
};

const Dispatch: React.FC<{ onViewOrder: (orderId: string) => void }> = ({ onViewOrder }) => {
  const { orders, customers, orderItems, products } = useData();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    setVisibleCount(10);
  }, [searchTerm, showHistory]);

  const ordersToDispatch = useMemo(() => {
    const filtered = orders.filter(order => {
        if (showHistory && user?.isAdmin) {
             return order.status === OrderStatus.Ready || order.status === OrderStatus.Delivered;
        }
        return order.status === OrderStatus.Ready;
    });

    const sorted = filtered.sort((a, b) => {
        if (a.status !== b.status) {
            if (a.status === OrderStatus.Ready) return -1;
            if (b.status === OrderStatus.Ready) return 1;
        }
        return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
    });

    if (!searchTerm) return sorted;
    const lowerSearch = searchTerm.toLowerCase();
    return sorted.filter(order => customers.find(c => c.id === order.customerId)?.name.toLowerCase().includes(lowerSearch));
  }, [orders, customers, searchTerm, showHistory, user]);
  
  const stockData = useMemo(() => {
    return products.map(product => {
      const committed = orderItems.reduce((sum, item) => {
        const order = orders.find(o => o.id === item.orderId);
        if (item.productId === product.id && order && order.status !== OrderStatus.Delivered && order.status !== OrderStatus.Cancelled) {
          return sum + item.quantity;
        }
        return sum;
      }, 0);
      return { ...product, committedQty: committed, availableStock: product.currentStock - committed };
    });
  }, [products, orderItems, orders]);

  const displayedOrders = ordersToDispatch.slice(0, visibleCount);

  return (
    <div className="container mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Expedição</h1>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <input
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
            />
            {user?.isAdmin && (
                 <label className="flex items-center space-x-2 cursor-pointer bg-white dark:bg-gray-700 px-3 py-2 rounded-lg border dark:border-gray-600">
                    <input type="checkbox" checked={showHistory} onChange={e => setShowHistory(e.target.checked)} className="rounded text-primary-600"/>
                    <span className="text-sm font-medium">Mostrar Entregues</span>
                </label>
            )}
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase text-xs font-bold leading-normal">
                    <tr>
                        <th className="py-3 px-4 sm:px-6 text-left">Pedido Nº</th>
                        <th className="py-3 px-4 sm:px-6 text-left">Cliente</th>
                        <th className="py-3 px-4 sm:px-6 text-center">Data Entrega</th>
                        <th className="py-3 px-4 sm:px-6 text-center">Status</th>
                        <th className="py-3 px-4 sm:px-6 text-right">Total</th>
                    </tr>
                </thead>
                <tbody className="text-gray-800 dark:text-gray-200 text-sm font-light">
                    {displayedOrders.map(order => (
                        <DispatchRow key={order.id} order={order} stockData={stockData} />
                    ))}
                    {displayedOrders.length === 0 && (
                        <tr>
                            <td colSpan={5} className="text-center py-10 text-gray-500">Nenhum pedido pronto para expedição.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default Dispatch;
