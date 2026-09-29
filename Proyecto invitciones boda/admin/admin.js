// Configuración de Supabase
const SUPABASE_URL = "https://xflmaffndouqagyjfklv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_7fGUeE723Zj5qOzRvD8WrA_jon-PzMY"; 

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Referencias al DOM
const form = document.getElementById("form-nuevo-invitado");
const tabla = document.getElementById("tabla-invitados");

// Función para calcular la URL base dinámica de index.html
function obtenerBaseUrlInvitacion() {
    // Obtiene la URL limpia actual sin parámetros ni hash
    let currentUrl = window.location.href.split('?')[0].split('#')[0];

    // Si termina en admin.html (o /admin/admin.html), lo reemplaza por index.html
    if (currentUrl.toLowerCase().endsWith('admin.html')) {
        return currentUrl.substring(0, currentUrl.toLowerCase().lastIndexOf('admin.html')) + 'index.html';
    }

    // Si estás en la raíz de una carpeta local sin especificar el html
    if (currentUrl.endsWith('/')) {
        return currentUrl + 'index.html';
    }

    return currentUrl;
}
document.addEventListener("DOMContentLoaded", () => {
    cargarInvitados();
});

// 1. Cargar invitados
async function cargarInvitados() {
    const { data: invitados, error } = await supabaseClient
        .from('invitaciones')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error al obtener invitados:", error);
        return;
    }

    let html = "";
    let totalInvitaciones = 0;
    let totalConfirmados = 0;
    let totalPasesConfirmados = 0;
    let totalVistas = 0;

    const baseUrl = obtenerBaseUrlInvitacion();

    invitados.forEach((item) => {
        totalInvitaciones++;
        totalVistas += item.vistas || 0;

        let badgeEstado = '<span class="badge bg-warning text-dark badge-status">Pendiente</span>';
        if (item.estado === "confirmado") {
            badgeEstado = '<span class="badge bg-success badge-status">Confirmado</span>';
            totalConfirmados++;
            totalPasesConfirmados += Number(item.pases_confirmados || 0);
        } else if (item.estado === "rechazado") {
            badgeEstado = '<span class="badge bg-danger badge-status">Declinó</span>';
        }

        const urlInvitacion = `${baseUrl}?id=${item.id}`;

        html += `
            <tr>
                <td class="fw-bold">${item.nombre}</td>
                <td class="text-center">${badgeEstado}</td>
                <td class="text-center">
                    <span class="fw-bold text-success">${item.pases_confirmados || 0}</span> / ${item.pases_asignados}
                </td>
                <td class="text-center"><i class="bi bi-eye text-muted me-1"></i>${item.vistas || 0}</td>
                <td class="text-end">
                    <button class="btn btn-outline-primary btn-action me-1" onclick="copiarEnlace('${urlInvitacion}')" title="Copiar enlace">
                        <i class="bi bi-link-45deg"></i> Copiar
                    </button>
                    <button class="btn btn-outline-danger btn-action" onclick="eliminarInvitado('${item.id}')" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    if (tabla) {
        tabla.innerHTML = html || '<tr><td colspan="5" class="text-center text-muted py-3">No hay invitados registrados aún.</td></tr>';
    }

    const metricTotal = document.getElementById("metric-total");
    const metricConfirmados = document.getElementById("metric-confirmados");
    const metricPases = document.getElementById("metric-pases");
    const metricVistas = document.getElementById("metric-vistas");

    if (metricTotal) metricTotal.textContent = totalInvitaciones;
    if (metricConfirmados) metricConfirmados.textContent = totalConfirmados;
    if (metricPases) metricPases.textContent = totalPasesConfirmados;
    if (metricVistas) metricVistas.textContent = totalVistas;
}

// 2. Agregar nuevo invitado
if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const nombreInput = document.getElementById("input-nombre");
        const pasesInput = document.getElementById("input-pases");

        const nombre = nombreInput.value.trim();
        const pases = parseInt(pasesInput.value);

        const { data, error } = await supabaseClient
            .from('invitaciones')
            .insert([
                {
                    nombre: nombre,
                    pases_asignados: pases,
                    pases_confirmados: 0,
                    estado: "pendiente",
                    vistas: 0
                }
            ])
            .select()
            .single();

        if (error) {
            console.error("Error al insertar:", error);
            alert("Error al guardar en Supabase: " + error.message);
        } else {
            form.reset();
            if (pasesInput) pasesInput.value = 2;
            
            await cargarInvitados();

            const baseUrl = obtenerBaseUrlInvitacion();
            const nuevoUrl = `${baseUrl}?id=${data.id}`;
            copiarEnlace(nuevoUrl, `¡Invitación creada para ${data.nombre}!\nEl enlace se ha copiado al portapapeles.`);
        }
    });
}

// 3. Eliminar invitado
window.eliminarInvitado = async (id) => {
    if (confirm("¿Estás seguro de que deseas eliminar a este invitado?")) {
        const { error } = await supabaseClient
            .from('invitaciones')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Error al eliminar:", error);
            alert("No se pudo eliminar el registro.");
        } else {
            cargarInvitados();
        }
    }
};

// 4. Copiar enlace
window.copiarEnlace = (url, mensajePersonalizado) => {
    navigator.clipboard.writeText(url).then(() => {
        alert(mensajePersonalizado || ("¡Enlace copiado al portapapeles!\n\n" + url));
    }).catch(err => {
        console.error('Error al copiar: ', err);
        alert("Enlace generado:\n" + url);
    });
};