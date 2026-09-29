// Configuración de Supabase
const SUPABASE_URL = "https://xflmaffndouqagyjfklv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmbG1hZmZuZG91cWFneWpma2x2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2Nzg2MTQsImV4cCI6MjEwMjI1NDYxNH0.RNmVSirWxVT9n6ZC-NUJqJy9WUV9P0fdcz9vVpeYIIY"; 

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Leer ID de la URL (?id=xxxx)
const urlParams = new URLSearchParams(window.location.search);
const invitadoId = urlParams.get('id');

// Elementos del DOM
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error-card');
const contentEl = document.getElementById('content');

const nombreEl = document.getElementById('invitado-nombre');
const pasesNumEl = document.getElementById('pases-asignados-num');
const pasesTextoEl = document.getElementById('pases-texto');
const selectPasesEl = document.getElementById('select-pases');

const rsvpForm = document.getElementById('rsvp-form');
const rsvpSuccess = document.getElementById('rsvp-success');
const successMsg = document.getElementById('success-message');
const btnDeclinar = document.getElementById('btn-declinar');

let datosInvitado = null;

// 1. Cargar datos del invitado
async function init() {
    if (!invitadoId) {
        console.warn("No hay ID en la URL");
        mostrarError();
        return;
    }

    try {
        // Consultar el invitado por UUID
        const { data, error } = await supabaseClient
            .from('invitaciones')
            .select('*')
            .eq('id', invitadoId)
            .maybeSingle();

        if (error || !data) {
            console.error("Error al consultar invitado:", error);
            mostrarError();
            return;
        }

        datosInvitado = data;

        // Renderizar la interfaz de inmediato
        renderizar();
        iniciarCuentaRegresiva();

        // Incrementar vistas en segundo plano
        supabaseClient
            .from('invitaciones')
            .update({ vistas: (datosInvitado.vistas || 0) + 1 })
            .eq('id', invitadoId)
            .then(({ error: errVistas }) => {
                if (errVistas) console.warn("No se pudo actualizar contador de vistas (revisa RLS):", errVistas);
            });

    } catch (err) {
        console.error("Error inesperado en init:", err);
        mostrarError();
    }
}

// 2. Renderizar la interfaz con los datos
function renderizar() {
    if (loadingEl) loadingEl.classList.add('d-none');
    if (contentEl) contentEl.classList.remove('d-none');

    if (nombreEl) nombreEl.textContent = datosInvitado.nombre;
    if (pasesNumEl) pasesNumEl.textContent = datosInvitado.pases_asignados;
    if (pasesTextoEl) pasesTextoEl.textContent = datosInvitado.pases_asignados === 1 ? 'pase reservado' : 'pases reservados';

    // Opciones del selector de pases
    if (selectPasesEl) {
        selectPasesEl.innerHTML = '';
        for (let i = 1; i <= datosInvitado.pases_asignados; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i === 1 ? '1 Persona' : `${i} Personas`;
            selectPasesEl.appendChild(option);
        }
    }

    // Si ya confirmó previamente
    if (datosInvitado.estado !== 'pendiente') {
        mostrarEstadoGuardado();
    }
}

// 3. Confirmar Asistencia
if (rsvpForm) {
    rsvpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pasesConfirmados = selectPasesEl ? parseInt(selectPasesEl.value) : 1;

        deshabilitarBotones(true);

        const { error } = await supabaseClient
            .from('invitaciones')
            .update({
                estado: 'confirmado',
                pases_confirmados: pasesConfirmados
            })
            .eq('id', invitadoId);

        if (error) {
            console.error("Error en update RSVP:", error);
            alert("Ocurrió un error al guardar tu respuesta.");
            deshabilitarBotones(false);
        } else {
            datosInvitado.estado = 'confirmado';
            datosInvitado.pases_confirmados = pasesConfirmados;
            mostrarEstadoGuardado();
        }
    });
}

// 4. Declinar Asistencia
if (btnDeclinar) {
    btnDeclinar.addEventListener('click', async () => {
        if (confirm("¿Estás seguro de que no podrás asistir?")) {
            deshabilitarBotones(true);

            const { error } = await supabaseClient
                .from('invitaciones')
                .update({
                    estado: 'rechazado',
                    pases_confirmados: 0
                })
                .eq('id', invitadoId);

            if (error) {
                console.error("Error en update rechazo:", error);
                alert("Error al guardar respuesta.");
                deshabilitarBotones(false);
            } else {
                datosInvitado.estado = 'rechazado';
                datosInvitado.pases_confirmados = 0;
                mostrarEstadoGuardado();
            }
        }
    });
}

function mostrarEstadoGuardado() {
    if (rsvpForm) rsvpForm.classList.add('d-none');
    if (rsvpSuccess) rsvpSuccess.classList.remove('d-none');

    if (successMsg) {
        if (datosInvitado.estado === 'confirmado') {
            successMsg.innerHTML = `<strong>¡Asistencia Confirmada!</strong><br><small class="text-white-50">Reservaste ${datosInvitado.pases_confirmados} pase(s). Nos vemos pronto.</small>`;
        } else {
            successMsg.innerHTML = `<strong>Respuesta recibida</strong><br><small class="text-white-50">Lamentamos que no puedas acompañarnos.</small>`;
        }
    }
}

function mostrarError() {
    if (loadingEl) loadingEl.classList.add('d-none');
    if (errorEl) errorEl.classList.remove('d-none');
}

function deshabilitarBotones(disable) {
    const btnConfirmar = document.getElementById('btn-confirmar');
    if (btnConfirmar) btnConfirmar.disabled = disable;
    if (btnDeclinar) btnDeclinar.disabled = disable;
}

// 5. Lógica del Contador Regresivo
function iniciarCuentaRegresiva() {
    // Fecha objetivo futura (Ejemplo: 14 de Febrero de 2027)
    const targetDate = new Date("Feb 14, 2027 17:00:00").getTime();

    const timer = setInterval(() => {
        const now = new Date().getTime();
        const difference = targetDate - now;

        if (difference > 0) {
            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            const daysEl = document.getElementById("cd-days");
            const hoursEl = document.getElementById("cd-hours");
            const minsEl = document.getElementById("cd-mins");
            const secsEl = document.getElementById("cd-secs");

            if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
            if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
            if (minsEl) minsEl.textContent = String(minutes).padStart(2, '0');
            if (secsEl) secsEl.textContent = String(seconds).padStart(2, '0');
        } else {
            clearInterval(timer);
        }
    }, 1000);
}

document.addEventListener('DOMContentLoaded', init);