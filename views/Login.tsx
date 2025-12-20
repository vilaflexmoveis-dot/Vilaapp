
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { EyeIcon, EyeOffIcon, ArchiveIcon } from '../components/icons/Icons';

const Login: React.FC = () => {
  const { login } = useAuth();
  const { syncFromGoogleSheetUrl, googleSheetUrl } = useData();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  // Sincroniza automaticamente ao carregar a tela de login para atualizar usuários
  useEffect(() => {
    if (googleSheetUrl && googleSheetUrl.includes('http')) {
        handleSync(true); // Silent sync
    }
  }, []);

  const handleSync = async (silent: boolean = false) => {
      if(!silent) setSyncStatus('Sincronizando dados...');
      try {
          await syncFromGoogleSheetUrl(googleSheetUrl, silent);
          if(!silent) {
              setSyncStatus('Sincronizado');
              setTimeout(() => setSyncStatus(''), 3000);
          }
      } catch (e) {
          console.warn("Login sync check failed:", e);
          if(!silent) setSyncStatus('Erro na conexão'); 
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(identifier, password);
      
      if (!success) {
        setError('Usuário ou senha inválidos.');
        setLoading(false);
      }
    } catch (err) {
      setError('Erro de autenticação. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg relative">
        <div className="absolute top-4 right-4">
            <button 
                onClick={() => handleSync(false)}
                className="text-gray-400 hover:text-blue-500 transition-colors"
                title="Forçar Sincronização"
            >
                <ArchiveIcon className={`w-5 h-5 ${syncStatus.includes('Sincronizando') ? 'animate-spin' : ''}`} />
            </button>
        </div>
        <div>
          <h1 className="text-center text-3xl font-extrabold text-primary-600 dark:text-primary-400">
            VilaFlex ERP
          </h1>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Acessar Sistema
          </h2>
          {syncStatus && (
              <p className={`mt-2 text-center text-xs font-medium animate-pulse ${syncStatus.includes('Erro') ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}`}>
                  {syncStatus}
              </p>
          )}
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="identifier" className="sr-only">
                Nome ou Email
              </label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Nome de Usuário ou Email"
              />
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-3 pr-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Senha"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center z-20 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showPassword ? (
                    <EyeOffIcon className="h-5 w-5" aria-hidden="true" />
                ) : (
                    <EyeIcon className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center font-bold bg-red-50 dark:bg-red-900/30 py-3 rounded border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-black uppercase tracking-widest rounded-lg text-white ${
                loading ? 'bg-primary-400 cursor-wait' : 'bg-primary-600 hover:bg-primary-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 shadow-lg`}
            >
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-400 uppercase font-medium">VilaFlex Mattress Factory © 2025</p>
        </form>
      </div>
    </div>
  );
};

export default Login;
