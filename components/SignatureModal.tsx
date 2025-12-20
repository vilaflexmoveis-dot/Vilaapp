
import React, { useRef, useEffect } from 'react';
import SignaturePad, { SignaturePadRef } from './SignaturePad';
import { CheckIcon, XCircleIcon } from './icons/Icons';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signature: string) => void;
}

const SignatureModal: React.FC<SignatureModalProps> = ({ isOpen, onClose, onSave }) => {
  const signaturePadRef = useRef<SignaturePadRef>(null);

  useEffect(() => {
    const lockOrientation = async () => {
      if (isOpen && window.innerWidth < 1024) { // Apenas para dispositivos móveis/tablets
        try {
          // A maioria dos navegadores exige modo Fullscreen para bloquear a orientação
          if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
          }

          // Tenta bloquear em paisagem
          if (screen.orientation && (screen.orientation as any).lock) {
            await (screen.orientation as any).lock('landscape');
          }
        } catch (err) {
          console.warn("Não foi possível rotacionar a tela automaticamente:", err);
        }
      }
    };

    const unlockOrientation = async () => {
      if (!isOpen) {
        try {
          // Destrava a orientação
          if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
          }
          // Sai do modo tela cheia se estiver nele
          if (document.fullscreenElement && document.exitFullscreen) {
            await document.exitFullscreen();
          }
        } catch (err) {
          console.warn("Erro ao destravar orientação:", err);
        }
      }
    };

    if (isOpen) {
      lockOrientation();
    } else {
      unlockOrientation();
    }

    // Cleanup ao desmontar o componente
    return () => {
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const signature = signaturePadRef.current?.getSignature();
    if (signature) {
      onSave(signature);
    } else {
      alert('Por favor, forneça uma assinatura antes de salvar.');
    }
  };

  const handleClear = () => {
    signaturePadRef.current?.clear();
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col bg-white dark:bg-gray-900 p-2 sm:p-4"
      aria-modal="true"
      role="dialog"
    >
      <div className="flex items-center justify-between flex-shrink-0 px-2">
        <p className="font-bold text-base sm:text-lg text-gray-700 dark:text-gray-200">
          Assine no espaço abaixo (Modo Paisagem)
        </p>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white p-1">
            <XCircleIcon className="w-8 h-8"/>
        </button>
      </div>
      
      <div className="flex-grow w-full h-full my-1 sm:my-2 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
          <SignaturePad ref={signaturePadRef} className="w-full h-full" />
      </div>

      <div className="flex items-center justify-between gap-2 sm:gap-4 flex-shrink-0 px-2 pb-2">
        <div className="flex gap-2">
            <button 
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 border border-gray-300 dark:border-gray-500 rounded-md text-xs font-bold text-gray-700 dark:text-gray-300"
            >
                Cancelar
            </button>
            <button 
                onClick={handleClear}
                className="px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-md text-xs font-bold text-gray-700 dark:text-gray-300"
            >
                Limpar
            </button>
        </div>
        
        <button 
          onClick={handleSave}
          className="flex-grow sm:flex-none px-6 py-3 bg-green-600 text-white rounded-md text-sm font-black hover:bg-green-700 flex items-center justify-center shadow-lg uppercase tracking-wider"
        >
          <CheckIcon className="w-5 h-5 mr-2" />
          Confirmar Assinatura
        </button>
      </div>
    </div>
  );
};

export default SignatureModal;
