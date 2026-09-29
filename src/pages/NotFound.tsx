import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NotFound = () => {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="mb-2 font-display text-5xl font-extrabold text-primary">404</h1>
        <p className="mb-6 text-base text-muted-foreground">{t('notFound.message')}</p>
        <Link
          to="/"
          className="inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
        >
          {t('notFound.home')}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
