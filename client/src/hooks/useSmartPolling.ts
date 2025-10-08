// hooks/useSmartPolling.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';

export const useSmartPolling = () => {
  const queryClient = useQueryClient();
  const [location] = useLocation();

  useEffect(() => {
    // S'exécute à CHAQUE changement de route
    console.log('🔄 Route changée:', location);
    
    // Actualiser les données seulement si on arrive sur /liberer
    if (location === '/liberation' || location.startsWith('/liberation/')) {
      console.log('📡 Actualisation des données Liberer');
      queryClient.invalidateQueries({ queryKey: ['liberers'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    }

    if (location === '/dashboard' || location.startsWith('/dashboard/')) {
      console.log('📡 Actualisation des données dashboard');
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    }
  }, [location, queryClient]); // Déclenché à chaque changement de location
};