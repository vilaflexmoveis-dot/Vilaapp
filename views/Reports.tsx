
import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { OrderStatus, ProductionStatus, Order } from '../types';
import { DocumentDownloadIcon, PlusIcon, MinusIcon } from '../components/icons/Icons';

type ReportType = 'sales' | 'production' | 'debtors' | 'profitability' | 'finance' | 'itemsByCustomer';

const Reports: React.FC = () => {
    const { productionOrders, products, payments, orderItems, orders, customers, paymentMethods } = useData();

    // Inicia com o primeiro dia do mês atual e o dia de hoje
    const [startDate, setStartDate] = useState<string>(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    }); 
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]); 
    const [activeTab, setActiveTab] = useState<ReportType>('sales');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedDebtorId, setExpandedDebtorId] = useState<string | null>(null);

    // Converte as strings de data para objetos Date comparáveis com segurança de fuso horário
    const filteredRange = useMemo(() => {
        if (!startDate || !endDate) return null;
        
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T23:59:59');
        
        return { start, end };
    }, [startDate, endDate]);

    const matchesSearch = (text: any) => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return true;
        return String(text || '').toLowerCase().includes(term);
    };

    // 1. Relatório de Vendas (Pedidos)
    const salesReport = useMemo(() => {
        if (!filteredRange) return [];
        return orders.filter(o => {
            const d = new Date(o.orderDate);
            const customer = customers.find(c => c.id === o.customerId);
            const customerName = customer?.name || '';
            const isInRange = d >= filteredRange.start && d <= filteredRange.end;
            return isInRange && o.status !== OrderStatus.Cancelled && matchesSearch(customerName);
        }).map(order => {
             const items = orderItems.filter(i => i.orderId === order.id);
             const rev = items.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0);
             return { 
                 date: order.orderDate, 
                 orderNumber: order.orderNumber, 
                 customerName: customers.find(c => c.id === order.customerId)?.name || 'N/A', 
                 total: rev 
             };
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [orders, orderItems, customers, filteredRange, searchTerm]);

    // 2. Relatório de Itens por Cliente
    const itemsByCustomerReport = useMemo(() => {
        if (!filteredRange) return [];
        const stats = new Map<string, { customerName: string, items: { productName: string, qty: number, total: number }[] }>();

        orders.filter(o => {
            const d = new Date(o.orderDate);
            const customer = customers.find(c => c.id === o.customerId);
            const customerName = customer?.name || '';
            const isInRange = d >= filteredRange.start && d <= filteredRange.end;
            return isInRange && o.status !== OrderStatus.Cancelled && matchesSearch(customerName);
        }).forEach(order => {
            const customer = customers.find(c => c.id === order.customerId);
            if (!customer) return;

            const entry = stats.get(customer.id) || { customerName: customer.name, items: [] };
            
            orderItems.filter(i => i.orderId === order.id).forEach(item => {
                const product = products.find(p => p.id === item.productId);
                const pName = product?.name || 'Produto Removido';
                const existingItem = entry.items.find(ei => ei.productName === pName);
                
                if (existingItem) {
                    existingItem.qty += item.quantity;
                    existingItem.total += (item.quantity * item.unitPrice);
                } else {
                    entry.items.push({
                        productName: pName,
                        qty: item.quantity,
                        total: item.quantity * item.unitPrice
                    });
                }
            });
            stats.set(customer.id, entry);
        });

        return Array.from(stats.values()).sort((a, b) => a.customerName.localeCompare(b.customerName));
    }, [orders, orderItems, customers, products, filteredRange, searchTerm]);

    // 3. Relatório de Lucratividade
    const profitabilityReport = useMemo(() => {
        if (!filteredRange) return [];
        const stats = new Map<string, { qty: number; revenue: number; cost: number }>();
        const periodOrders = orders.filter(o => {
            const d = new Date(o.orderDate);
            return d >= filteredRange.start && d <= filteredRange.end && o.status !== OrderStatus.Cancelled;
        });

        periodOrders.forEach(order => {
            orderItems.filter(i => i.orderId === order.id).forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product && matchesSearch(product.name)) {
                    const current = stats.get(item.productId) || { qty: 0, revenue: 0, cost: 0 };
                    const costAtTime = item.costPrice !== undefined ? item.costPrice : (product?.costPrice || 0);
                    
                    stats.set(item.productId, {
                        qty: current.qty + item.quantity,
                        revenue: current.revenue + (item.quantity * item.unitPrice),
                        cost: current.cost + (item.quantity * costAtTime)
                    });
                }
            });
        });

        return Array.from(stats.entries()).map(([pid, data]) => {
            const product = products.find(p => p.id === pid);
            const profit = data.revenue - data.cost;
            const margin = data.revenue > 0 ? (profit / data.revenue) * 100 : 0;
            return {
                name: product?.name || 'Desconhecido',
                qty: data.qty,
                totalRevenue: data.revenue,
                totalProfit: profit,
                margin
            };
        }).sort((a, b) => b.totalProfit - a.totalProfit);
    }, [orders, orderItems, products, filteredRange, searchTerm]);

    // 4. Relatório de Devedores
    const debtorsReport = useMemo(() => {
        return customers.filter(c => matchesSearch(c.name)).map(customer => {
            const customerOrders = orders.filter(o => o.customerId === customer.id && o.status !== OrderStatus.Cancelled);
            
            const unpaidOrders = customerOrders.map(order => {
                const totalOrder = orderItems.filter(i => i.orderId === order.id).reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
                const totalPaidForOrder = payments.filter(p => p.orderId === order.id).reduce((sum, p) => sum + p.amountPaid, 0);
                const balance = totalOrder - totalPaidForOrder;
                return { order, totalOrder, totalPaidForOrder, balance };
            }).filter(uo => uo.balance > 0.05);

            const totalPurchased = customerOrders.reduce((acc, order) => {
                return acc + orderItems.filter(i => i.orderId === order.id).reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
            }, 0);

            const totalPaid = payments.filter(p => p.customerId === customer.id).reduce((acc, p) => acc + p.amountPaid, 0);
            const balance = totalPurchased - totalPaid;

            return {
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                totalPurchased,
                totalPaid,
                balance,
                unpaidOrders
            };
        }).filter(d => d.balance > 0.05).sort((a, b) => b.balance - a.balance);
    }, [customers, orders, orderItems, payments, searchTerm]);

    // 5. Relatório Financeiro
    const financeReport = useMemo(() => {
        if (!filteredRange) return [];
        const stats = new Map<string, number>();
        payments.filter(p => {
            const d = new Date(p.paymentDate);
            const customer = customers.find(c => c.id === p.customerId);
            const isInRange = d >= filteredRange.start && d <= filteredRange.end;
            return isInRange && matchesSearch(customer?.name);
        }).forEach(p => {
            stats.set(p.paymentMethodId, (stats.get(p.paymentMethodId) || 0) + p.amountPaid);
        });

        return Array.from(stats.entries()).map(([mid, total]) => ({
            method: paymentMethods.find(m => m.id === mid)?.name || 'Outros',
            total
        })).sort((a, b) => b.total - a.total);
    }, [payments, paymentMethods, filteredRange, searchTerm, customers]);

    const handleExportIndividualDebtorPDF = (debtor: any) => {
        if (!(window as any).jspdf || !(window as any).jspdf.jsPDF) {
            alert('Erro: Biblioteca de PDF não carregada.');
            return;
        }

        const doc = new (window as any).jspdf.jsPDF('p', 'mm', 'a4');
        const now = new Date();

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('VilaFlex ERP - Extrato de Cobrança', 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Emissão: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 105, 26, { align: 'center' });
        doc.line(14, 30, 196, 30);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Dados do Cliente:', 14, 40);
        doc.setFont('helvetica', 'normal');
        doc.text(`Nome: ${debtor.name}`, 14, 46);
        doc.text(`Telefone: ${debtor.phone || 'N/A'}`, 14, 52);

        const headers = ['Pedido', 'Data', 'Vlr. Pedido', 'Vlr. Pago', 'Saldo Devedor'];
        const body = debtor.unpaidOrders.map((uo: any) => [
            `#${uo.order.orderNumber}`,
            new Date(uo.order.orderDate).toLocaleDateString(),
            uo.totalOrder.toLocaleString('pt-BR', {style:'currency', currency:'BRL'}),
            uo.totalPaidForOrder.toLocaleString('pt-BR', {style:'currency', currency:'BRL'}),
            uo.balance.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})
        ]);

        (doc as any).autoTable({
            startY: 60,
            head: [headers],
            body: body,
            theme: 'striped',
            headStyles: { fillColor: [220, 38, 38] }, 
            styles: { fontSize: 9, overflow: 'linebreak' },
            foot: [[
                '', '', '', 'TOTAL DEVEDOR:', debtor.balance.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})
            ]],
            footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
        });

        const finalY = (doc as any).lastAutoTable.finalY || 100;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text('Este documento é um extrato informativo de pendências financeiras.', 14, finalY + 15);

        doc.save(`Extrato_Debito_${debtor.name.replace(/\s+/g, '_')}.pdf`);
    };

    const handleExportPDF = () => {
        const doc = new (window as any).jspdf.jsPDF('p', 'mm', 'a4');
        const titleMap: Record<ReportType, string> = {
            sales: 'Vendas por Período',
            itemsByCustomer: 'Itens Comprados por Cliente',
            profitability: 'Lucratividade por Produto',
            production: 'Produção Finalizada',
            debtors: 'Devedores e Inadimplência',
            finance: 'Resumo Financeiro'
        };

        doc.setFontSize(16);
        doc.text(titleMap[activeTab], 14, 15);
        doc.setFontSize(10);
        doc.text(`Período: ${new Date(startDate).toLocaleDateString()} até ${new Date(endDate).toLocaleDateString()}`, 14, 22);

        let headers: string[] = [];
        let body: any[][] = [];

        if (activeTab === 'sales') {
            headers = ['Data', 'Pedido', 'Cliente', 'Total'];
            body = salesReport.map(r => [new Date(r.date).toLocaleDateString(), `#${r.orderNumber}`, r.customerName, r.total.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})]);
        } else if (activeTab === 'itemsByCustomer') {
            headers = ['Cliente', 'Itens', 'Qtd Total', 'Valor Total'];
            body = itemsByCustomerReport.map(r => [
                r.customerName, 
                r.items.map(i => i.productName).join(', '), 
                r.items.reduce((s, i) => s + i.qty, 0),
                r.items.reduce((s, i) => s + i.total, 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})
            ]);
        } else if (activeTab === 'debtors') {
            headers = ['Cliente', 'Dívida Total'];
            body = debtorsReport.map(r => [r.name, r.balance.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})]);
        } else if (activeTab === 'finance') {
            headers = ['Meio', 'Total'];
            body = financeReport.map(r => [r.method, r.total.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})]);
        }

        (doc as any).autoTable({ 
            startY: 30, 
            head: [headers], 
            body: body, 
            theme: 'striped',
            styles: { fontSize: 8, overflow: 'linebreak' },
            columnStyles: {
                1: { cellWidth: 'auto' } // Coluna de itens/produtos pode quebrar linha
            }
        });
        doc.save(`Relatorio_${activeTab}.pdf`);
    };

    const isDataEmpty = () => {
        if (activeTab === 'sales') return salesReport.length === 0;
        if (activeTab === 'itemsByCustomer') return itemsByCustomerReport.length === 0;
        if (activeTab === 'debtors') return debtorsReport.length === 0;
        if (activeTab === 'finance') return financeReport.length === 0;
        if (activeTab === 'profitability') return profitabilityReport.length === 0;
        return true;
    };

    return (
        <div className="container mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">Relatórios</h1>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6 space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 grid grid-cols-2 gap-4 w-full">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Início</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Fim</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 shadow-sm" />
                        </div>
                    </div>
                    <div className="w-full md:w-auto">
                        <button onClick={handleExportPDF} className="w-full bg-primary-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-primary-700 transition flex items-center justify-center shadow-md">
                            <DocumentDownloadIcon className="w-5 h-5 mr-2" /> Exportar Lista
                        </button>
                    </div>
                </div>
                
                <div className="w-full">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Busca por Cliente ou Produto</label>
                    <input 
                        type="text" 
                        placeholder="Digite um nome para filtrar os resultados..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 shadow-sm focus:ring-primary-500"
                    />
                </div>
            </div>

            <div className="flex overflow-x-auto space-x-2 mb-6 pb-2 no-scrollbar">
                {[
                    {id: 'sales', label: 'Vendas (Pedidos)'},
                    {id: 'itemsByCustomer', label: 'Itens por Cliente'},
                    {id: 'debtors', label: 'Devedores'},
                    {id: 'finance', label: 'Financeiro'},
                    {id: 'profitability', label: 'Lucratividade'},
                ].map((tab) => (
                    <button 
                        key={tab.id} 
                        onClick={() => { setActiveTab(tab.id as ReportType); setExpandedDebtorId(null); }} 
                        className={`px-5 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 min-h-[400px]">
                {/* VIEW: ITEMS BY CUSTOMER */}
                {activeTab === 'itemsByCustomer' && (
                    <div className="space-y-6">
                        {itemsByCustomerReport.map((r, i) => (
                            <div key={i} className="border dark:border-gray-700 rounded-lg overflow-hidden">
                                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 font-bold text-primary-600 dark:text-primary-400 border-b dark:border-gray-600 flex justify-between">
                                    <span>{r.customerName}</span>
                                    <span className="text-gray-500 text-xs">Total: {r.items.reduce((s, it) => s + it.total, 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>
                                </div>
                                <table className="min-w-full text-xs">
                                    <tbody className="divide-y dark:divide-gray-700">
                                        {r.items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="py-2 px-4">{item.productName}</td>
                                                <td className="py-2 px-4 text-center font-bold">{item.qty} un</td>
                                                <td className="py-2 px-4 text-right">{item.total.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                )}

                {/* VIEW: SALES */}
                {activeTab === 'sales' && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500">
                                <tr>
                                    <th className="py-3 px-4 text-left">Data</th>
                                    <th className="py-3 px-4 text-left">Pedido</th>
                                    <th className="py-3 px-4 text-left">Cliente</th>
                                    <th className="py-3 px-4 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-gray-700">
                                {salesReport.map((s, i) => (
                                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="py-3 px-4">{new Date(s.date).toLocaleDateString()}</td>
                                        <td className="py-3 px-4 font-bold">#{s.orderNumber}</td>
                                        <td className="py-3 px-4">{s.customerName}</td>
                                        <td className="py-3 px-4 text-right font-bold text-primary-600">{s.total.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* VIEW: DEBTORS */}
                {activeTab === 'debtors' && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500">
                                <tr>
                                    <th className="py-3 px-4 text-left">Cliente (Clique para detalhes)</th>
                                    <th className="py-3 px-4 text-right">Saldo Devedor</th>
                                    <th className="py-3 px-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-gray-700">
                                {debtorsReport.map((r, i) => (
                                    <React.Fragment key={i}>
                                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                            <td 
                                                onClick={() => setExpandedDebtorId(expandedDebtorId === r.id ? null : r.id)}
                                                className="py-3 px-4 flex items-center cursor-pointer"
                                            >
                                                {expandedDebtorId === r.id ? <MinusIcon className="w-4 h-4 mr-2 text-gray-400" /> : <PlusIcon className="w-4 h-4 mr-2 text-primary-600" />}
                                                <div>
                                                    <div className="font-bold text-gray-800 dark:text-gray-100">{r.name}</div>
                                                    <div className="text-xs text-gray-400">{r.phone}</div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right font-black text-red-600 text-lg">
                                                {r.balance.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <button 
                                                    onClick={() => handleExportIndividualDebtorPDF(r)}
                                                    className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-primary-600 hover:bg-primary-50 transition-all shadow-sm"
                                                    title="Baixar Extrato de Cobrança"
                                                >
                                                    <DocumentDownloadIcon className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedDebtorId === r.id && (
                                            <tr>
                                                <td colSpan={3} className="bg-red-50 dark:bg-red-900/10 p-4">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <p className="text-xs font-bold text-red-800 dark:text-red-400 uppercase">Pedidos com Pendência:</p>
                                                        <button 
                                                            onClick={() => handleExportIndividualDebtorPDF(r)}
                                                            className="text-xs font-bold text-primary-600 underline"
                                                        >
                                                            Gerar PDF deste Extrato
                                                        </button>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {r.unpaidOrders.map((uo, idx) => (
                                                            <div key={idx} className="flex justify-between items-center text-sm border-b border-red-100 dark:border-red-900/30 pb-1">
                                                                <span>Pedido <strong>#{uo.order.orderNumber}</strong> ({new Date(uo.order.orderDate).toLocaleDateString()})</span>
                                                                <span className="font-bold text-red-700 dark:text-red-400">Saldo: {uo.balance.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* VIEW: FINANCE */}
                {activeTab === 'finance' && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500">
                                <tr>
                                    <th className="py-3 px-4 text-left">Forma de Pagamento</th>
                                    <th className="py-3 px-4 text-right">Total Recebido</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-gray-700">
                                {financeReport.map((r, i) => (
                                    <tr key={i}>
                                        <td className="py-3 px-4 font-medium">{r.method}</td>
                                        <td className="py-3 px-4 text-right font-bold text-green-600 text-lg">{r.total.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</td>
                                    </tr>
                                ))}
                                <tr className="bg-gray-50 dark:bg-gray-700/50">
                                    <td className="py-4 px-4 font-black uppercase">Total Geral</td>
                                    <td className="py-4 px-4 text-right font-black text-xl text-primary-600">
                                        {financeReport.reduce((acc, curr) => acc + curr.total, 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}

                {/* VIEW: PROFITABILITY */}
                {activeTab === 'profitability' && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500">
                                <tr>
                                    <th className="py-3 px-4 text-left">Produto</th>
                                    <th className="py-3 px-4 text-center">Vendidos</th>
                                    <th className="py-3 px-4 text-right">Receita</th>
                                    <th className="py-3 px-4 text-right">Lucro</th>
                                    <th className="py-3 px-4 text-center">Margem %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-gray-700">
                                {profitabilityReport.map((r, i) => (
                                    <tr key={i}>
                                        <td className="py-3 px-4 font-medium">{r.name}</td>
                                        <td className="py-3 px-4 text-center">{r.qty}</td>
                                        <td className="py-3 px-4 text-right">{r.totalRevenue.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</td>
                                        <td className="py-3 px-4 text-right font-bold text-green-600">{r.totalProfit.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${r.margin > 30 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {r.margin.toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* EMPTY STATE */}
                {isDataEmpty() && (
                    <div className="py-20 text-center text-gray-400 font-bold uppercase italic">
                        Nenhum dado encontrado para o período selecionado ou termo de busca.
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reports;
