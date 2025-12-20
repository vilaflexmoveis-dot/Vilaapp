
import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { PlusIcon, TrashIcon, PencilIcon, CheckIcon, DocumentDownloadIcon, ArchiveIcon, CogIcon, ArrowLeftIcon, EyeIcon, XCircleIcon, DocumentTextIcon, CheckCircleIcon } from '../components/icons/Icons';
import Modal from '../components/Modal';

const REQUIRED_SCHEMA = {
    "Clientes": ["id", "name", "phone", "email", "address", "specialPrices"],
    "Produtos": ["id", "name", "barcode", "basePrice", "costPrice", "currentStock", "minimumStock"],
    "Pedidos": ["id", "orderNumber", "customerId", "orderDate", "status", "paymentMethodId", "deliveryDate"],
    "Itens_Pedido": ["id", "orderId", "productId", "quantity", "unitPrice", "costPrice"],
    "Producao": ["id", "productId", "quantity", "produced", "status", "priority", "creationDate"],
    "Pagamentos": ["id", "customerId", "orderId", "amountPaid", "paymentDate", "paymentMethodId"],
    "Usuarios": ["id", "name", "email", "password", "isAdmin"]
};

const Settings: React.FC = () => {
    const { users, addUser, updateUser, deleteUser, customers, products, orders, orderItems, productionOrders, payments, googleSheetUrl, googleScriptUrl, autoSyncEnabled, syncInterval, lastSyncTime, setGoogleSheetConfig, syncFromGoogleSheetUrl } = useData();
    const { user: currentUser } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isManualOpen, setIsManualOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const [localUrl, setLocalUrl] = useState(googleSheetUrl);
    const [localScriptUrl, setLocalScriptUrl] = useState(googleScriptUrl);
    const [localAutoSync, setLocalAutoSync] = useState(autoSyncEnabled);
    const [localInterval, setLocalInterval] = useState(syncInterval);

    const [isValidating, setIsValidating] = useState(false);
    const [validationReport, setValidationReport] = useState<{table: string, status: 'ok' | 'error', missing: string[]}[] | null>(null);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [roles, setRoles] = useState({
        isAdmin: false,
        isSales: false,
        isProduction: false,
        isStock: false,
        isFinance: false,
        canViewDashboard: true,
    });
    
    const [activeTab, setActiveTab] = useState<'migration' | 'users' | 'developer'>('migration');

    useEffect(() => {
        setLocalUrl(googleSheetUrl);
        setLocalScriptUrl(googleScriptUrl);
        setLocalAutoSync(autoSyncEnabled);
        setLocalInterval(syncInterval);
    }, [googleSheetUrl, googleScriptUrl, autoSyncEnabled, syncInterval]);

    const handleSaveConfig = () => {
        setGoogleSheetConfig(localUrl, localScriptUrl, localAutoSync, localInterval);
        alert('Configurações salvas!');
    };

    const handleTestIntegrity = async () => {
        if (!localUrl || !localUrl.includes('docs.google.com')) {
            alert("Insira uma URL válida da planilha primeiro.");
            return;
        }

        setIsValidating(true);
        setValidationReport(null);

        const exportUrl = localUrl.split('/edit')[0] + '/export?format=xlsx';
        try {
            const response = await fetch(exportUrl);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const XLSX = (window as any).XLSX;
            const workbook = XLSX.read(arrayBuffer);
            
            const report: any[] = [];

            Object.entries(REQUIRED_SCHEMA).forEach(([tableName, requiredCols]) => {
                const sheet = workbook.Sheets[tableName];
                if (!sheet) {
                    report.push({ table: tableName, status: 'error', missing: ['Aba não encontrada'] });
                    return;
                }

                const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                const headers = (data[0] || []) as string[];
                const missing = requiredCols.filter(col => !headers.includes(col));

                report.push({
                    table: tableName,
                    status: missing.length === 0 ? 'ok' : 'error',
                    missing: missing
                });
            });

            setValidationReport(report);
        } catch (error) {
            alert("Erro ao acessar a planilha para teste. Verifique se ela é pública (Qualquer pessoa com o link).");
        } finally {
            setIsValidating(false);
        }
    };

    const handleOpenModal = (userToEdit?: User) => {
        if (userToEdit) {
            setEditingUser(userToEdit);
            setName(userToEdit.name);
            setEmail(userToEdit.email);
            setPassword(userToEdit.password || '');
            setRoles({
                isAdmin: !!userToEdit.isAdmin,
                isSales: !!userToEdit.isSales,
                isProduction: !!userToEdit.isProduction,
                isStock: !!userToEdit.isStock,
                isFinance: !!userToEdit.isFinance,
                canViewDashboard: userToEdit.canViewDashboard !== undefined ? !!userToEdit.canViewDashboard : true,
            });
        } else {
            setEditingUser(null);
            setName('');
            setEmail('');
            setPassword('');
            setRoles({
                isAdmin: false,
                isSales: false,
                isProduction: false,
                isStock: false,
                isFinance: false,
                canViewDashboard: true,
            });
        }
        setIsModalOpen(true);
    };

    const handleSaveUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email || !password) {
            alert("Preencha nome, email e senha.");
            return;
        }
        const userData = { name, email, password, ...roles };
        if (currentUser?.email) {
            if (editingUser) {
                updateUser({ ...editingUser, ...userData }, currentUser.email);
            } else {
                addUser(userData, currentUser.email);
            }
            setIsModalOpen(false);
        }
    };

    const handleDeleteUser = (userId: string) => {
        if (userId === currentUser?.id) {
            alert("Você não pode excluir o seu próprio usuário enquanto está logado.");
            return;
        }
        if (window.confirm("Deseja realmente excluir este usuário? Esta ação é irreversível.")) {
            if (currentUser?.email) deleteUser(userId, currentUser.email);
        }
    };

    const handleExportFullExcel = () => {
        const XLSX = (window as any).XLSX;
        if (!XLSX) {
            alert("Erro: Biblioteca Excel não carregada.");
            return;
        }
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(customers), "Clientes");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(products), "Produtos");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orders.map(o => ({...o, installments: JSON.stringify(o.installments)}))), "Pedidos");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orderItems), "Itens_Pedido");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productionOrders), "Producao");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payments), "Pagamentos");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(users), "Usuarios");
        XLSX.writeFile(wb, "VilaFlex_Backup_Completo.xlsx");
    };

    const handleExportBlankExcel = () => {
        const XLSX = (window as any).XLSX;
        if (!XLSX) {
            alert("Erro: Biblioteca Excel não carregada.");
            return;
        }
        const wb = XLSX.utils.book_new();
        const headers = {
            Clientes: ["id", "name", "phone", "email", "contactPerson", "cpfCnpj", "cep", "address", "number", "neighborhood", "city", "state", "notes", "discountPercentage", "specialPrices"],
            Produtos: ["id", "name", "barcode", "basePrice", "costPrice", "currentStock", "minimumStock"],
            Pedidos: ["id", "orderNumber", "customerId", "orderDate", "deliveryDate", "status", "sendToProduction", "paymentMethodId", "createdBy", "deliverySignature", "notes", "installments"],
            Itens_Pedido: ["id", "orderId", "productId", "quantity", "unitPrice", "costPrice"],
            Producao: ["id", "orderId", "productId", "quantity", "produced", "priority", "status", "startDate", "completionDate", "creationDate"],
            Pagamentos: ["id", "customerId", "orderId", "amountPaid", "paymentDate", "paymentMethodId"],
            Usuarios: ["id", "name", "email", "password", "isAdmin", "isSales", "isProduction", "isStock", "isFinance", "canViewDashboard"]
        };
        Object.entries(headers).forEach(([sheetName, sheetHeaders]) => {
            const ws = XLSX.utils.aoa_to_sheet([sheetHeaders]);
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });
        XLSX.writeFile(wb, "VilaFlex_Modelo_Integracao.xlsx");
    };

    const appsScriptCode = `// CÓDIGO PARA O GOOGLE APPS SCRIPT (VilaFlex)
function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput("Erro no JSON: " + err).setMimeType(ContentService.MimeType.TEXT);
  }
  var sheet = ss.getSheetByName(data.tableName);
  if (!sheet) return ContentService.createTextOutput("Tabela não encontrada").setMimeType(ContentService.MimeType.TEXT);

  var action = data.action;
  var record = data.data;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var values = headers.map(function(h) { return record[h] !== undefined ? record[h] : ""; });
  var idColIndex = headers.indexOf("id") + 1;

  if (action === 'create' || action === 'update') {
    // SEMPRE VERIFICA SE JÁ EXISTE PARA EVITAR REPETIDOS NA PLANILHA (UPSERT)
    var dataRange = sheet.getDataRange().getValues();
    for (var i = 1; i < dataRange.length; i++) {
      if (String(dataRange[i][idColIndex - 1]) === String(record.id)) {
        sheet.getRange(i + 1, 1, 1, values.length).setValues([values]);
        return ContentService.createTextOutput("Atualizado").setMimeType(ContentService.MimeType.TEXT);
      }
    }
    // Se não encontrou o ID, adiciona uma nova linha
    sheet.appendRow(values);
    return ContentService.createTextOutput("Criado").setMimeType(ContentService.MimeType.TEXT);
  } else if (action === 'delete') {
    var dataRange = sheet.getDataRange().getValues();
    for (var i = 1; i < dataRange.length; i++) {
      if (String(dataRange[i][idColIndex - 1]) === String(record.id)) {
        sheet.deleteRow(i + 1);
        return ContentService.createTextOutput("Excluído").setMimeType(ContentService.MimeType.TEXT);
      }
    }
  }
  return ContentService.createTextOutput("Ok").setMimeType(ContentService.MimeType.TEXT);
}
function doGet(e) { return ContentService.createTextOutput("Script Ativo"); }`;

    return (
        <div className="container mx-auto pb-10">
            <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">Configurações</h1>

            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto no-scrollbar">
                <button className={`py-2 px-4 font-medium border-b-2 whitespace-nowrap ${activeTab === 'migration' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`} onClick={() => setActiveTab('migration')}>Geral / Backup</button>
                <button className={`py-2 px-4 font-medium border-b-2 whitespace-nowrap ${activeTab === 'users' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`} onClick={() => setActiveTab('users')}>Usuários & Acessos</button>
                <button className={`py-2 px-4 font-medium border-b-2 whitespace-nowrap ${activeTab === 'developer' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`} onClick={() => setActiveTab('developer')}>Integração Google</button>
            </div>

            {activeTab === 'users' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Gestão de Usuários</h2>
                        <button onClick={() => handleOpenModal()} className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-700 flex items-center">
                            <PlusIcon className="w-5 h-5 mr-2" /> Novo Usuário
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full table-auto">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase text-xs font-bold">
                                <tr>
                                    <th className="py-3 px-4 text-left">Nome / Email</th>
                                    <th className="py-3 px-4 text-center">Permissões</th>
                                    <th className="py-3 px-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-800 dark:text-gray-200 text-sm">
                                {users.map(u => (
                                    <tr key={u.id} className="border-b border-gray-100 dark:border-gray-700">
                                        <td className="py-3 px-4">
                                            <p className="font-bold">{u.name}</p>
                                            <p className="text-xs text-gray-500">{u.email}</p>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex flex-wrap justify-center gap-1">
                                                {u.isAdmin && <span className="bg-red-100 text-red-700 text-[9px] px-1.5 py-0.5 rounded font-black uppercase">ADMIN</span>}
                                                {u.isSales && <span className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded font-black uppercase">VENDAS</span>}
                                                {u.isProduction && <span className="bg-orange-100 text-orange-700 text-[9px] px-1.5 py-0.5 rounded font-black uppercase">PRODUÇÃO</span>}
                                                {u.isStock && <span className="bg-green-100 text-green-700 text-[9px] px-1.5 py-0.5 rounded font-black uppercase">ESTOQUE</span>}
                                                {u.isFinance && <span className="bg-purple-100 text-purple-700 text-[9px] px-1.5 py-0.5 rounded font-black uppercase">FINANCEIRO</span>}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex justify-center space-x-3">
                                                <button onClick={() => handleOpenModal(u)} className="text-blue-500 hover:scale-110 transition-transform"><PencilIcon className="w-5 h-5" /></button>
                                                <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:scale-110 transition-transform"><TrashIcon className="w-5 h-5" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'migration' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-8">
                    <div>
                        <h2 className="text-xl font-bold mb-4">Exportar Base de Dados Atual</h2>
                        <p className="text-sm text-gray-500 mb-4">Gere um arquivo Excel com todos os Clientes, Produtos, Pedidos e Usuários cadastrados no sistema VilaFlex.</p>
                        <button onClick={handleExportFullExcel} className="bg-green-600 text-white font-extrabold py-3 px-8 rounded-lg flex items-center shadow-lg hover:bg-green-700 transition">
                            <DocumentDownloadIcon className="w-6 h-6 mr-2" /> BAIXAR BACKUP (.XLSX)
                        </button>
                    </div>

                    <div className="border-t dark:border-gray-700 pt-8">
                        <h2 className="text-xl font-bold mb-4 text-primary-600">Modelo para Nova Planilha</h2>
                        <p className="text-sm text-gray-500 mb-4">Baixe uma planilha Excel vazia com os cabeçalhos corretos para preencher e importar para a integração com o Google Sheets.</p>
                        <button onClick={handleExportBlankExcel} className="bg-gray-600 text-white font-extrabold py-3 px-8 rounded-lg flex items-center shadow-lg hover:bg-gray-700 transition">
                            <DocumentDownloadIcon className="w-6 h-6 mr-2" /> BAIXAR MODELO EM BRANCO (.XLSX)
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'developer' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold flex items-center"><CogIcon className="w-6 h-6 mr-2 text-primary-600" /> Google Sheets Sync</h2>
                        <button 
                            onClick={() => setIsManualOpen(true)}
                            className="text-xs bg-blue-50 text-blue-600 dark:bg-blue-900/30 px-4 py-2 rounded-lg font-black uppercase flex items-center hover:bg-blue-100 transition"
                        >
                            <DocumentTextIcon className="w-4 h-4 mr-2" /> Ver Manual de Integração
                        </button>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold mb-1">URL da Planilha (Leitura)</label>
                            <input type="text" value={localUrl} onChange={e => setLocalUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." className="w-full rounded border-gray-300 dark:bg-gray-700 px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">URL do Script (Escrita)</label>
                            <input type="text" value={localScriptUrl} onChange={e => setLocalScriptUrl(e.target.value)} placeholder="https://script.google.com/macros/s/..." className="w-full rounded border-gray-300 dark:bg-gray-700 px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500" />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 pt-2">
                             <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" checked={localAutoSync} onChange={e => setLocalAutoSync(e.target.checked)} className="rounded text-primary-600 w-5 h-5" />
                                <span className="text-sm font-bold">Ativar Sincronização Automática</span>
                            </label>
                            <div className="flex gap-2 ml-auto">
                                <button 
                                    onClick={handleTestIntegrity} 
                                    disabled={isValidating}
                                    className="bg-gray-100 text-gray-700 font-bold py-2 px-6 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                                >
                                    {isValidating ? 'Testando...' : 'Testar Planilha'}
                                </button>
                                <button onClick={handleSaveConfig} className="bg-primary-600 text-white font-bold py-2 px-10 rounded-lg hover:bg-primary-700 shadow-md">Salvar</button>
                            </div>
                        </div>
                    </div>

                    {validationReport && (
                        <div className="mt-6 border-t dark:border-gray-700 pt-6 animate-fade-in">
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 uppercase text-xs tracking-widest">Relatório de Estrutura da Planilha</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {validationReport.map(r => (
                                    <div key={r.table} className={`p-3 rounded-lg border flex flex-col ${r.status === 'ok' ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800'}`}>
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-sm">{r.table}</span>
                                            {r.status === 'ok' ? <CheckCircleIcon className="w-5 h-5 text-green-600" /> : <XCircleIcon className="w-5 h-5 text-red-600" />}
                                        </div>
                                        {r.missing.length > 0 && (
                                            <p className="text-[10px] mt-2 text-red-600 dark:text-red-400 font-medium">
                                                Faltando: {r.missing.join(', ')}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <Modal isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} title="Guia de Integração Google Sheets">
                <div className="space-y-6 text-sm text-gray-700 dark:text-gray-300">
                    <div>
                        <h3 className="font-black text-primary-600 uppercase mb-2">Passo 2: Configurar Script (Proteção contra Duplicidade)</h3>
                        <p className="mb-2">Na planilha, vá em <strong>Extensões &gt; Apps Script</strong>. Copie o código abaixo para garantir que o sistema não repita linhas para o mesmo ID:</p>
                        <div className="relative">
                            <pre className="bg-gray-900 text-blue-400 p-4 rounded-lg overflow-x-auto text-[10px] max-h-60 leading-tight border border-gray-700">
                                {appsScriptCode}
                            </pre>
                            <button 
                                onClick={() => {navigator.clipboard.writeText(appsScriptCode); alert("Código copiado!");}}
                                className="absolute top-2 right-2 bg-gray-700 text-white px-2 py-1 rounded text-[10px] hover:bg-gray-600"
                            >
                                COPIAR CÓDIGO
                            </button>
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end">
                        <button onClick={() => setIsManualOpen(false)} className="bg-primary-600 text-white px-8 py-2 rounded-lg font-bold">Entendido!</button>
                    </div>
                </div>
            </Modal>
            
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUser ? "Editar Usuário" : "Novo Usuário"}>
                <form onSubmit={handleSaveUser} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium">Nome</label><input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full rounded border-gray-300 dark:bg-gray-700 px-3 py-2" /></div>
                        <div><label className="block text-sm font-medium">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 block w-full rounded border-gray-300 dark:bg-gray-700 px-3 py-2" /></div>
                    </div>
                    <div><label className="block text-sm font-medium">Senha</label><input type="text" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 block w-full rounded border-gray-300 dark:bg-gray-700 px-3 py-2" /></div>
                    
                    <div className="mt-4 border-t dark:border-gray-700 pt-4">
                         <label className="block text-sm font-bold mb-3 uppercase text-primary-600">Permissões e Acessos</label>
                         <div className="grid grid-cols-2 gap-4">
                             <label className="flex items-center space-x-3 text-sm p-2 bg-gray-50 dark:bg-gray-900/50 rounded border dark:border-gray-700">
                                <input type="checkbox" checked={roles.isAdmin} onChange={e => setRoles({...roles, isAdmin: e.target.checked})} className="rounded text-primary-600 h-5 w-5" />
                                <span><strong>ADMIN:</strong> Sistema Total</span>
                             </label>
                             <label className="flex items-center space-x-3 text-sm p-2 bg-gray-50 dark:bg-gray-900/50 rounded border dark:border-gray-700">
                                <input type="checkbox" checked={roles.isSales} onChange={e => setRoles({...roles, isSales: e.target.checked})} className="rounded text-primary-600 h-5 w-5" />
                                <span><strong>VENDAS</strong></span>
                             </label>
                             <label className="flex items-center space-x-3 text-sm p-2 bg-gray-50 dark:bg-gray-900/50 rounded border dark:border-gray-700">
                                <input type="checkbox" checked={roles.isProduction} onChange={e => setRoles({...roles, isProduction: e.target.checked})} className="rounded text-primary-600 h-5 w-5" />
                                <span><strong>PRODUÇÃO</strong></span>
                             </label>
                             <label className="flex items-center space-x-3 text-sm p-2 bg-gray-50 dark:bg-gray-900/50 rounded border dark:border-gray-700">
                                <input type="checkbox" checked={roles.isStock} onChange={e => setRoles({...roles, isStock: e.target.checked})} className="rounded text-primary-600 h-5 w-5" />
                                <span><strong>ESTOQUE</strong></span>
                             </label>
                         </div>
                    </div>
                    <div className="flex justify-end pt-4 space-x-3 border-t dark:border-gray-700">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-200 px-6 py-2 rounded font-bold">Cancelar</button>
                        <button type="submit" className="bg-primary-600 text-white px-8 py-2 rounded font-bold hover:bg-primary-700 shadow-md">Salvar Usuário</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Settings;
