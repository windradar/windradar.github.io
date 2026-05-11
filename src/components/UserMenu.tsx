import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, UserCircle, ListChecks, LogIn, Wrench, HelpCircle, Settings } from 'lucide-react';
import { SettingsPanel, type AppSettings } from '@/components/SettingsPanel';

interface UserMenuProps {
  settings?: AppSettings;
  onSettingsChange?: (s: AppSettings) => void;
}

export function UserMenu({ settings, onSettingsChange }: UserMenuProps) {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!user) {
    return (
      <Link
        to="/auth"
        className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 py-2 text-xs font-bold text-foreground transition hover:border-primary hover:text-primary"
      >
        <LogIn size={14} />
        <span className="hidden sm:inline">{t('nav.signIn')}</span>
      </Link>
    );
  }

  const initials = user.email?.slice(0, 2).toUpperCase() || '··';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={t('nav.profile')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-xs font-bold text-primary transition hover:border-primary"
          >
            {initials}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="truncate text-xs">{user.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/profile')}>
            <UserCircle className="mr-2 h-4 w-4" /> {t('nav.profile')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/sessions')}>
            <ListChecks className="mr-2 h-4 w-4" /> {t('nav.sessions')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/materials')}>
            <Wrench className="mr-2 h-4 w-4" /> {t('nav.materials')}
          </DropdownMenuItem>
          {settings && onSettingsChange && (
            <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
              <Settings className="mr-2 h-4 w-4" /> {t('nav.settings')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => navigate('/help')}>
            <HelpCircle className="mr-2 h-4 w-4" /> {t('nav.help')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={async () => { await signOut(); navigate('/'); }}>
            <LogOut className="mr-2 h-4 w-4" /> {t('nav.signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {settings && onSettingsChange && (
        <SettingsPanel
          settings={settings}
          onChange={onSettingsChange}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
      )}
    </>
  );
}
