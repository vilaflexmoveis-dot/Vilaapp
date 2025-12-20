
import { Customer, Product, Order, OrderItem, ProductionOrder, Payment, PaymentMethod, User, OrderStatus, ProductionStatus, ProductionPriority, SuggestionStatus, ProductionSuggestion } from '../types';

export const mockUsers: User[] = [
  { id: 'ADMIN-001', name: 'Admin', email: 'admin@vilaflex.com.br', password: 'Bqnsepc10@@', isAdmin: true, isSales: true, isProduction: true, isStock: true, isFinance: true, canViewDashboard: true },
];

export const mockCustomers: Customer[] = [];
export const mockProducts: Product[] = [];
export const mockOrders: Order[] = [];
export const mockOrderItems: OrderItem[] = [];
export const mockProductionOrders: ProductionOrder[] = [];
export const mockProductionSuggestions: ProductionSuggestion[] = [];
export const mockPayments: Payment[] = [];

export const mockPaymentMethods: PaymentMethod[] = [
    { id: 'FP-001', name: 'PIX' },
    { id: 'FP-002', name: 'Dinheiro' },
    { id: 'FP-003', name: 'Cartão' },
    { id: 'FP-004', name: 'Blu' },
    { id: 'FP-005', name: 'Boleto' },
];
