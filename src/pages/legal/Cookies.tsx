import LegalLayout from './LegalLayout';
import { useConsent } from '@/hooks/useConsent';

export default function Cookies() {
  const { reopen, state } = useConsent();
  return (
    <LegalLayout title="Política de cookies" lastUpdated="2026-04-19">
      <p>Esta política describe el uso de cookies y tecnologías similares en <strong>WindFlowRadar</strong>, conforme al artículo 22 de la <strong>LSSI-CE</strong>, las directrices de la <strong>AEPD</strong>, la directiva ePrivacy de la UE y el <strong>UK PECR</strong>.</p>

      <h2>1. ¿Qué son las cookies?</h2>
      <p>Las cookies son pequeños archivos que se almacenan en tu dispositivo cuando visitas un sitio web. Pueden ser propias o de terceros, de sesión o persistentes.</p>

      <h2>2. Cookies que utilizamos</h2>

      <h3>🟢 Cookies técnicas (necesarias) — siempre activas</h3>
      <p>Son imprescindibles. No requieren consentimiento (art. 22.2 LSSI).</p>
      <ul>
        <li><code>sb-*</code> (Supabase) — sesión de usuario autenticado.</li>
        <li><code>wfr_consent_v1</code> (localStorage) — guarda tu decisión sobre cookies.</li>
        <li><code>wfr_*</code> (localStorage) — preferencias de tema, unidades, ubicaciones recientes.</li>
      </ul>

      <h3>🟡 Cookies de analítica — requieren consentimiento</h3>
      <p>Actualmente <strong>no</strong> usamos analítica de terceros. Si en el futuro la incorporamos (Plausible, Google Analytics o similar), se reflejará aquí y solo se activará si la aceptas.</p>

      <h3>🔴 Cookies publicitarias — requieren consentimiento</h3>
      <ul>
        <li><strong>Google AdSense</strong> (<code>__gads</code>, <code>__gpi</code>, <code>NID</code>, etc.): muestra anuncios y mide su rendimiento. Puede personalizarse con tu consentimiento. Más info en la <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">política de cookies de Google</a>.</li>
      </ul>

      <h2>3. Tu decisión actual</h2>
      <ul>
        <li>Necesarias: <strong>activas</strong></li>
        <li>Analítica: <strong>{state.categories.analytics ? 'aceptadas' : 'rechazadas'}</strong></li>
        <li>Publicidad: <strong>{state.categories.marketing ? 'aceptadas' : 'rechazadas'}</strong></li>
        <li>Decisión tomada: {state.decidedAt ? new Date(state.decidedAt).toLocaleString() : '—'}</li>
      </ul>

      <p>
        <button
          onClick={reopen}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:brightness-110"
        >
          Cambiar mi consentimiento
        </button>
      </p>

      <h2>4. Cómo gestionarlas en tu navegador</h2>
      <p>Además del banner, puedes controlar las cookies desde tu navegador:</p>
      <ul>
        <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Chrome</a></li>
        <li><a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias" target="_blank" rel="noopener noreferrer">Firefox</a></li>
        <li><a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Safari</a></li>
        <li><a href="https://support.microsoft.com/es-es/microsoft-edge" target="_blank" rel="noopener noreferrer">Edge</a></li>
      </ul>

      <h2>5. Conservación</h2>
      <p>Tu decisión sobre cookies se conserva durante <strong>12 meses</strong>; después se te volverá a preguntar, conforme a las recomendaciones de la AEPD y EDPB.</p>
    </LegalLayout>
  );
}
