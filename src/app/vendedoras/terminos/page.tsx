import Link from "next/link";

export const metadata = {
  title: "Términos y Condiciones del Programa de Afiliados — MiTienda",
  description: "Condiciones de participación en el programa de vendedoras afiliadas de MiTienda.",
};

export default function TerminosAfiliadas() {
  return (
    <div className="min-h-screen bg-[#070b18] text-gray-300">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <Link href="/vendedoras" className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
            ← Volver a Vendedoras
          </Link>
        </div>

        <h1 className="text-3xl font-black text-white mb-2">
          Términos y Condiciones del Programa de Afiliadas
        </h1>
        <p className="text-gray-500 text-sm mb-12">
          Versión 1.0 — Vigente desde el 1 de mayo de 2025
        </p>

        <div className="space-y-10 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-white mb-3">1. Partes del acuerdo</h2>
            <p>
              El presente acuerdo se celebra entre la persona que acepta estos términos
              (en adelante <strong className="text-white">"la Afiliada"</strong>) y la dueña de la tienda
              a la cual la Afiliada se postula (en adelante <strong className="text-white">"la Dueña"</strong>),
              a través de la plataforma MiTienda (en adelante <strong className="text-white">"la Plataforma"</strong>).
            </p>
            <p className="mt-3">
              Al marcar la casilla de aceptación al momento de postularse, la Afiliada declara haber
              leído, comprendido y aceptado en su totalidad los presentes términos. Esta aceptación
              queda registrada con fecha, hora e IP del dispositivo utilizado, constituyendo prueba
              suficiente de conformidad.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">2. Objeto del programa</h2>
            <p>
              El Programa de Afiliadas permite a usuarias registradas en la Plataforma promocionar
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
                La comisión se acredita únicamente cuando la Dueña confirma el pago del pedido
                (estado <em>Confirmado</em>). Pedidos en estado Pendiente no generan comisión.
              </li>
              <li>
                Si un pedido confirmado es cancelado con posterioridad, la comisión acreditada
                será revertida de la billetera de la Afiliada.
              </li>
              <li>
                El porcentaje de comisión es el vigente al momento de la venta y puede ser
                modificado por la Dueña con aviso previo de al menos 7 días corridos.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">4. Retiros y pagos</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-400">
              <li>El monto mínimo de retiro es de <strong className="text-gray-300">$500 ARS</strong>.</li>
              <li>
                Los retiros solicitados son procesados manualmente en un plazo de
                <strong className="text-gray-300"> 1 a 3 días hábiles</strong>, sujeto a disponibilidad.
              </li>
              <li>
                La Afiliada es responsable de ingresar correctamente sus datos bancarios
                (CBU/CVU, alias, CUIL y titular). La Plataforma no se responsabiliza por
                transferencias enviadas a datos erróneos provistos por la Afiliada.
              </li>
              <li>
                Por seguridad, los retiros quedan bloqueados durante 72 horas después de
                modificar los datos bancarios.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">5. Obligaciones de la Afiliada</h2>
            <p className="mb-3">La Afiliada se compromete a:</p>
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
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">6. Facultades de la Dueña</h2>
            <p>
              La Dueña tiene derecho a aprobar, rechazar, pausar o dar de baja a cualquier Afiliada
              en cualquier momento, sin necesidad de expresar causa, siempre que:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-400 mt-3">
              <li>
                Las comisiones ya acreditadas por ventas confirmadas previas a la baja
                permanecerán disponibles para retiro en la billetera de la Afiliada.
              </li>
              <li>
                En caso de baja por fraude comprobado o incumplimiento grave de estos
                términos, la Dueña puede retener las comisiones pendientes y solicitar
                la reversión de las ya pagadas mediante el procedimiento legal correspondiente.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">7. Responsabilidad</h2>
            <p>
              La Plataforma actúa como intermediaria tecnológica. No garantiza un nivel mínimo
              de ventas ni ingresos a la Afiliada. La relación entre la Afiliada y la Dueña
              es de naturaleza comercial independiente y no implica relación de dependencia laboral.
            </p>
            <p className="mt-3">
              La Plataforma no es responsable por disputas entre la Afiliada y la Dueña que
              excedan el alcance de estas condiciones.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">8. Modificaciones</h2>
            <p>
              Estos términos pueden ser actualizados. Cuando eso ocurra, la versión anterior
              permanecerá registrada en el sistema junto a la fecha en que cada Afiliada la aceptó.
              La continuidad en el uso del programa implica aceptación de la versión vigente.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">9. Jurisdicción</h2>
            <p>
              Las partes acuerdan someterse a la jurisdicción de los tribunales ordinarios de la
              <strong className="text-white"> Ciudad Autónoma de Buenos Aires, Argentina</strong>,
              con renuncia a cualquier otro fuero que pudiera corresponder.
            </p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-white/5 text-xs text-gray-600 text-center">
          <p>MiTienda — Programa de Afiliadas · Versión 1.0</p>
          <p className="mt-1">Para consultas escribí a soporte desde tu panel de vendedora.</p>
        </div>
      </div>
    </div>
  );
}
