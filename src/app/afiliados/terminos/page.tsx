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
        <p className="text-gray-500 text-sm mb-6">
          Versión 2.0 — Vigente desde julio de 2026
        </p>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5 mb-10 text-sm text-gray-300 space-y-1">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Responsable de la plataforma</p>
          <p><span className="text-gray-500">Nombre:</span> Flavio Cesar Soltero Legoas</p>
          <p><span className="text-gray-500">CUIL:</span> 20-94992405-0</p>
          <p><span className="text-gray-500">Domicilio:</span> Bacota 1833 (entre Apolo y Juno), Pinamar, Buenos Aires, CP 7167</p>
          <p><span className="text-gray-500">Email:</span>{" "}
            <a href="mailto:marketplacemitienda@gmail.com" className="text-indigo-400 hover:underline">marketplacemitienda@gmail.com</a>
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-white mb-3">1. Partes del acuerdo</h2>
            <p>
              El presente acuerdo se celebra entre la persona que acepta estos términos
              (en adelante <strong className="text-white">&quot;el/la Afiliado/a&quot;</strong>) y el/la titular de la tienda
              a la cual el/la Afiliado/a se postula (en adelante <strong className="text-white">&quot;el/la Titular&quot;</strong>),
              a través de la plataforma TiendaApps (en adelante <strong className="text-white">&quot;la Plataforma&quot;</strong>).
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
                La comisión se acredita en tu <strong className="text-gray-300">panel de comisiones de TiendaApps</strong>.
                Desde ahí podés solicitar un retiro a tu cuenta bancaria (CBU/alias) cuando quieras, sin vencimiento de saldo.
                El mínimo de retiro es de $100 ARS y se procesa en 1 a 3 días hábiles.
              </li>
              <li>
                Una vez acreditada, la comisión <strong className="text-gray-300">no se revierte</strong> aunque
                el pedido sea cancelado con posterioridad por el/la Titular. La afiliada cumplió su función al generar
                la venta; cualquier cancelación posterior es responsabilidad del/la Titular.
                <br />
                <span className="text-gray-500">
                  Excepción: si el comprador inicia una devolución de cargo (<em>chargeback</em>) a través de MercadoPago
                  y el pago es revertido por MercadoPago, TiendaApps se reserva el derecho de revertir la comisión
                  acreditada o ya transferida, dado que el ingreso que la sustenta fue devuelto.
                </span>
              </li>
              <li>
                El porcentaje de comisión es el vigente al momento de la venta. El/la Titular
                está obligado/a a notificarte con al menos <strong className="text-gray-300">5 días corridos de anticipación</strong> antes
                de realizar cualquier cambio. TiendaApps enviará la notificación por email y en el panel
                en el momento en que el/la Titular aplique el cambio. El nuevo porcentaje aplica a ventas
                confirmadas a partir del cambio — nunca de forma retroactiva sobre comisiones ya generadas.
                Si el/la Titular no respetó el preaviso de 5 días, podés iniciar el procedimiento
                de la Sección 10.
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
                acredita en tu panel de comisiones al ser confirmada.
              </li>
              <li>
                El/la Titular tiene la facultad de decidir si una consulta representa
                una venta válida, pero <strong className="text-gray-300">no puede rechazar sistemáticamente
                consultas para evitar el pago de comisiones</strong>. El rechazo debe estar fundado
                en la no concreción real de la venta. En caso de patrones de rechazo injustificados,
                el/la Afiliado/a puede iniciar el procedimiento de disputa de la Sección 10.
                La Plataforma no interviene en decisiones individuales salvo en caso de disputa formal.
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
              <li>
                Las comisiones acreditadas pueden retirarse desde el panel de comisiones en cualquier momento.
                El monto mínimo de retiro es de <strong className="text-gray-300">$100 ARS</strong>.
              </li>
              <li>
                Una vez aprobada la solicitud de retiro, TiendaApps realizará la transferencia bancaria
                dentro de los <strong className="text-gray-300">1 a 3 días hábiles</strong> siguientes.
                Si el retiro no se procesa dentro de los 5 días hábiles por causas imputables a TiendaApps,
                el/la Afiliado/a puede iniciar el procedimiento de disputa de la Sección 10 o reclamar ante la Dirección Nacional de Defensa del Consumidor.
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
            <h2 className="text-lg font-bold text-white mb-3">4 bis. Saldo acumulado e inflación</h2>
            <p>
              Los saldos en el panel de comisiones se expresan en <strong className="text-white">pesos argentinos (ARS)</strong> y no
              se ajustan por inflación ni por variación del tipo de cambio.
            </p>
            <p className="mt-3">
              TiendaApps recomienda realizar retiros de forma periódica y no acumular saldos
              por períodos prolongados, a fin de reducir la exposición al riesgo inflacionario.
              La plataforma no tiene obligación legal de actualizar el valor de los saldos acumulados.
            </p>
            <p className="mt-3">
              Para facilitar retiros frecuentes, el monto mínimo de retiro fue reducido a{" "}
              <strong className="text-white">$100 ARS</strong>. Podés retirar en cualquier momento desde tu panel de comisiones.
            </p>
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
                Identificar claramente su condición de afiliado/a al realizar publicaciones
                promocionales en redes sociales, blogs u otros medios (por ejemplo, con etiquetas
                como <em>#publicidad</em>, <em>#afiliado</em> o equivalentes), en cumplimiento
                de las normas de publicidad transparente vigentes.
              </li>
              <li>
                Mantener actualizados sus datos de contacto y bancarios en la Plataforma.
              </li>
              <li>
                No acordar ni recibir pagos, comisiones o compensaciones de parte del/la Titular
                por fuera del sistema de comisiones de la Plataforma. Toda comisión derivada de ventas
                generadas a través del enlace de referido debe procesarse exclusivamente a través de TiendaApps.
              </li>
              <li>
                El/la Afiliado/a es libre de prestar servicios similares a otras plataformas, marcas o personas
                simultáneamente. <strong className="text-gray-300">TiendaApps no impone exclusividad.</strong>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">5 bis. Fraude y pedidos ficticios</h2>
            <p className="mb-3">
              TiendaApps monitorea el comportamiento de los/las Afiliados/as para detectar conductas fraudulentas.
              Se consideran señales de alerta, entre otras:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-400">
              <li>
                Tasa de <em>chargeback</em> (devoluciones de cargo) superior al{" "}
                <strong className="text-gray-300">5%</strong> del total de comisiones generadas en los últimos 30 días.
              </li>
              <li>
                Pedidos originados desde la misma dirección IP o dispositivo que el del comprador (autocompra).
              </li>
              <li>
                Patrones de pedidos repetidos de bajo monto por el mismo comprador a través del mismo link, sin historial de compras.
              </li>
              <li>
                Indicios de coordinación para generar pedidos ficticios (uso de múltiples cuentas, variantes de email, etc.).
              </li>
            </ul>
            <p className="mt-3">
              Ante la detección de cualquiera de estas señales, TiendaApps puede:{" "}
              (a) suspender preventivamente los retiros pendientes mientras dure la investigación;{" "}
              (b) revertir las comisiones generadas por pedidos fraudulentos y generar el saldo deudor correspondiente;{" "}
              (c) dar de baja definitiva la cuenta del/la Afiliado/a sin previo aviso y sin derecho a reembolso de comisiones comprometidas en el fraude;{" "}
              (d) denunciar los hechos ante las autoridades competentes conforme a la legislación argentina vigente.
            </p>
            <p className="mt-3">
              El/la Afiliado/a puede contestar la suspensión iniciando el procedimiento de la Sección 10 dentro
              de los 5 días hábiles de recibida la notificación, adjuntando evidencia que demuestre la legitimidad
              de las ventas cuestionadas.
            </p>
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
                permanecerán disponibles para retiro en el panel de comisiones del/la Afiliado/a.
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
              <strong className="text-white">TiendaApps es el responsable directo del pago de comisiones</strong>,
              no el/la Titular de la tienda. El flujo técnico funciona de la siguiente manera:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-400 mt-3">
              <li>
                Cuando el comprador paga, el importe de la comisión queda registrado en la cuenta de TiendaApps.
                La Plataforma acredita ese importe en el <strong className="text-gray-300">panel de comisiones del/la Afiliado/a</strong>
                de forma automática en el momento de confirmación del pago.
                El/la Afiliado/a puede solicitar el retiro a su cuenta bancaria en cualquier momento desde el panel.
              </li>
              <li>
                En caso de devolución de cargo (chargeback) aprobada por MercadoPago, el/la Afiliado/a acepta
                que TiendaApps puede: (a) deducir el importe de la comisión revertida de comisiones pendientes
                en tu panel, o (b) generar un saldo deudor en tu panel de comisiones que deberá ser saldado
                dentro de los 30 días corridos. Si el/la Afiliado/a ya retiró los fondos correspondientes a
                esa comisión, la deuda subsiste igualmente y TiendaApps puede reclamarla a través de las vías
                correspondientes. De no regularizarse en el plazo indicado, TiendaApps puede suspender la cuenta
                hasta la cancelación total del saldo deudor.
              </li>
            </ul>
            <p className="mt-3">
              TiendaApps no será responsable por daños indirectos o imprevisibles derivados del uso de la
              Plataforma ni por demoras atribuibles a la infraestructura de MercadoPago. En caso de daño
              directo comprobable imputable a la Plataforma, la responsabilidad se determinará según la
              legislación argentina vigente, sin perjuicio de los derechos irrenunciables que la Ley 24.240
              reconoce a los/las usuarios/as consumidores/as.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">8. Cancelación de suscripción con saldos pendientes</h2>
            <p>
              Si el/la Titular cancela su suscripción a TiendaApps teniendo saldos pendientes de retiro
              en el panel de comisiones de los/las Afiliados/as,{" "}
              <strong className="text-white">TiendaApps garantiza el pago de las comisiones ya acreditadas y confirmadas</strong>,
              aun cuando la tienda cancele su suscripción. La cancelación de la suscripción no extingue
              las obligaciones de pago ya devengadas.
            </p>
            <p className="mt-3">
              En este escenario, el/la Afiliado/a puede iniciar el procedimiento de disputa descripto
              en la Sección 10 dentro de los 30 días posteriores a la cancelación.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">8 quinquies. Cambio de rubro de la tienda</h2>
            <p>
              El/la Titular puede cambiar el rubro (tipo) de su tienda desde su panel. Ese cambio
              reinicia el catálogo y elimina el historial de ventas del ciclo anterior, incluido el
              detalle de tus comisiones en tu panel. Condiciones que te protegen:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-400 mt-3">
              <li>
                <strong className="text-gray-300">Tu saldo está protegido:</strong> la Plataforma no permite
                el cambio de rubro mientras exista saldo acreditado sin retirar o retiros pendientes en el
                panel de comisiones de cualquier Afiliado/a de esa tienda. Las comisiones ya acreditadas se
                liquidan antes del cambio — el cambio de rubro no las extingue.
              </li>
              <li>
                Tras el cambio, tu vínculo de afiliación sigue activo, pero la tienda queda despublicada
                hasta que el/la Titular publique el catálogo del nuevo rubro, y tus estadísticas y metas
                del ciclo anterior se reinician. Vas a recibir una notificación en tu panel.
              </li>
              <li>
                El detalle de comisiones del ciclo anterior queda archivado en un respaldo interno de la
                Plataforma. Podés solicitar una copia escribiendo a marketplacemitienda@gmail.com dentro
                de los 3 años posteriores al cambio (plazo de retención declarado en la Política de Privacidad).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">8 quáter. Afiliados/as menores de edad</h2>
            <p>
              Si al momento de la desvinculación o del cierre de cuenta se detecta que el/la Afiliado/a
              es menor de edad o actuó sin la debida representación legal, cualquier saldo pendiente de retiro
              en el panel de comisiones será retenido hasta tanto se acredite la identidad del{" "}
              <strong className="text-white">representante legal (padre, madre o tutor/a con DNI vigente)</strong>.
            </p>
            <p className="mt-3">
              Una vez acreditada la representación, los fondos serán transferidos exclusivamente
              al titular de la cuenta bancaria indicada por dicho representante legal.
              TiendaApps no realiza transferencias a cuentas a nombre del/la menor de edad
              sin la conformidad expresa del representante legal.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">8 bis. Cierre de la plataforma e interrupciones de infraestructura</h2>
            <p>
              En caso de cierre definitivo de TiendaApps, se otorgará un período mínimo de
              <strong className="text-white"> 60 días corridos</strong> para que los/las Afiliados/as
              retiren todos sus saldos disponibles antes del cese de operaciones.
              TiendaApps notificará por email con al menos 60 días de anticipación.
              La cancelación de la plataforma no extingue las obligaciones de pago de comisiones ya acreditadas.
            </p>
            <p className="mt-3">
              Si la plataforma experimentara una interrupción técnica grave por causas ajenas a su control
              (suspensión de la cuenta de Supabase, Vercel u otro proveedor de infraestructura por impago,
              violación de TOS u otro motivo), TiendaApps notificará a los/las Afiliados/as activos/as
              dentro de las 24 horas de conocida la situación, indicando el plazo estimado de restauración
              y el estado de sus saldos. En ningún caso esa interrupción extingue los saldos acreditados.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">8 ter. Interrupciones de Mercado Pago</h2>
            <p>
              Si la cuenta de MercadoPago de TiendaApps fuera suspendida o limitada por decisión de MercadoPago
              (por revisión de compliance, chargebacks, error administrativo u otro motivo):
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-400 mt-3">
              <li>Ningún nuevo pago podrá procesarse mientras dure la suspensión.</li>
              <li>TiendaApps notificará a todos los/las Afiliados/as activos/as dentro de las 24 horas de conocida la situación.</li>
              <li>Las comisiones ya acreditadas en tu panel de comisiones siguen siendo válidas y exigibles — la suspensión no las cancela ni las reduce.</li>
              <li>TiendaApps trabajará para restablecer el servicio o habilitar un método de pago alternativo en el menor tiempo posible.</li>
              <li>Si la suspensión se extendiera más de 30 días corridos, podés iniciar el procedimiento de disputa de la Sección 10 para exigir el retiro de tus comisiones acreditadas por un canal alternativo.</li>
            </ul>
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
              <em>&quot;Disputa de afiliado&quot;</em>, detallando el reclamo y adjuntando evidencia relevante.
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
          <p>TiendaApps — Programa de Afiliados · Versión 2.0</p>
          <p className="mt-1">Para consultas escribí a soporte desde tu panel de afiliado/a.</p>
        </div>
      </div>
    </div>
  );
}
