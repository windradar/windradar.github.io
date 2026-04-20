import LegalLayout from './LegalLayout';

export default function Privacy() {
  return (
    <LegalLayout title="Política de privacidad" lastUpdated="2026-04-19">
      <p>Esta política explica cómo <strong>WindFlowRadar</strong> trata tus datos personales conforme al <strong>Reglamento (UE) 2016/679 (RGPD)</strong>, la <strong>LOPDGDD 3/2018</strong>, el <strong>UK GDPR / Data Protection Act 2018</strong> y, cuando proceda, la <strong>California Consumer Privacy Act (CCPA/CPRA)</strong>.</p>

      <h2>1. Responsable del tratamiento</h2>
      <ul>
        <li><strong>Titular:</strong> Juan M de Haro</li>
        <li><strong>Email DPO/contacto:</strong> juhabar@gmail.com</li>
        <li><strong>Dirección:</strong> Sant Feliu de Llobregat</li>
      </ul>

      <h2>2. Datos que tratamos</h2>
      <ul>
        <li><strong>Cuenta:</strong> email y contraseña cifrada (hash). Opcionalmente, alias.</li>
        <li><strong>Sesiones de entrenamiento:</strong> fecha, horas, ubicación, snapshot meteo, material, URL de tracking, notas — siempre introducidos por ti.</li>
        <li><strong>Materiales:</strong> nombres y, opcionalmente, fotos que subas.</li>
        <li><strong>Datos técnicos:</strong> dirección IP, tipo de navegador, idioma, zona horaria — necesarios por seguridad y diagnóstico.</li>
        <li><strong>Cookies y similares:</strong> ver <a href="/legal/cookies">Política de cookies</a>.</li>
      </ul>

      <h2>3. Finalidades y bases jurídicas</h2>
      <ul>
        <li><strong>Prestar el servicio</strong> (área personal, sesiones, materiales) — base: <em>ejecución de contrato</em>.</li>
        <li><strong>Seguridad y prevención de fraude</strong> — base: <em>interés legítimo</em>.</li>
        <li><strong>Cumplir obligaciones legales</strong> — base: <em>obligación legal</em>.</li>
        <li><strong>Analítica y publicidad personalizada</strong> — base: <em>consentimiento</em> (revocable en cualquier momento).</li>
      </ul>

      <h2>4. Conservación</h2>
      <p>Los datos se conservan mientras tengas cuenta activa. Tras eliminarla, los datos se borran en un plazo máximo de <strong>30 días</strong>, salvo obligación legal de conservación (registros de seguridad, fiscalidad).</p>

      <h2>5. Destinatarios y encargados</h2>
      <ul>
        <li><strong>Supabase (Lovable Cloud):</strong> hosting de base de datos y autenticación. Servidores en UE.</li>
        <li><strong>Open-Meteo:</strong> consultas anónimas para obtener datos meteorológicos.</li>
        <li><strong>Google AdSense</strong> (solo si aceptas cookies de publicidad): puede transferir datos a EE. UU. bajo el <em>EU-US Data Privacy Framework</em>.</li>
      </ul>
      <p>No vendemos tus datos personales a terceros.</p>

      <h2>6. Tus derechos</h2>
      <p>Puedes ejercer en cualquier momento los derechos de:</p>
      <ul>
        <li><strong>Acceso, rectificación, supresión</strong> (derecho al olvido).</li>
        <li><strong>Limitación, oposición y portabilidad</strong>.</li>
        <li><strong>Retirar el consentimiento</strong> en cualquier momento.</li>
        <li><strong>Presentar una reclamación</strong> ante la <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">Agencia Española de Protección de Datos (AEPD)</a> u otra autoridad competente (ICO en UK, CPPA en California).</li>
      </ul>
      <p>Para ejercerlos, escribe a <strong>[TU EMAIL]</strong> indicando el derecho que deseas ejercer y adjuntando copia de un documento identificativo.</p>

      <h2>7. Derechos específicos California (CCPA/CPRA)</h2>
      <p>Si resides en California tienes derecho a: (a) saber qué información recopilamos, (b) solicitar su eliminación, (c) corregir información inexacta, (d) optar por <em>no</em> a la "venta" o "compartición" de datos personales (no realizamos venta), (e) no ser discriminado por ejercer estos derechos.</p>

      <h2>8. Menores</h2>
      <p>El servicio está dirigido a mayores de 16 años (UE) / 13 años (otros). No recopilamos conscientemente datos de menores.</p>

      <h2>9. Seguridad</h2>
      <p>Aplicamos medidas técnicas y organizativas: cifrado en tránsito (HTTPS/TLS), cifrado en reposo, autenticación con contraseña segura (mín. 10 caracteres + verificación HIBP), Row-Level Security en la base de datos y verificación obligatoria de email.</p>

      <h2>10. Cambios</h2>
      <p>Podremos actualizar esta política. Los cambios sustanciales se notificarán por email o aviso destacado en la app.</p>
    </LegalLayout>
  );
}
