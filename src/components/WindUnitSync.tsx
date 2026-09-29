import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { setWindUnit } from '@/lib/wind-units';

// Applies the wind unit saved in the profile once the user is known
export function WindUnitSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('wind_units').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data?.wind_units) setWindUnit(data.wind_units); });
  }, [user]);

  return null;
}
