import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import logoFlow from '@/assets/logo-flow.png';

// Strong password: 10+ chars, upper, lower, number, symbol
const passwordSchema = z.string()
  .min(10, 'Mínimo 10 caracteres')
  .max(72, 'Máximo 72 caracteres')
  .regex(/[a-z]/, 'Necesita una minúscula')
  .regex(/[A-Z]/, 'Necesita una mayúscula')
  .regex(/[0-9]/, 'Necesita un número')
  .regex(/[^A-Za-z0-9]/, 'Necesita un símbolo');

const emailSchema = z.string().trim().email('Email no válido').max(255);

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate('/', { replace: true });
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const emailParsed = emailSchema.safeParse(email);
      if (!emailParsed.success) {
        toast.error(emailParsed.error.errors[0].message);
        return;
      }

      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(emailParsed.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success('Si el email existe, recibirás instrucciones para restaurar tu contraseña.');
        setMode('signin');
        return;
      }

      const passParsed = passwordSchema.safeParse(password);
      if (!passParsed.success) {
        toast.error(passParsed.error.errors[0].message);
        return;
      }

      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: emailParsed.data,
          password: passParsed.data,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) {
          if (error.message.toLowerCase().includes('already')) {
            toast.error('Ese email ya está registrado.');
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success('Cuenta creada. Revisa tu email para confirmar.');
        setMode('signin');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailParsed.data,
          password: passParsed.data,
        });
        if (error) {
          toast.error(error.message.includes('Invalid') ? 'Credenciales no válidas' : error.message);
          return;
        }
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      toast.error(err.message || 'Error inesperado');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <Link to="/" className="mb-6 flex items-center gap-2">
        <img src={logoFlow} alt="WindFlowRadar" className="h-10 w-10 rounded-full" />
        <span className="font-display text-xl font-extrabold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          WindFlowRadar
        </span>
      </Link>

      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
        <h1 className="mb-1 font-display text-xl font-bold">
          {mode === 'signin' && 'Iniciar sesión'}
          {mode === 'signup' && 'Crear cuenta'}
          {mode === 'forgot' && 'Recuperar contraseña'}
        </h1>
        <p className="mb-5 text-xs text-muted-foreground">
          {mode === 'signup' && 'Solo necesitamos email y contraseña.'}
          {mode === 'signin' && 'Accede a tu área personal.'}
          {mode === 'forgot' && 'Te enviaremos un enlace por email.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[0.65rem] uppercase tracking-widest text-muted-foreground mb-1">Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="block text-[0.65rem] uppercase tracking-widest text-muted-foreground mb-1">Contraseña</label>
              <input
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={10}
                className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
              {mode === 'signup' && (
                <p className="mt-1 text-[0.65rem] text-muted-foreground">
                  Mínimo 10 caracteres con mayúscula, minúscula, número y símbolo.
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
          >
            {submitting ? '...' : mode === 'signup' ? 'Crear cuenta' : mode === 'forgot' ? 'Enviar enlace' : 'Entrar'}
          </button>
        </form>

        <div className="mt-4 flex flex-col gap-1.5 text-xs">
          {mode === 'signin' && (
            <>
              <button onClick={() => setMode('signup')} className="text-primary hover:underline text-left">¿No tienes cuenta? Regístrate</button>
              <button onClick={() => setMode('forgot')} className="text-muted-foreground hover:underline text-left">¿Olvidaste tu contraseña?</button>
            </>
          )}
          {mode === 'signup' && (
            <button onClick={() => setMode('signin')} className="text-primary hover:underline text-left">¿Ya tienes cuenta? Entra</button>
          )}
          {mode === 'forgot' && (
            <button onClick={() => setMode('signin')} className="text-primary hover:underline text-left">Volver a iniciar sesión</button>
          )}
        </div>
      </div>
    </div>
  );
}
