import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppMode } from '@/state/AppModeContext';
import {
  PlusIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
  ArrowUpIcon,
  UserGroupIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export default function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { appMode } = useAppMode();
  
  // Ne montrer le bouton que en mode stock ou all
  if (appMode !== 'stock' && appMode !== 'all') {
    return null;
  }
  
  // Fermer le menu quand on navigue
  React.useEffect(() => {
    setIsOpen(false);
  }, []);

  const handleAction = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  const actions = [
    {
      id: 'article',
      label: 'Nouvel article',
      icon: CubeIcon,
      color: 'bg-blue-500 hover:bg-blue-600',
      path: '/stock'
    },
    {
      id: 'bon',
      label: 'Nouveau bon de commande',
      icon: ClipboardDocumentListIcon,
      color: 'bg-green-500 hover:bg-green-600',
      path: '/bons-commande'
    },
    {
      id: 'mouvement',
      label: 'Nouveau mouvement',
      icon: ArrowUpIcon,
      color: 'bg-purple-500 hover:bg-purple-600',
      path: '/stock?tab=mouvements'
    },
    {
      id: 'fournisseur',
      label: 'Nouveau fournisseur',
      icon: UserGroupIcon,
      color: 'bg-orange-500 hover:bg-orange-600',
      path: '/stock'
    }
  ];

  return (
    <>
      {/* Overlay pour fermer le menu */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <div className="fixed bottom-8 right-8 z-40">
        {/* Menu actions */}
        {isOpen && (
          <div className="absolute bottom-20 right-0 flex flex-col gap-3 mb-4 pointer-events-auto">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handleAction(action.path)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-white font-medium shadow-lg transition-all transform hover:scale-105 ${action.color}`}
                  title={action.label}
                >
                  <Icon className="h-5 w-5" />
                  <span className="whitespace-nowrap">{action.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Bouton principal */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-center w-14 h-14 rounded-full text-white font-bold shadow-2xl transition-all transform hover:scale-110 ${
            isOpen
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
          title={isOpen ? 'Fermer' : 'Ajouter'}
        >
          {isOpen ? (
            <XMarkIcon className="h-6 w-6" />
          ) : (
            <PlusIcon className="h-6 w-6" />
          )}
        </button>
      </div>
    </>
  );
}
