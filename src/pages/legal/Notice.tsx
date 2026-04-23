import LegalLayout from './LegalLayout';

export default function Notice() {
  return (
    <LegalLayout title="Aviso legal" lastUpdated="2026-04-23">
      <p>De conformidad con la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y del Comercio Electrónico (LSSI-CE) y normativa equivalente, se facilitan los siguientes datos del responsable del sitio web <strong>WindFlowRadar</strong>.</p>

      <h2>1. Datos del titular</h2>
      <ul>
        <li><strong>Titular:</strong> Juan M de Haro</li>
        <li><strong>NIF / CIF:</strong> 46674975V</li>
        <li><strong>Domicilio:</strong> Sant Feliu de Llobregat</li>
        <li><strong>País:</strong> España</li>
        <li><strong>Email de contacto:</strong> juhabar@gmail.com</li>
        <li><strong>Sitio web:</strong> https://windradar.lovable.app</li>
      </ul>

      <h2>2. Objeto</h2>
      <p>WindFlowRadar es una aplicación web que ofrece información meteorológica relativa al viento, ráfagas, oleaje y temperatura, así como herramientas para registrar sesiones deportivas (windsurf, kitesurf, vela y similares) y gestionar el inventario de material deportivo personal. El servicio se presta con carácter informativo.</p>

      <h2>3. Condiciones de uso</h2>
      <p>El acceso a la web es libre y gratuito. Algunas funcionalidades (área personal, sesiones, materiales) requieren registro. El usuario se compromete a hacer un uso adecuado y lícito del sitio y a no utilizarlo para realizar actividades ilícitas o contrarias a la buena fe.</p>

      <h2>4. Propiedad intelectual</h2>
      <p>Todos los contenidos del sitio (textos, imágenes, logotipos, código fuente, diseños) son propiedad del titular o cuentan con la correspondiente licencia. Los datos meteorológicos provienen de <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer">Open-Meteo</a> bajo licencia CC BY 4.0.</p>

      <h2>5. Limitación de responsabilidad</h2>
      <p>La información meteorológica se ofrece <strong>"tal cual"</strong>, sin garantías de exactitud o disponibilidad. El titular no se responsabiliza de los daños derivados del uso de la información, especialmente en relación con la práctica de deportes acuáticos. <strong>El usuario es siempre responsable de su seguridad y del juicio propio sobre las condiciones reales del medio.</strong></p>

      <h2>6. Enlaces externos</h2>
      <p>El sitio puede contener enlaces a terceros (Strava, redes sociales, Open-Meteo). El titular no se hace responsable del contenido ni de las políticas de privacidad de dichos sitios.</p>

      <h2>7. Legislación aplicable</h2>
      <p>El presente aviso se rige por la legislación española y europea (Reglamento (UE) 2016/679 — RGPD, LOPDGDD 3/2018, LSSI-CE 34/2002). Para cualquier controversia, las partes se someten a los Juzgados y Tribunales del domicilio del titular, salvo que la normativa aplicable disponga otra cosa.</p>
    </LegalLayout>
  );
}
