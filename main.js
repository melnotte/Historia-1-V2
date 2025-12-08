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
    map: document.getElementById('map-layer'),
    video2: document.getElementById('video-layer-2')
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
            // Step 3: STICKY IMÁGENES
            switchGlobalLayer('none'); 
            break;

        case '4':
            switchGlobalLayer('map');
            map.flyTo({ center: [-86.78, 21.13], zoom: 11.5, pitch: 0, speed: 0.8 });
            break;

        case '5':
            // Step 5: DIARIO OFICIAL
            switchGlobalLayer('none');
            break;

        case '6':
            // Step 6: TEXTO 1968-1971 (Volvemos a ver el mapa de fondo)
            switchGlobalLayer('map');
            // Opcional: Un pequeño ajuste de cámara para dar dinamismo
            map.flyTo({ center: [-86.80, 21.15], zoom: 11, pitch: 0, speed: 0.5 });
            break;

        case '7':
            // Step 7: PLAN MAESTRO (Sticky)
            // Ocultamos mapa/video para ver la imagen del plan
            switchGlobalLayer('none');
            break;
        case '8':
            // Step 8: TEXTO 1970
            switchGlobalLayer('map');
            map.flyTo({ center: [-86.82, 21.14], zoom: 11, pitch: 0, speed: 0.5 });
            break;
        case '9':
            // Step 9: VIDEO + TARJETA
            switchGlobalLayer('video2');
            const sandVid = document.getElementById('sand-video');
            if(sandVid) sandVid.play().catch(()=>{});
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

    // LÓGICA STEP 7: Tarjeta Azul Progresiva
    if (step === '7') {
        const card = element.querySelector('.blue-card');
        
        if (card) {
            let opacity = 0;
            let moveY = 0;

            // FASE 1: ENTRADA (Del 10% al 30% del scroll)
            // La tarjeta aparece y sube a su posición original
            if (progress < 0.3) {
                // Normalizamos el progreso de 0.1 a 0.3 en un rango de 0 a 1
                let enterProgress = (progress - 0.1) / 0.2;
                if (enterProgress < 0) enterProgress = 0;
                if (enterProgress > 1) enterProgress = 1;

                opacity = enterProgress; 
                // Empieza 50px abajo y llega a 0px (su sitio)
                moveY = 50 - (enterProgress * 50); 
            }
            
            // FASE 2: LECTURA (Del 30% al 50%)
            // Se queda quieta para que el usuario lea
            else if (progress >= 0.3 && progress < 0.5) {
                opacity = 1;
                moveY = 0;
            }

            // FASE 3: SALIDA (Del 50% al 100%)
            // Simula el scroll: la tarjeta se va hacia arriba hasta salir
            else {
                // Normalizamos el progreso de 0.5 a 1.0
                let exitProgress = (progress - 0.5) / 0.5;
                
                // Opacidad: Se desvanece un poco al final para ser sutil
                opacity = 1 - (exitProgress * 0.5); 
                
                // Movimiento: Se va hacia arriba (negativo). 
                // -600px suele ser suficiente para sacarla de la pantalla en laptops/móviles
                moveY = -600 * exitProgress; 
            }

            // APLICAMOS LOS CAMBIOS
            card.style.opacity = opacity;
            card.style.transform = `translateY(${moveY}px)`;
        }
    }

    // LÓGICA STEP 9: Tarjeta Arena
    if (step === '9') {
        const card = element.querySelector('.sand-card');
        
        if (card) {
            let opacity = 0;
            let moveY = 0;

            // FASE 1: ENTRADA (0.1 a 0.3)
            if (progress < 0.3) {
                let enterProgress = (progress - 0.1) / 0.2;
                if (enterProgress < 0) enterProgress = 0;
                if (enterProgress > 1) enterProgress = 1;

                opacity = enterProgress; 
                moveY = 50 - (enterProgress * 50); 
            }
            // FASE 2: LECTURA (0.3 a 0.6 - un poco más largo)
            else if (progress >= 0.3 && progress < 0.6) {
                opacity = 1;
                moveY = 0;
            }
            // FASE 3: SALIDA (0.6 a 1.0)
            else {
                let exitProgress = (progress - 0.6) / 0.4;
                opacity = 1 - (exitProgress * 0.5); 
                moveY = -600 * exitProgress; 
            }

            card.style.opacity = opacity;
            card.style.transform = `translateY(${moveY}px)`;
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