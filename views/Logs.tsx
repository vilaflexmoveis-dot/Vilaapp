import React from 'react';
import { useData } from '../context/DataContext';

const Logs: React.FC = () => {
  const { logs } = useData();

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">Logs do Sistema</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase text-sm leading-normal">
                    <tr>
                        <th className="py-3 px-4 sm:px-6 text-left">Data/Hora</th>
                        <th className="py-3 px-4 sm:px-6 text-left">Usuário</th>
                        <th className="py-3 px-4 sm:px-6 text-left">Ação</th>
                        <th className="py-3 px-4 sm:px-6 text-left">Tabela</th>
                        <th className="py-3 px-4 sm:px-6 text-left">Registro ID</th>
                        <th className="py-3 px-4 sm:px-6 text-left">Observação</th>
                    </tr>
                </thead>
                <tbody className="text-gray-800 dark:text-gray-200 text-sm font-light">
                    {logs.map(log => (
                        <tr key={log.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="py-3 px-4 sm:px-6 text-left whitespace-nowrap">{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                            <td className="py-3 px-4 sm:px-6 text-left">{log.user}</td>
                            <td className="py-3 px-4 sm:px-6 text-left font-medium">{log.action}</td>
                            <td className="py-3 px-4 sm:px-6 text-left">{log.tableName}</td>
                            <td className="py-3 px-4 sm:px-6 text-left">{log.recordId}</td>
                            <td className="py-3 px-4 sm:px-6 text-left max-w-xs truncate">{log.notes}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default Logs;