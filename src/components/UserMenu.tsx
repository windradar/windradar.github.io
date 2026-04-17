import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, UserCircle, ListChecks, LogIn } from 'lucide-react';

export function UserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <Link
        to="/auth"
        className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 py-2 text-xs font-bold text-foreground transition hover:border-primary hover:text-primary"
      >
        <LogIn size={14} />
        <span className="hidden sm:inline">Entrar</span>
      </Link>
    );
  }

  const initials = user.email?.slice(0, 2).toUpperCase() || '··';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Menú usuario"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-xs font-bold text-primary transition hover:border-primary"
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate text-xs">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/profile')}>
          <UserCircle className="mr-2 h-4 w-4" /> Perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/sessions')}>
          <ListChecks className="mr-2 h-4 w-4" /> Sesiones
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={async () => { await signOut(); navigate('/'); }}>
          <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
