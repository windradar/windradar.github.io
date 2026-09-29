import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { syncFavorites, stopFavoritesSync } from '@/lib/favorites-sync';

// Keeps the local favourites in sync with the account while the user is logged in
export function FavoritesSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) { stopFavoritesSync(); return; }
    void syncFavorites(user.id);
  }, [user]);

  return null;
}
