// --- CONFIGURACIÓN ---
mapboxgl.accessToken = 'pk.eyJ1IjoiZGVtb3VzZXIiLCJhIjoiY2x6Znh5eDkwMDBzNjJrb2x6Znh5eDkwIn0.F7_SAMPLE_TOKEN_HERE';

// 1. Inicializar Mapa
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11', 
    center: [-86.85, 21.16], 
    zoom: 10,
    interactive: false
});

// 2. Control de Capas Globales
const layers = {
    video: document.getElementById('video-layer'),
    map: document.getElementById('map-layer')
};

function switchGlobalLayer(name) {
    Object.values(layers).forEach(el => el.classList.remove('is-active'));
    if (layers[name]) layers[name].classList.add('is-active');
}

// 3. Scrollama Setup
const scroller = scrollama();

// A. Evento: Entrar en un paso
function handleStepEnter(response) {
    const { element } = response;
    const step = element.dataset.step;

    // Activar estilo visual del texto
    document.querySelectorAll('.step').forEach(s => s.classList.remove('is-active'));
    element.classList.add('is-active');

    // --- LÓGICA DE LA HISTORIA ---
    switch (step) {
        case '1':
            switchGlobalLayer('video');
            const vid = document.getElementById('hero-video');
            if(vid) vid.play().catch(()=>{});
            break;

        case '2':
            switchGlobalLayer('map');
            map.flyTo({ center: [-86.85, 21.16], zoom: 10, pitch: 0 });
            break;

        case '3':
            // Step 3: STICKY
            // Ocultamos las capas globales. El CSS del Step 3 toma el control.
            switchGlobalLayer('none'); 
            break;

        case '4':
            switchGlobalLayer('map');
            map.flyTo({ center: [-86.78, 21.13], zoom: 11.5, pitch: 0, speed: 0.8 });
            break;
    }
}

// B. Evento: Progreso dentro del paso (Para el efecto de imagen)
function handleStepProgress(response) 
    {const { element, progress } = response;
    const step = element.dataset.step;
    
    if (element.dataset.step === '3') {
        // Seleccionamos el contenedor "sticky" dentro del step actual
        const stickyItem = element.querySelector('.sticky-item');
        
        if (!stickyItem) return;

        // Lógica de Trigger (Umbral 30%)
        if (progress > 0.3) {
            stickyItem.classList.add('show-overlay');
        } else {
            stickyItem.classList.remove('show-overlay');
        }
    }

    // LÓGICA STEP 5: Zoom al Diario
    if (step === '5') {
    const img = element.querySelector('.doc-image');
    const caption = element.querySelector('.doc-caption');

    if (img) {
        // --- CONFIGURACIÓN ---
        
        // 1. ZOOM: De pequeño (cabe en pantalla) a Real (Gigante)
        const startScale = 0.33; 
        const endScale = 1;

        // 2. PANEO (Movimiento Vertical en %)
        // 0 = Centro de la imagen en el centro de pantalla
        // -30 = Mueve la imagen hacia ARRIBA un 30% de su altura (muestra la parte de abajo)
        const startPanY = 0; 
        const endPanY = -32; // <--- AJUSTA ESTE NÚMERO si quieres ver más abajo o más arriba

        // --- CÁLCULOS ---
        const currentScale = startScale + (progress * (endScale - startScale));
        const currentPanY = startPanY + (progress * (endPanY - startPanY));

        // --- APLICACIÓN ---
        // Usamos translate3d para activar aceleración de hardware
        img.style.transform = `translate3d(0, ${currentPanY}%, 0) scale(${currentScale})`;
    }

    // Lógica del caption (texto)
    if (caption) {
        // Hacemos que aparezca un poco antes para que se lea bien al final
        caption.style.opacity = progress > 0.7 ? 1 : 0;
    }
    }
}

function init() {
    scroller
        .setup({
            step: '.step',
            offset: 0.5,
            progress: true, // <--- CRUCIAL: Habilita el seguimiento continuo
            debug: false
        })
        .onStepEnter(handleStepEnter)
        .onStepProgress(handleStepProgress); // <--- Conectamos la función de progreso
        
    window.addEventListener('resize', scroller.resize);
}

// Arrancar
init();