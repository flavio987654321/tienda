import Link from "next/link";

export const metadata = {
  title: "Términos y Condiciones del Programa de Afiliados — TiendaApps",
  description: "Condiciones de participación en el programa de afiliados de TiendaApps.",
};

export default function TerminosAfiliados() {
  return (
    <div className="min-h-screen bg-[#070b18] text-gray-300">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <Link href="/afiliados" className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
            ← Volver a Vendedoras
          </Link>
        </div>

        <h1 className="text-3xl font-black text-white mb-2">
          Términos y Condiciones del Programa de Afiliados
        </h1>
        <p className="text-gray-500 text-sm mb-12">
          Versión 1.3 — Vigente desde el 25 de mayo de 2025
        </p>

        <div className="space-y-10 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-white mb-3">1. Partes del acuerdo</h2>
            <p>
              El presente acuerdo se celebra entre la persona que acepta estos términos
              (en adelante <strong className="text-white">"el/la Afiliado/a"</strong>) y el/la titular de la tienda
              a la cual el/la Afiliado/a se postula (en adelante <strong className="text-white">"el/la Titular"</strong>),
              a través de la plataforma TiendaApps (en adelante <strong className="text-white">"la Plataforma"</strong>).
            </p>
            <p className="mt-3">
              Al marcar la casilla de aceptación al momento de postularse, el/la Afiliado/a declara haber
              leído, comprendido y aceptado en su totalidad los presentes términos. Esta aceptación
              queda registrada con fecha, hora e IP del dispositivo utilizado, constituyendo prueba
              suficiente de conformidad.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">2. Objeto del programa</h2>
            <p>
              El Programa de Afiliados permite a usuarios y usuarias registrados en la Plataforma promocionar
              y vender los productos de una tienda a través de un enlace de referido personalizado,
              percibiendo una comisión sobre cada venta confirmada que se origine mediante dicho enlace.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">3. Comisiones</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-400">
              <li>
                La comisión se calcula sobre el <strong className="text-gray-300">subtotal del pedido menos descuentos</strong>.
                No se incluye el costo de envío.
              </li>
              <li>
                La comisión se acredita en el momento en que el pago del pedido es confirmado
                (estado <em>Confirmado</em>). Pedidos en estado Pendiente no generan comisión.
              </li>
              <li>
                Una vez acreditada, la comisión <strong className="text-gray-300">no se revierte</strong> aunque
                el pedido sea cancelado con posterioridad. La afiliada cumplió su función al generar
                la venta; cualquier cancelación posterior es responsabilidad del/la Titular.
              </li>
              <li>
                El porcentaje de comisión es el vigente al momento de la venta y puede ser
                modificado por el/la Titular con aviso previo de al menos 7 días corridos.
              </li>
            </ul>

            <h3 className="text-base font-bold text-white mt-5 mb-2">3b. Comisiones por consultas (WhatsApp)</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-400">
              <li>
                Cuando un potencial comprador hace clic en tu link de afiliado y consulta al/a la Titular
                por WhatsApp, la Plataforma registra esa consulta (<em>lead</em>) vinculada a tu cuenta.
              </li>
              <li>
                El/la Titular decide si confirmar o rechazar la consulta como venta desde su panel.
                <strong className="text-gray-300"> Solo las consultas confirmadas generan comisión</strong>.
              </li>
              <li>
                La comisión se calcula sobre el precio del producto al momento de la consulta y se
                acredita automáticamente en tu billetera al ser confirmada.
              </li>
              <li>
                El/la Titular tiene la facultad exclusiva de decidir si una consulta representa
                una venta válida. La Plataforma no interviene en esta decisión salvo en caso de
                disputa formal conforme a la Sección 10.
              </li>
              <li>
                Los datos del consultante (nombre, teléfono, mensaje) son accesibles para el/la
                Titular. No son visibles para el/la Afiliado/a salvo que el/la Titular decida
                compartirlos directamente.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">4. Retiros y pagos</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-400">
              <li>El monto mínimo de retiro es de <strong className="text-gray-300">$500 ARS</strong>.</li>
              <li>
                Los retiros se procesan de forma automática a través de un procesador de pagos
                externo. El tiempo estimado de acreditación es de <strong className="text-gray-300">1 a 3 días hábiles</strong>.
              </li>
              <li>
                Al momento del retiro se descuenta una <strong className="text-gray-300">comisión de procesamiento</strong>{" "}
                correspondiente al costo del servicio de transferencia bancaria automática. Dicha comisión
                se informa antes de confirmar el retiro.
              </li>
              <li>
                El/la Afiliado/a es responsable de ingresar correctamente sus datos bancarios
                (CBU/CVU, alias, CUIL y titular). La Plataforma no se responsabiliza por
                transferencias enviadas a datos erróneos provistos por el/la Afiliado/a.
              </li>
              <li>
                Por seguridad, los retiros quedan bloqueados durante 72 horas después de
                modificar los datos bancarios.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">5. Obligaciones del/la Afiliado/a</h2>
            <p className="mb-3">El/la Afiliado/a se compromete a:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-400">
              <li>
                Promocionar los productos de manera veraz, sin publicidad engañosa,
                exagerada o que induzca a error a los compradores.
              </li>
              <li>
                No realizar ni inducir a terceros a realizar pedidos falsos, ficticios
                o fraudulentos con el fin de generar comisiones artificiales.
              </li>
              <li>
                No utilizar el enlace de referido en plataformas de spam, correos no
                solicitados o medios que dañen la reputación de la tienda o la Plataforma.
              </li>
              <li>
                No hacer comparaciones denigrantes con otras marcas o tiendas competidoras.
              </li>
              <li>
                Mantener actualizados sus datos de contacto y bancarios en la Plataforma.
              </li>
              <li>
                No acordar ni recibir pagos, comisiones o compensaciones de parte del/la Titular
                por fuera del sistema de billetera de la Plataforma. Toda comisión derivada de ventas
                generadas a través del enlace de referido debe procesarse exclusivamente a través de TiendaApps.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">6. Facultades del/la Titular</h2>
            <p>
              El/la Titular tiene derecho a aprobar, rechazar, pausar o dar de baja a cualquier Afiliado/a,
              con las siguientes condiciones:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-400 mt-3">
              <li>
                Para dar de baja a un/a Afiliado/a activo/a sin causa de fraude, el/la Titular debe
                notificar con al menos <strong className="text-gray-300">48 horas de anticipación</strong>.
                Las bajas por fraude comprobado o incumplimiento grave pueden ser inmediatas.
              </li>
              <li>
                Las comisiones ya acreditadas por ventas confirmadas previas a la baja
                permanecerán disponibles para retiro en la billetera del/la Afiliado/a.
              </li>
              <li>
                El/la Titular no puede dar de baja ni pausar a un/a Afiliado/a con el exclusivo
                propósito de no pagarle comisiones ya devengadas.
              </li>
              <li>
                En caso de baja por fraude comprobado o incumplimiento grave de estos
                términos, el/la Titular puede solicitar la retención de comisiones pendientes
                mediante el procedimiento de disputa establecido en la Sección 10.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">7. Responsabilidad</h2>
            <p>
              La Plataforma actúa como intermediaria tecnológica. No garantiza un nivel mínimo
              de ventas ni ingresos al/a la Afiliado/a. La relación entre el/la Afiliado/a y el/la Titular
              es de naturaleza comercial independiente y no implica relación de dependencia laboral.
            </p>
            <p className="mt-3">
              La acreditación automática de comisiones en billetera constituye un servicio de la Plataforma,
              pero el/la Titular es el/la único/a responsable del pago efectivo. TiendaApps no garantiza
              la solvencia del/la Titular ni asume responsabilidad ante incumplimientos de pago de su parte.
            </p>
            <p className="mt-3">
              TiendaApps no será responsable por daños indirectos o imprevisibles derivados del uso de la
              Plataforma. En caso de daño directo comprobable imputable a la Plataforma, la responsabilidad
              se determinará según la legislación argentina vigente, sin perjuicio de los derechos
              irrenunciables que la Ley 24.240 reconoce a los/las usuarios/as consumidores/as.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">8. Cancelación de suscripción con saldos pendientes</h2>
            <p>
              Si el/la Titular cancela su suscripción a TiendaApps teniendo saldos pendientes de retiro
              en billeteras de Afiliados/as, dichas comisiones ya acreditadas siguen siendo exigibles.
              La cancelación de la suscripción no extingue las obligaciones de pago ya devengadas.
            </p>
            <p className="mt-3">
              En este escenario, el/la Afiliado/a puede iniciar el procedimiento de disputa descripto
              en la Sección 10 dentro de los 30 días posteriores a la cancelación.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">9. Modificaciones</h2>
            <p>
              Estos términos pueden ser actualizados. Cuando eso ocurra, la versión anterior
              permanecerá registrada en el sistema junto a la fecha en que cada Afiliado/a la aceptó.
              La continuidad en el uso del programa implica aceptación de la versión vigente.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">10. Mecanismo de disputas</h2>
            <p>
              Ante un conflicto entre el/la Afiliado/a y el/la Titular (comisiones no pagadas, baja
              indebida, fraude u otros), cualquiera de las partes puede iniciar una disputa escribiendo
              a <strong className="text-white">marketplacemitienda@gmail.com</strong> con el asunto{" "}
              <em>"Disputa de afiliado"</em>, detallando el reclamo y adjuntando evidencia relevante.
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-400 mt-3">
              <li>TiendaApps revisará la disputa dentro de los <strong className="text-gray-300">5 días hábiles</strong> de recibida.</li>
              <li>La Plataforma puede solicitar información adicional a ambas partes.</li>
              <li>La resolución de TiendaApps es orientativa y no vinculante en términos legales,
                pero puede derivar en suspensión o baja de cuentas involucradas.</li>
              <li>Si no hay acuerdo, las partes pueden recurrir a la justicia ordinaria según la Sección 11.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">11. Jurisdicción</h2>
            <p>
              Estos términos se rigen por la legislación argentina. Para cualquier conflicto
              derivado de la relación comercial entre Afiliado/a y Titular, las partes podrán
              acudir a los tribunales competentes según su domicilio real, o bien a los mecanismos
              de mediación disponibles en su jurisdicción.
            </p>
            <p className="mt-3">
              Los/las usuarios/as que actúen como consumidores/as en los términos de la Ley 24.240
              conservan el derecho de demandar ante los tribunales del lugar de su domicilio,
              sin perjuicio de lo establecido en este artículo. Ninguna cláusula de estos términos
              puede interpretarse como renuncia a derechos irrenunciables del consumidor.
            </p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-white/5 text-xs text-gray-600 text-center">
          <p>TiendaApps — Programa de Afiliados · Versión 1.3</p>
          <p className="mt-1">Para consultas escribí a soporte desde tu panel de afiliado/a.</p>
        </div>
      </div>
    </div>
  );
}
