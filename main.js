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
            // Step 9: VIDEO STICKY + TARJETA
            switchGlobalLayer('video2');
            const sandVid = document.getElementById('sand-video');
            if(sandVid) sandVid.play().catch(()=>{});
            break;
        case '10':
            // Step 10: TEXTO 1970-1973
            switchGlobalLayer('map');
            map.flyTo({ center: [-86.85, 21.16], zoom: 10, pitch: 0, speed: 0.5 });
            break;
        case '11':
            // Step 11: IMAGEN SUPERMANZANAS
            switchGlobalLayer('none');

            // Forzamos el reset cada vez que se entra al paso
            const wrapper = element.querySelector('.zoom-wrapper');
            const box = element.querySelector('.sm-highlight-box');
            const caption = element.querySelector('.sm-caption-box');

            if (wrapper) wrapper.style.transform = 'scale(1) translate3d(0,0,0)'; // Reset Zoom
            if (box) box.classList.remove('is-visible'); // Ocultar caja
            if (caption) caption.classList.remove('is-visible'); // Ocultar texto
            break;
        case '12':
            // Step 12: 1972
            switchGlobalLayer('map');
            map.flyTo({ center: [-86.85, 21.16], zoom: 10, pitch: 0, speed: 0.5 });
            break;
        case '13':
            switchGlobalLayer('none');
            const polaroids = element.querySelectorAll('.polaroid-wrapper');
            
            // LÓGICA INTELIGENTE DE ENTRADA
            if (direction === 'down') {
                // A. VINIENDO DESDE ARRIBA (Normal)
                // Reseteamos todo para que empiece la animación de cero
                polaroids.forEach(p => p.classList.remove('is-visible', 'do-flash'));
            } 
            else {
                // B. VINIENDO DESDE ABAJO (Regresando del Step 14)
                polaroids.forEach(p => {
                    p.classList.add('is-visible'); // Forzamos que se vean
                    p.classList.remove('do-flash'); // Aseguramos que NO haya flash
                });
            }
            break;
        default:
            switchGlobalLayer('none');
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

    // LÓGICA STEP 7: PLAN MAESTRO (Péndulo + Pausa + Texto + Lectura)
    if (step === '7') {
        const img = element.querySelector('.scrapbook-image');
        const card = element.querySelector('.blue-card');

        // --- FASE 1: CAÍDA DE IMAGEN (0% al 45%) ---
        // Acortamos un poco la caída para dejar más tiempo al final
        const fallLimit = 0.45; 

        if (img) {
            if (progress < fallLimit) {
                const phasePct = progress / fallLimit; 

                // Movimiento Y
                const startY = -150; 
                const endY = 0;
                const currentY = startY + (phasePct * (endY - startY));

                // Péndulo
                const amplitude = 15; 
                const decay = (1 - phasePct); 
                const currentRot = amplitude * decay * Math.cos(phasePct * Math.PI * 4);

                img.style.transform = `translate3d(0, ${currentY}%, 0) rotate(${currentRot}deg)`;
            } 
            else {
                // FASE 2: IMAGEN QUIETA (45% en adelante)
                // Se mantiene firme el resto del paso
                img.style.transform = `translate3d(0, 0%, 0) rotate(0deg)`;
            }
        }

        // --- FASE 3: TEXTO Y LECTURA (60% al 100%) ---
        if (card) {
            // Empezamos a mostrar el texto al 60%
            const textStart = 0.60;
            // Terminamos de mostrarlo al 85% (dejando el último 15% solo para leer)
            const textEnd = 0.85;
            
            if (progress > textStart) {
                // Calculamos opacidad entre 0 y 1
                let cardProgress = (progress - textStart) / (textEnd - textStart);
                
                // --- CLAVE: ZONA DE LECTURA ---
                // Si cardProgress pasa de 1 (es decir, estamos en el tramo 85%-100%),
                // lo topamos a 1. Así el texto se queda visible y quieto.
                if (cardProgress > 1) cardProgress = 1;

                card.style.opacity = cardProgress;
                // Entrada suave hacia arriba
                card.style.transform = `translateY(${30 - (cardProgress * 30)}px)`;
            } else {
                // Oculto antes del 60%
                card.style.opacity = 0;
                card.style.transform = `translateY(30px)`;
            }
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

    // LÓGICA STEP 11: Pausa -> Zoom -> Recuadro
    if (step === '11') {
        const wrapper = element.querySelector('.zoom-wrapper');
        const box = element.querySelector('.sm-highlight-box');

        // 1. Capturamos el nuevo elemento
        const caption = element.querySelector('.sm-caption-box');

        if (wrapper && box) {
            
            const maxScale = 2; 
            const panX = -320; 
            const panY = 100; 

            let scale = 1;
            let currentPanX = 0;
            let currentPanY = 0;

            // FASE 0: VER LA IMAGEN (0% a 25%)
            // Aquí no pasa nada, solo ves el plano completo.
            if (progress < 0.25) {
                scale = 1;
                currentPanX = 0;
                currentPanY = 0;
                showOverlays = false;
            }

            // FASE 1: HACIENDO ZOOM (25% a 60%)
            // Calculamos la transición
            else if (progress >= 0.25 && progress < 0.6) {
                // Normalizamos de 0 a 1 dentro de este tramo
                const phaseProgress = (progress - 0.25) / 0.35; 
                
                scale = 1 + (phaseProgress * (maxScale - 1));
                currentPanX = phaseProgress * panX;
                currentPanY = phaseProgress * panY;
                showOverlays = false; // Aún no mostramos texto
            }
            
            // FASE 2: LECTURA / HOLD (60% en adelante)
            // Ya llegamos al zoom máximo, mostramos el texto.
            else {
                scale = maxScale;
                currentPanX = panX;
                currentPanY = panY;
                showOverlays = true; // Aparece texto y cuadro
            }

            // APLICAMOS LOS CAMBIOS
            wrapper.style.transform = `translate3d(${currentPanX}px, ${currentPanY}px, 0) scale(${scale})`;
            
            // GESTIÓN DE CLASES (TEXTO Y CUADRO)
            if (showOverlays) {
                box.classList.add('is-visible');
                if (caption) caption.classList.add('is-visible');
            } else {
                box.classList.remove('is-visible');
                if (caption) caption.classList.remove('is-visible');
            }
        }
    }

    // LÓGICA STEP 13: Secuencia Flash Polaroid
    if (step === '13') {
        // Seleccionamos las 3 fotos por ID
        const p1 = element.querySelector('#pol-1');
        const p2 = element.querySelector('#pol-2');
        const p3 = element.querySelector('#pol-3');

        if (p1 && p2 && p3) {
            // FASE 1: FOTO 1 (Izquierda) - Aparece al 15%
            if (progress > 0.15) {
                if (!p1.classList.contains('is-visible')) {
                    p1.classList.add('is-visible', 'do-flash');
                }
            } else {
                // Si regresamos hacia arriba, ocultamos
                p1.classList.remove('is-visible', 'do-flash');
            }

            // FASE 2: FOTO 2 (Centro) - Aparece al 40%
            if (progress > 0.40) {
                if (!p2.classList.contains('is-visible')) {
                    p2.classList.add('is-visible', 'do-flash');
                }
            } else {
                p2.classList.remove('is-visible', 'do-flash');
            }

            // FASE 3: FOTO 3 (Derecha) - Aparece al 70%
            if (progress > 0.70) {
                if (!p3.classList.contains('is-visible')) {
                    p3.classList.add('is-visible', 'do-flash');
                }
            } else {
                p3.classList.remove('is-visible', 'do-flash');
            }
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