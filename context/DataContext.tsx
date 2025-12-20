
import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { Customer, Product, Order, OrderStatus, OrderItem, ProductionOrder, Payment, PaymentMethod, ProductionSuggestion, ProductionStatus, ProductionPriority, User, Log } from '../types';
import { mockCustomers, mockProducts, mockOrders, mockOrderItems, mockProductionOrders, mockPayments, mockPaymentMethods, mockProductionSuggestions, mockUsers } from '../data/mockData';

interface DataContextType {
  customers: Customer[];
  products: Product[];
  orders: Order[];
  orderItems: OrderItem[];
  productionOrders: ProductionOrder[];
  payments: Payment[];
  paymentMethods: PaymentMethod[];
  productionSuggestions: ProductionSuggestion[];
  users: User[];
  logs: Log[];
  googleSheetUrl: string;
  googleScriptUrl: string; 
  autoSyncEnabled: boolean;
  syncInterval: number;
  lastSyncTime: Date | null;
  setGoogleSheetConfig: (url: string, scriptUrl: string, autoSync: boolean, interval: number) => void;
  updateOrderStatus: (orderId: string, status: Order['status'], userEmail: string) => void;
  addCustomer: (customer: Omit<Customer, 'id'>, userEmail: string) => Customer;
  updateCustomer: (customer: Customer, userEmail: string) => void;
  deleteCustomer: (customerId: string, userEmail: string) => void;
  addOrder: (orderData: Omit<Order, 'id' | 'orderNumber' | 'orderDate'>, items: Omit<OrderItem, 'id' | 'orderId'>[], userEmail: string) => Promise<void>;
  addReturn: (orderData: Omit<Order, 'id' | 'orderNumber' | 'orderDate'>, items: Omit<OrderItem, 'id' | 'orderId'>[], userEmail: string) => Promise<void>;
  deleteOrder: (orderId: string, userEmail: string) => void;
  updateProductionStatus: (productionOrderId: string, status: ProductionStatus, userEmail: string, produced?: number) => void;
  updateProductionPriority: (productionOrderId: string, priority: ProductionPriority, userEmail: string) => void;
  addProductionOrder: (productionOrderData: { productId: string; quantity: number; priority: ProductionPriority; }, userEmail: string) => void;
  deleteProductionOrder: (productionOrderId: string, userEmail: string) => void;
  updateProductDetails: (productId: string, data: { currentStock: number; minimumStock: number; }, userEmail: string) => void;
  addProduct: (product: Omit<Product, 'id'>, userEmail: string) => void;
  updateProduct: (product: Product, userEmail: string) => void;
  deleteProduct: (productId: string, userEmail: string) => void;
  saveSignature: (orderId: string, signature: string, userEmail: string) => void;
  addPayment: (paymentData: Omit<Payment, 'id'>, userEmail: string) => void;
  addUser: (userData: Omit<User, 'id'>, adminEmail: string) => void;
  updateUser: (user: User, adminEmail: string) => void;
  deleteUser: (userId: string, adminEmail: string) => void;
  updateProductionOrderQuantity: (productionOrderId: string, quantity: number, userEmail: string) => void;
  loadDataFromExternalSource: (data: any) => void;
  syncFromGoogleSheetUrl: (url: string, silent?: boolean) => Promise<void>;
  logAction: (user: string, action: string, tableName: string, recordId?: string, notes?: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// NOVOS URLs FORNECIDOS PELO USUÁRIO PARA RESTAURAR SINCRONIA
const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1a6zdgITDWY-JhN_jbIkqbU96y3WOuZWQNiKixh8TLLI/edit?usp=sharing';
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzgzPBeeNs7waT0XFHpdJlQPtvjG12ctQkgiV2RD1VVpuL7eTHfZvAxi0hsJJbk-gWh/exec';

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [orderItems, setOrderItems] = useState<OrderItem[]>(mockOrderItems);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>(mockProductionOrders);
  const [payments, setPayments] = useState<Payment[]>(mockPayments);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(mockPaymentMethods);
  const [productionSuggestions, setProductionSuggestions] = useState<ProductionSuggestion[]>(mockProductionSuggestions);
  
  const [users, setUsers] = useState<User[]>(() => {
      const storedUsers = localStorage.getItem('factory_app_users');
      if (storedUsers) {
          try {
              const parsed = JSON.parse(storedUsers);
              if (!parsed.some((u: any) => u.name === 'Admin')) {
                  return [...mockUsers, ...parsed];
              }
              return parsed;
          } catch(e) {
              return mockUsers;
          }
      }
      return mockUsers;
  });
  
  const [logs, setLogs] = useState<Log[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => {
      const stored = localStorage.getItem('factory_deleted_ids');
      return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  useEffect(() => {
      localStorage.setItem('factory_deleted_ids', JSON.stringify(Array.from(deletedIds)));
  }, [deletedIds]);

  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>(() => localStorage.getItem('factory_gsheet_url') || DEFAULT_SHEET_URL);
  const [googleScriptUrl, setGoogleScriptUrl] = useState<string>(() => localStorage.getItem('factory_gsheet_script_url') || DEFAULT_SCRIPT_URL);
  
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
      const stored = localStorage.getItem('factory_autosync_enabled');
      return stored === null ? true : stored === 'true';
  });
  
  const [syncInterval, setSyncInterval] = useState<number>(() => parseInt(localStorage.getItem('factory_autosync_interval') || '60', 10));
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  useEffect(() => {
      localStorage.setItem('factory_app_users', JSON.stringify(users));
  }, [users]);

  const saveToCloud = useCallback(async (tableName: string, action: 'create' | 'update' | 'delete', data: any) => {
      if (!googleScriptUrl) return; 
      try {
          await fetch(googleScriptUrl, {
              method: 'POST',
              mode: 'no-cors', 
              headers: { 'Content-Type': 'text/plain' },
              body: JSON.stringify({ tableName, action, data })
          });
      } catch (error) {
          console.warn("Sync failed:", error);
      }
  }, [googleScriptUrl]);

  const logAction = useCallback((user: string, action: string, tableName: string, recordId?: string, notes?: string) => {
      const newLog: Log = {
          id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          timestamp: new Date().toISOString(),
          user, action, tableName, recordId: recordId || '', notes: notes || ''
      };
      setLogs(prev => [newLog, ...prev]);
  }, []);

  const runAllocation = useCallback((currentOrders: Order[], currentProducts: Product[], currentOrderItems: OrderItem[]) => {
      const updatedOrders = [...currentOrders];
      let ordersChanged = false;
      const committedMap = new Map<string, number>();

      updatedOrders.forEach(o => {
          if (o.status === OrderStatus.Ready || o.status === OrderStatus.InProduction) {
              const items = currentOrderItems.filter(i => i.orderId === o.id);
              items.forEach(i => committedMap.set(i.productId, (committedMap.get(i.productId) || 0) + i.quantity));
          }
      });

      const openOrders = updatedOrders
        .filter(o => o.status === OrderStatus.Open)
        .sort((a, b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime());

      for (const order of openOrders) {
          const items = currentOrderItems.filter(i => i.orderId === order.id);
          if (items.length === 0) continue;

          let canFulfill = true;
          for (const item of items) {
              const product = currentProducts.find(p => p.id === item.productId);
              if (!product) { canFulfill = false; break; }
              const alreadyCommitted = committedMap.get(item.productId) || 0;
              if (product.currentStock - alreadyCommitted < item.quantity) { 
                  canFulfill = false; 
                  break; 
              }
          }

          if (canFulfill) {
              const index = updatedOrders.findIndex(o => o.id === order.id);
              if (index !== -1) {
                  updatedOrders[index] = { ...updatedOrders[index], status: OrderStatus.Ready };
                  ordersChanged = true;
                  items.forEach(i => committedMap.set(i.productId, (committedMap.get(i.productId) || 0) + i.quantity));
                  saveToCloud('Pedidos', 'update', { 
                      ...updatedOrders[index], 
                      installments: updatedOrders[index].installments ? JSON.stringify(updatedOrders[index].installments) : '' 
                  });
              }
          }
      }
      return ordersChanged ? updatedOrders : null;
  }, [saveToCloud]);

  const updateOrderStatus = useCallback((orderId: string, status: Order['status'], userEmail: string) => {
    setOrders(prevOrders => {
        const orderIndex = prevOrders.findIndex(o => o.id === orderId);
        if (orderIndex === -1) return prevOrders;
        
        const currentOrder = prevOrders[orderIndex];
        let updatedOrder = { ...currentOrder, status };
        
        if (status === OrderStatus.Delivered && !currentOrder.romaneioDate) {
            updatedOrder.romaneioDate = new Date().toISOString();
        }

        const newOrders = [...prevOrders];
        newOrders[orderIndex] = updatedOrder;
        
        saveToCloud('Pedidos', 'update', { 
            ...updatedOrder, 
            installments: updatedOrder.installments ? JSON.stringify(updatedOrder.installments) : '',
            romaneioDate: updatedOrder.romaneioDate || ''
        });
        
        logAction(userEmail, 'Status', 'Pedidos', orderId, status);
        
        if (status === OrderStatus.Cancelled || status === OrderStatus.Delivered) {
            const reallocatedOrders = runAllocation(newOrders, products, orderItems);
            if (reallocatedOrders) return reallocatedOrders;
        }
        return newOrders;
    });
  }, [saveToCloud, logAction, products, orderItems, runAllocation]);

  const loadDataFromExternalSource = useCallback((data: any) => {
    const safeParse = (str: any) => { if (typeof str !== 'string') return str; try { return JSON.parse(str); } catch { return str; } };
    
    const deduplicateById = (list: any[]) => {
        if (!list) return [];
        const map = new Map();
        list.filter(item => !deletedIds.has(String(item.id))).forEach(item => {
            map.set(String(item.id), item);
        });
        return Array.from(map.values());
    };

    const newCustomers = deduplicateById(data.customers).map((c: any) => ({ ...c, specialPrices: c.specialPrices ? safeParse(c.specialPrices) : [] }));
    const newProducts = deduplicateById(data.products);
    const rawOrders = deduplicateById(data.orders).map((o: any) => ({ 
        ...o, 
        installments: o.installments ? safeParse(o.installments) : [],
        romaneioDate: o.romaneioDate || undefined 
    }));
    const newOrderItems = deduplicateById(data.orderItems);

    setCustomers(newCustomers);
    setProducts(newProducts);
    setOrderItems(newOrderItems);
    if (data.productionOrders) setProductionOrders(deduplicateById(data.productionOrders));
    if (data.payments) setPayments(deduplicateById(data.payments));
    
    const allocatedOrders = runAllocation(rawOrders, newProducts, newOrderItems);
    setOrders(allocatedOrders || rawOrders);

    if (data.users) { 
        setUsers(() => {
            const remoteUsers = deduplicateById(data.users);
            const adminUser = mockUsers.find(u => u.name === 'Admin');
            const merged = [...remoteUsers];
            if (adminUser && !merged.some(u => u.name === 'Admin')) {
                merged.push(adminUser);
            }
            return merged;
        });
    }
  }, [deletedIds, runAllocation]);

  const syncFromGoogleSheetUrl = useCallback(async (url: string, silent: boolean = false) => {
      if (!url || !url.includes('docs.google.com/spreadsheets')) {
          if (!silent) alert("Configure a URL da planilha Google.");
          return;
      }
      const exportUrl = url.split('/edit')[0] + '/export?format=xlsx';
      try {
          const response = await fetch(exportUrl);
          if (!response.ok) throw new Error("Erro ao acessar servidor Google.");
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const XLSX = (window as any).XLSX;
          const workbook = XLSX.read(arrayBuffer);
          const data: any = {};
          workbook.SheetNames.forEach((sheetName: string) => {
              const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
              const lowerName = sheetName.toLowerCase();
              if (lowerName === 'clientes') data.customers = jsonData;
              if (lowerName === 'produtos') data.products = jsonData;
              if (lowerName === 'pedidos') data.orders = jsonData;
              if (lowerName === 'itens_pedido') data.orderItems = jsonData;
              if (lowerName === 'producao') data.productionOrders = jsonData;
              if (lowerName === 'pagamentos') data.payments = jsonData;
              if (lowerName === 'usuarios') data.users = jsonData;
          });
          loadDataFromExternalSource(data);
          setLastSyncTime(new Date());
      } catch (error) {
          console.error(error);
          if (!silent) alert(`Erro na Sincronização: ${error}`);
      }
  }, [loadDataFromExternalSource]);

  useEffect(() => {
      if (!autoSyncEnabled || !googleSheetUrl) return;
      const intervalId = setInterval(() => syncFromGoogleSheetUrl(googleSheetUrl, true), syncInterval * 1000);
      return () => clearInterval(intervalId);
  }, [autoSyncEnabled, syncInterval, googleSheetUrl, syncFromGoogleSheetUrl]);

  const setGoogleSheetConfig = useCallback((url: string, scriptUrl: string, autoSync: boolean, interval: number) => {
      setGoogleSheetUrl(url); setGoogleScriptUrl(scriptUrl); setAutoSyncEnabled(autoSync); setSyncInterval(interval);
      localStorage.setItem('factory_gsheet_url', url); localStorage.setItem('factory_gsheet_script_url', scriptUrl);
      localStorage.setItem('factory_autosync_enabled', String(autoSync)); localStorage.setItem('factory_autosync_interval', String(interval));
  }, []);

  const addCustomer = useCallback((customerData: Omit<Customer, 'id'>, userEmail: string): Customer => {
    const newCustomer: Customer = { id: `CL-${Date.now()}`, specialPrices: [], ...customerData };
    setCustomers(prev => [...prev, newCustomer]);
    saveToCloud('Clientes', 'create', { ...newCustomer, specialPrices: JSON.stringify(newCustomer.specialPrices) });
    return newCustomer;
  }, [saveToCloud]);

  const updateCustomer = useCallback((customer: Customer, userEmail: string) => {
    setCustomers(prev => prev.map(c => c.id === customer.id ? customer : c));
    saveToCloud('Clientes', 'update', { ...customer, specialPrices: JSON.stringify(customer.specialPrices) });
  }, [saveToCloud]);

  const deleteCustomer = useCallback((customerId: string, userEmail: string) => {
    setCustomers(prev => prev.filter(c => c.id !== customerId));
    setDeletedIds(prev => new Set(prev).add(customerId));
    saveToCloud('Clientes', 'delete', { id: customerId });
  }, [saveToCloud]);

  const addOrder = useCallback(async (orderData: Omit<Order, 'id' | 'orderNumber' | 'orderDate'>, items: Omit<OrderItem, 'id' | 'orderId'>[], userEmail: string) => {
    const newOrderNumber = Math.max(...orders.map(o => o.orderNumber), 0) + 1;
    const orderId = `O-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newOrder: Order = { id: orderId, orderNumber: newOrderNumber, orderDate: new Date().toISOString(), ...orderData, status: OrderStatus.Open, sendToProduction: false };
    const newItems: OrderItem[] = items.map((item, idx) => ({ 
        id: `I-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`, 
        orderId, 
        ...item, 
        costPrice: products.find(p => p.id === item.productId)?.costPrice || 0 
    }));
    
    const updatedOrders = [newOrder, ...orders];
    const updatedOrderItems = [...orderItems, ...newItems];
    const reallocated = runAllocation(updatedOrders, products, updatedOrderItems);
    
    setOrders(reallocated || updatedOrders);
    setOrderItems(updatedOrderItems);

    await saveToCloud('Pedidos', 'create', { ...newOrder, installments: JSON.stringify(newOrder.installments || []) });
    for (const item of newItems) {
        await saveToCloud('Itens_Pedido', 'create', item);
    }
  }, [orders, products, orderItems, saveToCloud, runAllocation]);

  const addReturn = useCallback(async (orderData: Omit<Order, 'id' | 'orderNumber' | 'orderDate'>, items: Omit<OrderItem, 'id' | 'orderId'>[], userEmail: string) => {
    const newOrderNumber = Math.max(...orders.map(o => o.orderNumber), 0) + 1;
    const orderId = `RET-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    const newOrder: Order = { 
        id: orderId, 
        orderNumber: newOrderNumber, 
        orderDate: new Date().toISOString(), 
        ...orderData, 
        status: OrderStatus.Delivered, 
        sendToProduction: false,
        notes: `[DEVOLUÇÃO AVULSA] ${orderData.notes || ''}`
    };

    const newItems: OrderItem[] = items.map((item, idx) => ({ 
        id: `I-RET-${Date.now()}-${idx}`, 
        orderId, 
        ...item,
        unitPrice: -Math.abs(item.unitPrice), 
        costPrice: products.find(p => p.id === item.productId)?.costPrice || 0 
    }));
    
    setProducts(prevProducts => {
        const updatedProducts = prevProducts.map(p => {
            const itemReturned = items.find(i => i.productId === p.id);
            if (itemReturned) {
                const newStock = p.currentStock + itemReturned.quantity;
                saveToCloud('Produtos', 'update', { ...p, currentStock: newStock });
                return { ...p, currentStock: newStock };
            }
            return p;
        });
        return updatedProducts;
    });

    setOrders(prev => [newOrder, ...prev]);
    setOrderItems(prev => [...prev, ...newItems]);

    await saveToCloud('Pedidos', 'create', { ...newOrder, installments: '[]' });
    for (const item of newItems) {
        await saveToCloud('Itens_Pedido', 'create', item);
    }

    logAction(userEmail, 'Devolução', 'Pedidos', orderId, `Crédito de itens para cliente.`);
  }, [orders, products, saveToCloud, logAction]);

  const deleteOrder = useCallback((orderId: string, userEmail: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
    setOrderItems(prev => prev.filter(i => i.orderId !== orderId));
    setDeletedIds(prev => new Set(prev).add(orderId));
    saveToCloud('Pedidos', 'delete', { id: orderId });
  }, [saveToCloud]);

  const updateProductionStatus = useCallback((productionOrderId: string, status: ProductionStatus, userEmail: string, produced?: number) => {
        setProductionOrders(prev => {
            const index = prev.findIndex(p => p.id === productionOrderId);
            if (index === -1) return prev;
            const updated = { ...prev[index], status };
            if (typeof produced !== 'undefined') updated.produced = produced;
            else if (status === ProductionStatus.Finished) updated.produced = updated.quantity;
            if (status === ProductionStatus.Producing && !updated.startDate) updated.startDate = new Date().toISOString();
            if (status === ProductionStatus.Finished && !updated.completionDate) updated.completionDate = new Date().toISOString();
            const newList = [...prev]; newList[index] = updated;
            
            saveToCloud('Producao', 'update', updated);
            
            if (status === ProductionStatus.Finished) {
                setProducts(prevP => {
                   const productToUpdate = prevP.find(p => p.id === updated.productId);
                   if (productToUpdate) {
                       const updatedProduct = { ...productToUpdate, currentStock: productToUpdate.currentStock + updated.produced };
                       saveToCloud('Produtos', 'update', updatedProduct);
                       const updatedProducts = prevP.map(p => p.id === updated.productId ? updatedProduct : p);
                       setOrders(prevO => runAllocation(prevO, updatedProducts, orderItems) || prevO);
                       return updatedProducts;
                   }
                   return prevP;
                });
            }
            return newList;
        });
    }, [saveToCloud, orderItems, runAllocation]);

  const updateProductionPriority = useCallback((productionOrderId: string, priority: ProductionPriority, userEmail: string) => {
    setProductionOrders(prev => {
        const updated = prev.map(p => p.id === productionOrderId ? { ...p, priority } : p);
        const po = updated.find(x => x.id === productionOrderId);
        if (po) saveToCloud('Producao', 'update', po);
        return updated;
    });
  }, [saveToCloud]);
  
  const addProductionOrder = useCallback((data: { productId: string; quantity: number; priority: ProductionPriority; }, userEmail: string) => {
    const newPO: ProductionOrder = { id: `PR-${Date.now()}`, ...data, produced: 0, status: ProductionStatus.Pending, creationDate: new Date().toISOString() };
    setProductionOrders(prev => [newPO, ...prev]);
    saveToCloud('Producao', 'create', newPO);
  }, [saveToCloud]);

  const deleteProductionOrder = useCallback((id: string, userEmail: string) => {
    setProductionOrders(prev => prev.filter(p => p.id !== id));
    setDeletedIds(prev => new Set(prev).add(id));
    saveToCloud('Producao', 'delete', { id });
  }, [saveToCloud]);

  const updateProductDetails = useCallback((productId: string, data: { currentStock: number, minimumStock: number }, userEmail: string) => {
    setProducts(prev => {
        const updated = prev.map(p => p.id === productId ? { ...p, ...data } : p);
        const p = updated.find(x => x.id === productId);
        if (p) saveToCloud('Produtos', 'update', p);
        setOrders(prevO => runAllocation(prevO, updated, orderItems) || prevO);
        return updated;
    });
  }, [saveToCloud, orderItems, runAllocation]);

  const addProduct = useCallback((product: Omit<Product, 'id'>, userEmail: string) => {
    const newP: Product = { id: `P-${Date.now()}`, ...product };
    setProducts(prev => [...prev, newP]);
    saveToCloud('Produtos', 'create', newP);
  }, [saveToCloud]);

  const updateProduct = useCallback((product: Product, userEmail: string) => {
    setProducts(prev => prev.map(p => p.id === product.id ? product : p));
    saveToCloud('Produtos', 'update', product);
  }, [saveToCloud]);

  const deleteProduct = useCallback((id: string, userEmail: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    setDeletedIds(prev => new Set(prev).add(id));
    saveToCloud('Produtos', 'delete', { id });
  }, [saveToCloud]);
  
  const saveSignature = useCallback((orderId: string, signature: string, userEmail: string) => {
    setOrders(prev => {
        const updated = prev.map(o => o.id === orderId ? { ...o, deliverySignature: signature } : o);
        const order = updated.find(x => x.id === orderId);
        if (order) saveToCloud('Pedidos', 'update', order);
        return updated;
    });
  }, [saveToCloud]);
  
  const addPayment = useCallback((data: Omit<Payment, 'id'>, userEmail: string) => {
      const newP: Payment = { id: `PMT-${Date.now()}`, ...data };
      setPayments(prev => [...prev, newP]);
      saveToCloud('Pagamentos', 'create', newP);
  }, [saveToCloud]);

  const addUser = useCallback((data: Omit<User, 'id'>, adminEmail: string) => {
      const newU: User = { id: `U-${Date.now()}`, ...data };
      setUsers(prev => [...prev.filter(u => u.id !== newU.id), newU]);
      saveToCloud('Usuarios', 'create', newU);
      logAction(adminEmail, 'Novo Usuário', 'Usuarios', newU.id, newU.name);
  }, [saveToCloud, logAction]);

  const updateUser = useCallback((u: User, adminEmail: string) => {
      setUsers(prev => prev.map(x => x.id === u.id ? u : x));
      saveToCloud('Usuarios', 'update', u);
  }, [saveToCloud]);

  const deleteUser = useCallback((id: string, adminEmail: string) => {
      setDeletedIds(prev => new Set(prev).add(id));
      setUsers(prev => prev.filter(u => u.id !== id));
      saveToCloud('Usuarios', 'delete', { id });
  }, [saveToCloud]);

  const updateProductionOrderQuantity = useCallback((id: string, quantity: number, userEmail: string) => {
    setProductionOrders(prev => {
        const updated = prev.map(p => p.id === id ? { ...p, quantity } : p);
        const po = updated.find(x => x.id === id);
        if (po) saveToCloud('Producao', 'update', po);
        return updated;
    });
  }, [saveToCloud]);

  return (
    <DataContext.Provider value={{ 
        customers, products, orders, orderItems, productionOrders, payments, paymentMethods, productionSuggestions,
        users, logs, googleSheetUrl, googleScriptUrl, autoSyncEnabled, syncInterval, lastSyncTime, setGoogleSheetConfig, 
        updateOrderStatus, addCustomer, updateCustomer, deleteCustomer, addOrder, addReturn, deleteOrder, updateProductionStatus, 
        updateProductionPriority, addProductionOrder, deleteProductionOrder, updateProductDetails, addProduct, updateProduct, 
        deleteProduct, saveSignature, addPayment, addUser, updateUser, deleteUser, updateProductionOrderQuantity, 
        loadDataFromExternalSource, syncFromGoogleSheetUrl, logAction
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error('useData must be used within a DataProvider');
  return context;
};
