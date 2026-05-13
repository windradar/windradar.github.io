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

function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

interface UserMenuProps {
  settings?: AppSettings;
  onSettingsChange?: (s: AppSettings) => void;
  onShareWhatsapp?: () => void;
}

export function UserMenu({ settings, onSettingsChange, onShareWhatsapp }: UserMenuProps) {
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
          {onShareWhatsapp && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onShareWhatsapp} className="text-[#25D366] focus:text-[#25D366]">
                <span className="mr-2"><WhatsAppIcon size={16} /></span>
                {t('nav.shareWhatsapp')}
              </DropdownMenuItem>
            </>
          )}
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
