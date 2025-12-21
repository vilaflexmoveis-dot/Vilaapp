
export interface Customer {
  id: string;
  name: string; // Nome / Razão Social
  phone: string;
  email: string;
  
  // New Fields requested
  contactPerson?: string; // Contato
  cpfCnpj?: string;
  cep?: string;
  address: string; // Logradouro (Rua/Av)
  number?: string;
  neighborhood?: string; // Bairro
  city?: string; // Município
  state?: string; // UF
  notes?: string; // Observação

  discountPercentage?: number;
  specialPrices?: CustomerProductPrice[];
}

export interface CustomerProductPrice {
    productId: string;
    price: number;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  basePrice: number;
  costPrice: number; // Preço de Custo
  currentStock: number;
  minimumStock?: number;
}

export enum OrderStatus {
  Open = 'Aberto',
  InProduction = 'Em Produção',
  Ready = 'Pronto',
  Delivered = 'Entregue',
  Cancelled = 'Cancelado',
}

export interface Installment {
    number: number;
    amount: number;
    dueDate: string;
    status: 'Pending' | 'Paid';
}

export interface Order {
  id: string;
  orderNumber: number;
  customerId: string;
  orderDate: string;
  deliveryDate?: string;
  status: OrderStatus;
  sendToProduction: boolean;
  paymentMethodId: string;
  createdBy: string;
  deliverySignature?: string; // Base64 string
  notes?: string;
  installments?: Installment[]; // For sales on credit
  romaneioDate?: string; // Data fixa da primeira geração do romaneio
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  costPrice?: number; // Snapshot of cost at time of sale
}

export enum ProductionStatus {
  Pending = 'Pendente',
  Producing = 'Produzindo',
  Finished = 'Finalizado',
}

export enum ProductionPriority {
  Immediate = 'Imediato',
  Today = 'Para Hoje',
  Tomorrow = 'Para Amanhã',
  Stock = 'Estoque',
}

export enum SuggestionStatus {
    Pending = 'Pendente',
    Approved = 'Aprovado',
    Rejected = 'Rejeitado'
}

export interface ProductionSuggestion {
    id: string;
    productId: string;
    suggestedQuantity: number;
    priority: ProductionPriority;
    suggestionStatus: SuggestionStatus;
    createdBy: string;
    suggestionDate: string;
}

export interface ProductionOrder {
  id: string;
  orderId?: string; // Optional, link to Sales Order
  productId: string;
  quantity: number;
  produced: number;
  priority: ProductionPriority;
  status: ProductionStatus;
  startDate?: string;
  completionDate?: string;
  creationDate: string;
}

export interface Payment {
  id: string;
  customerId: string;
  orderId?: string; // Optional, can be disconnected payment
  amountPaid: number;
  paymentDate: string;
  paymentMethodId: string;
}

export interface PaymentMethod {
    id: string;
    name: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  isAdmin: boolean;
  canViewDashboard: boolean;
  canViewOrders: boolean;
  canViewCustomers: boolean;
  canViewProduction: boolean;
  canViewExpedicao: boolean;
  canViewStock: boolean;
  canViewProducts: boolean;
  canViewFinance: boolean;
  canViewReports: boolean;
  canViewSettings: boolean;
}

export interface Log {
    id: string;
    timestamp: string;
    user: string;
    action: string;
    tableName: string;
    recordId: string;
    notes: string;
}
