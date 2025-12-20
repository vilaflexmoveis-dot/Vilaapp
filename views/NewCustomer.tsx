
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '../components/icons/Icons';
import { CustomerProductPrice } from '../types';

interface NewCustomerProps {
  onBack: () => void;
}

const NewCustomer: React.FC<NewCustomerProps> = ({ onBack }) => {
  const { addCustomer, products } = useData();
  const { user } = useAuth();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [email, setEmail] = useState('');
  
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  
  const [notes, setNotes] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('0');

  const [specialPrices, setSpecialPrices] = useState<CustomerProductPrice[]>([]);
  const [selectedProdForPrice, setSelectedProdForPrice] = useState('');
  const [priceValue, setPriceValue] = useState('');

  const [isLoadingCep, setIsLoadingCep] = useState(false);

  const handleFetchCep = async () => {
      const cleanCep = cep.replace(/\D/g, '');
      if (cleanCep.length !== 8) return;

      setIsLoadingCep(true);
      try {
          const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
          const data = await response.json();
          if (!data.erro) {
              setAddress(data.logradouro);
              setNeighborhood(data.bairro);
              setCity(data.localidade);
              setState(data.uf);
          } else {
              alert("CEP não encontrado.");
          }
      } catch (error) {
          console.error("Erro ao buscar CEP", error);
      } finally {
          setIsLoadingCep(false);
      }
  };

  const addSpecialPrice = () => {
      if (!selectedProdForPrice || !priceValue) return;
      
      const newPrice = parseFloat(priceValue);
      if (isNaN(newPrice)) return;

      const updatedPrices = [...specialPrices];
      const existingIndex = updatedPrices.findIndex(sp => sp.productId === selectedProdForPrice);
      
      if (existingIndex > -1) {
          updatedPrices[existingIndex].price = newPrice;
      } else {
          updatedPrices.push({ productId: selectedProdForPrice, price: newPrice });
      }
      
      setSpecialPrices(updatedPrices);
      setSelectedProdForPrice('');
      setPriceValue('');
  };

  const removeSpecialPrice = (productId: string) => {
      setSpecialPrices(specialPrices.filter(sp => sp.productId !== productId));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
        alert('Nome e Telefone são obrigatórios.');
        return;
    }
    
    if (user?.email) {
        addCustomer({ 
            name, 
            phone, 
            contactPerson, 
            cpfCnpj, 
            email,
            cep, 
            address, 
            number, 
            neighborhood, 
            city, 
            state, 
            notes,
            discountPercentage: parseFloat(discountPercentage) || 0,
            specialPrices: specialPrices
        }, user.email);
        
        alert('Cliente salvo com sucesso!');
        onBack();
    }
  };

  return (
    <div className="container mx-auto max-w-3xl pb-10">
        <div className="flex items-center mb-6">
            <button onClick={onBack} className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors mr-4">
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Voltar
            </button>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Novo Cliente</h1>
        </div>

        <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sm:p-8 space-y-6">
            
            <div>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-700 pb-2 mb-4">Dados Cadastrais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome / Razão Social *</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 shadow-sm focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Telefone *</label>
                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="(00) 00000-0000" className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 shadow-sm" />
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-700 pb-2 mb-4">Comercial & Preços</h3>
                
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Desconto Padrão (%)</label>
                    <input type="number" value={discountPercentage} onChange={e => setDiscountPercentage(e.target.value)} min="0" max="100" className="mt-1 w-24 rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white px-3 py-2 shadow-sm" />
                </div>

                {user?.isAdmin ? (
                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                        <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">Preços Especiais (Apenas Admin)</label>
                        <div className="flex flex-col sm:flex-row gap-2 mb-2">
                            <select 
                                value={selectedProdForPrice} 
                                onChange={e => setSelectedProdForPrice(e.target.value)}
                                className="flex-grow rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm px-3 py-2"
                            >
                                <option value="">Produto...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <input 
                                type="number" 
                                placeholder="R$" 
                                value={priceValue}
                                onChange={e => setPriceValue(e.target.value)}
                                className="w-full sm:w-24 rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm px-3 py-2"
                            />
                            <button 
                                type="button" 
                                onClick={addSpecialPrice}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium flex items-center justify-center"
                            >
                                Incluir
                            </button>
                        </div>
                        {specialPrices.length > 0 && (
                            <div className="mt-3 bg-white dark:bg-gray-800 rounded border dark:border-gray-600 overflow-hidden">
                                {specialPrices.map((sp, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-2 text-xs border-b dark:border-gray-700 last:border-0">
                                        <span>{products.find(p => p.id === sp.productId)?.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-green-600">{sp.price.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
                                            <button type="button" onClick={() => removeSpecialPrice(sp.productId)} className="text-red-500"><TrashIcon className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-3 bg-gray-100 dark:bg-gray-900 rounded-lg text-xs text-gray-500 italic">
                        Nota: A definição de preços especiais para este cliente é restrita ao Administrador.
                    </div>
                )}
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t dark:border-gray-700">
                <button type="button" onClick={onBack} className="bg-gray-200 dark:bg-gray-700 py-3 px-6 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 font-medium">Cancelar</button>
                <button type="submit" className="bg-green-600 hover:bg-green-700 py-3 px-8 rounded-md text-white font-bold shadow-lg">Salvar Cliente</button>
            </div>
        </form>
    </div>
  );
};

export default NewCustomer;
