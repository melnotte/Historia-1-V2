// --- CONFIGURACIÓN ---
mapboxgl.accessToken = 'pk.eyJ1IjoiMHhqZmVyIiwiYSI6ImNtZjRjNjczdTA0MGsya3Bwb3B3YWw4ejgifQ.8IZ5PTYktl5ss1gREda3fg';

// VARIABLES GLOBALES PARA SUAVIZADO DE VIDEO
let sandVideoTarget = 0;   // Objetivo del scroll
let sandVideoCurrent = 0;  // Posición actual suavizada
let isStep9Active = false; // Interruptor del motor

// 1. Inicializar Mapa
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11', 
    center: [-86.85, 21.16], 
    zoom: 10,
    interactive: true,
    cooperativeGestures: false,
    scrollZoom: false,
    touchZoomRotate: true,  //(permite zoom/rotar con 2 dedos)
    dragPan: true,          
    doubleClickZoom: true,  
    dragRotate: false
});

map.addControl(new mapboxgl.NavigationControl({
    showCompass: true, // Muestra la brújula 
    showZoom: true     // Muestra botones + y -
}), 'bottom-right');

map.on('load', () => {

    // 1. CARGAR FUENTE
    map.addSource('src-cambio-poblacional', {
        type: 'geojson',
        // Asegúrate que la ruta sea correcta en tu carpeta actual
        data: 'data/cambio-poblacional.geojson' 
    });

    // 2. AGREGAR CAPA BASE (Rampa Verde Monocromática)
    map.addLayer({
        id: 'layer-cambio-poblacional',
        type: 'fill',
        source: 'src-cambio-poblacional',
        layout: { 'visibility': 'visible' },
        paint: {
            // RAMPA EXACTA DEL PROYECTO ANTERIOR (Expresión 'step')
            'fill-color': [
                'step',
                ['coalesce', ['to-number', ['get', 'p100_dife_pob']], 0], // Manejo de nulos
                '#f7fcf5',      // <= -75 (Pérdida intensa)
                -75, '#e5f5e0', // -75 a -50
                -50, '#c7e9c0', // -50 a -25
                -25, '#a1d99b', // -25 a 0
                0,   '#74c476', // 0 a 25
                25,  '#41ab5d', // 25 a 50
                50,  '#238b45', // 50 a 75
                75,  '#006d2c', // 75 a 100
                100, '#00441b'  // >= 100 (Expansión acelerada)
            ],
            'fill-opacity': 0, // Empieza invisible, GSAP lo subirá a 0.85
            'fill-outline-color': '#ffffff' // Borde blanco como en el original
        }
    });

    // 3. AGREGAR CAPA DE HUELLA URBANA (Overlay para el scroll)
    map.addSource('src-geo', {
        type: 'geojson',
        data: 'data/geo.json'
    });

    map.addLayer({
        id: 'layer-geo',
        type: 'fill',
        source: 'src-geo',
        layout: { 'visibility': 'visible' },
        paint: {
            'fill-color': '#023047', // Un azul oscuro/negro para contrastar con los verdes
            'fill-opacity': 0        // Empieza invisible
        }
    });

    // 4. TOOLTIP
    const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 20
    });

    // Usamos 'mousemove' para que el popup siga al cursor dentro del polígono
    map.on('mousemove', 'layer-cambio-poblacional', (e) => {
        
        // A. Verificar visibilidad
        const opacity = map.getPaintProperty('layer-cambio-poblacional', 'fill-opacity');
        if (opacity < 0.1 || !e.features.length) return;

        // B. Cambiar cursor
        map.getCanvas().style.cursor = 'pointer';

        // C. Extraer datos
        const props = e.features[0].properties;
        const pob2020 = Number(props.POBTOT || props.Pob2020 || 0);
        const pob2010 = Number(props.Pob2010 || 0);
        // Cálculo de porcentaje seguro
        const difPct = Number(props.p100_dife_pob || ((pob2010 !== 0) ? ((pob2020 - pob2010) / pob2010) * 100 : 0));

        // D. Definir color dinámico para el porcentaje
        const colorPct = difPct >= 0 ? '#238b45' : '#C1121F'; // Verde si crece, Rojo si decrece

        // E. HTML con las NUEVAS CLASES (popup-header, popup-data, etc.)
        const html = `
            <div class="popup-header">AGEB ${props.CVE_AGEB || props.cvegeo || ''}</div>
            
            <div class="popup-data" style="color: ${colorPct}">
                ${difPct > 0 ? '+' : ''}${difPct.toFixed(1)}%
            </div>
            
            <div class="popup-label">Cambio 2010-2020</div>
            
            <div style="margin-top: 8px; font-size: 11px; color: #555; border-top: 1px solid #eee; padding-top: 4px;">
                <strong>2010:</strong> ${pob2010.toLocaleString()}<br>
                <strong>2020:</strong> ${pob2020.toLocaleString()}
            </div>
        `;

        // F. Renderizar
        popup.setLngLat(e.lngLat)
             .setHTML(html)
             .addTo(map);
    });

    // Limpieza al salir
    map.on('mouseleave', 'layer-cambio-poblacional', () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
    });
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
    const legend21 = document.getElementById('legend-step-21');

    if (step !== '21') {
        if (legend21) {
            legend21.style.opacity = '0';
            legend21.style.pointerEvents = 'none';
        }
    }

    // Activar estilo visual del texto
    document.querySelectorAll('.step').forEach(s => s.classList.remove('is-active'));
    element.classList.add('is-active');

    // --- LÓGICA DE LA HISTORIA ---
    switch (step) {
        case '1':
            switchGlobalLayer('video');
            const vid = document.getElementById('hero-video');
            if(vid) vid.play().catch(()=>{});

            const legendForce = document.getElementById('legend-step-21');
            if (legendForce) {
                legendForce.style.opacity = '0';
                legendForce.style.pointerEvents = 'none';
                legendForce.style.transition = 'none'; 
                
                setTimeout(() => {
                    legendForce.style.transition = 'opacity 0.5s ease';
                }, 100);
            }

            if (map.getLayer('layer-cambio-poblacional')) {
                map.setPaintProperty('layer-cambio-poblacional', 'fill-opacity', 0);
            }
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
            // Step 6: TEXTO 1968-1971
            switchGlobalLayer('map');
            map.flyTo({ center: [-86.80, 21.15], zoom: 11, pitch: 0, speed: 0.5 });
            break;

        case '7':
            // Step 7: PLAN MAESTRO (Sticky)
            // Ocultamos mapa/video para ver la imagen del plan
            switchGlobalLayer('none');
            break;
        case '8':
            isStep9Active = false; // APAGAR MOTOR si venimos de abajo
            switchGlobalLayer('map');
            map.flyTo({ center: [-86.82, 21.14], zoom: 11, pitch: 0 });
            break;

        case '9':
            // Step 9: ENCENDER MOTOR
            switchGlobalLayer('video2');
            const sandVid = document.getElementById('sand-video');
            
            if (sandVid) {
                sandVid.pause(); // Aseguramos que no se reproduzca solo

                // --- LÓGICA DE DIRECCIÓN ---
                if (response.direction === 'down') {
                    // Si bajamos (venimos del paso 8), empezamos en 0
                    sandVid.currentTime = 0;
                    sandVideoTarget = 0;
                    sandVideoCurrent = 0;
                } else {
                    // Si subimos (venimos del paso 10), empezamos al FINAL del video
                    if (sandVid.duration) {
                        // Restamos 0.1s para asegurar que se vea imagen
                        const endPos = sandVid.duration - 0.1;
                        sandVid.currentTime = endPos;
                        sandVideoTarget = endPos;
                        sandVideoCurrent = endPos;
                    }
                }
            }
            
            // Arrancar el loop si no está prendido
            if (!isStep9Active) {
                isStep9Active = true;
                sandVideoLoop(); 
            }
            break;

        case '10':
            isStep9Active = false; // APAGAR MOTOR si seguimos bajando
            switchGlobalLayer('map');
            map.flyTo({ center: [-86.85, 21.16], zoom: 10 });
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
        case '14':
            // Step 14: AEROPUERTO
            // Ocultamos el mapa de fondo para que se vean las imágenes del aeropuerto
            switchGlobalLayer('none');
            break;
        case '15':
            // Step 15: TEXTO AEROPUERTO
            switchGlobalLayer('none');
            break;

        case '16':
            // Step 16: PUENTE POBLACIÓN & PANEO 
            switchGlobalLayer('none');
            break;
        case '17':
            // Step 17: TEXTO 1970-1980
            switchGlobalLayer('none');
            break;
        // El usuario scrollea por la sección de puntos. Scrollama espera hasta el 18.
       case '18':
            switchGlobalLayer('map');
            map.flyTo({ 
                center: [-86.8475, 21.1619],
                zoom: 11, pitch: 0, speed: 1.2
            }); 
            break;
        case '19':
            // Step 19: RESILIENCIA
            switchGlobalLayer('none');
            
            // Si el usuario regresa subiendo, reseteamos posición
            if (response.direction === 'up') {
            }
            break;
        case '20':
            switchGlobalLayer('none');
            break;
        case '21':
            switchGlobalLayer('map');
            
            map.flyTo({ 
                center: [-86.85, 21.16], 
                zoom: 11, 
                pitch: 0 
            });

            if (map.getLayer('layer-cambio-poblacional')) {
                map.setPaintProperty('layer-cambio-poblacional', 'fill-opacity', 0.85);
            }
            if (map.getLayer('layer-geo')) {
                map.setPaintProperty('layer-geo', 'fill-opacity', 0);
            }

            const closingLayer21 = document.getElementById('closing-layer');
            if (closingLayer21) closingLayer21.style.opacity = '0';
            
            // ENCENDER LEYENDA
            if (legend21) {
                legend21.style.opacity = '1';
                legend21.style.pointerEvents = 'auto';
            }
            break;

        case '22':
            switchGlobalLayer('map');
            break;
        default:
            isStep9Active = false;
            switchGlobalLayer('none');

            if (document.getElementById('closing-layer')) {
                document.getElementById('closing-layer').style.opacity = '0';
            }
    }
}

// B. Evento: Progreso dentro del paso (Para el efecto de imagen)
function handleStepProgress(response) 
    {const { element, progress } = response;
    const step = element.dataset.step;
    
    // LÓGICA STEP 3 Y 14: Imágenes Sticky con Overlay
    if (step === '3' || step === '14') {
        
        // Seleccionamos el contenedor "sticky" dentro del step actual (sea el 3 o el 14)
        const stickyItem = element.querySelector('.sticky-item');
        
        if (stickyItem) {
            // Lógica de Trigger (Umbral 30%)
            if (progress > 0.3) {
                stickyItem.classList.add('show-overlay');
            } else {
                stickyItem.classList.remove('show-overlay');
            }
        }
    }

    // LÓGICA STEP 5: Zoom -> Secuencia de Subrayado -> Caption
    if (step === '5') {
        const wrapper = element.querySelector('.doc-wrapper');
        const caption = element.querySelector('.doc-caption');
        const lines = element.querySelectorAll('.hl-line');

        if (wrapper) {
            const width = window.innerWidth;
            
            // 1. DETECCIÓN DE DISPOSITIVO
            const isMobile = width < 768;
            const isTablet = width >= 768 && width < 1024;

            // 2. CONFIGURACIÓN DE MOVIMIENTO
            // ---------------------------------------------
            
            // ESCALA (ZOOM):
            const startScale = isMobile ? 0.18 : 0.33; 
            
            let endScale = 1; 
            if (isMobile) endScale = 0.42;
            else if (isTablet) endScale = 0.65;

            // PANEO VERTICAL (Y):
            let endPanY = -32; 
            if (isMobile) endPanY = -10;
            else if (isTablet) endPanY = -18;

            // PANEO HORIZONTAL (X):
            // Desktop: 0 (Centrado)
            // Tablet: 15 (Empuje medio)
            // Móvil: 8 (Empuje sutil)
            let endPanX = 0; 
            
            if (isMobile) {
                endPanX = 8;
            } else if (isTablet) {
                endPanX = 15; 
            }

            // 3. TIMELINE
            // ---------------------------------------------

            // FASE 1: MOVIMIENTO (0% - 40%)
            const moveProgress = normalize(progress, 0.0, 0.40);
            
            const currentScale = startScale + (moveProgress * (endScale - startScale));
            const currentPanY = (moveProgress * endPanY); 
            const currentPanX = (moveProgress * endPanX); 
            
            wrapper.style.transform = `translate3d(${currentPanX}%, ${currentPanY}%, 0) scale(${currentScale})`;

            // FASE 2: SUBRAYADO (40% - 70%)
            const drawProgress = normalize(progress, 0.40, 0.70);
            if (lines.length > 0) {
                const totalLines = lines.length;
                lines.forEach((line, index) => {
                    const lineStart = index / totalLines;
                    const lineEnd = (index + 1) / totalLines;
                    let lineScale = normalize(drawProgress, lineStart, lineEnd);
                    line.style.transform = `scaleX(${lineScale})`;
                });
            }

            // FASE 3: CAPTION (70% - 85%)
            const captionProgress = normalize(progress, 0.70, 0.85);
            if (caption) {
                caption.style.opacity = captionProgress;
                caption.style.transform = `translateX(-50%) translateY(${20 - (captionProgress * 20)}px)`;
            }
            
            // FASE 4: FREEZE (85% - 100%)
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

    // LÓGICA STEP 9
    if (step === '9') {
        const vid = document.getElementById('sand-video');
        const card = element.querySelector('.sand-card');

        // 1. SOLO ACTUALIZAMOS EL OBJETIVO
        if (vid && vid.duration) {
            sandVideoTarget = vid.duration * progress;
        }

        // 2. TARJETA
        if (card) {
            let opacity = 0;
            let moveY = 0;

            if (progress < 0.3) {
                let enterProgress = (progress - 0.1) / 0.2;
                if (enterProgress < 0) enterProgress = 0; 
                if (enterProgress > 1) enterProgress = 1;
                opacity = enterProgress; 
                moveY = 50 - (enterProgress * 50); 
            }
            else if (progress >= 0.3 && progress < 0.6) {
                opacity = 1;
                moveY = 0;
            }
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
        const caption = element.querySelector('.sm-caption-box');

        if (wrapper && box) {
            
            // --- 1. CONFIGURACIÓN DE ZOOM Y PANEO ---
            const maxScale = 1.8; 
            
            // Ajustamos coordenadas (%)
            // panX negativo mueve la imagen a la IZQUIERDA (para ver cosas a la derecha)
            const panX = -25; 
            // panY positivo baja la imagen (para ver cosas que están arriba)
            const panY = 10;   

            let scale = 1;
            let currentPanX = 0;
            let currentPanY = 0;
            let showOverlays = false;

            // FASE 0: VER LA IMAGEN (0% a 25%)
            if (progress < 0.25) {
                scale = 1;
                currentPanX = 0;
                currentPanY = 0;
                showOverlays = false;
            }
            // FASE 1: HACIENDO ZOOM (25% a 60%)
            else if (progress >= 0.25 && progress < 0.6) {
                const phaseProgress = (progress - 0.25) / 0.35; 
                scale = 1 + (phaseProgress * (maxScale - 1));
                currentPanX = phaseProgress * panX;
                currentPanY = phaseProgress * panY;
                showOverlays = false; 
            }
            // FASE 2: LECTURA / HOLD (60% en adelante)
            else {
                scale = maxScale;
                currentPanX = panX;
                currentPanY = panY;
                showOverlays = true; 
            }

            // APLICAMOS TRANSFORMACIÓN
            wrapper.style.transform = `translate3d(${currentPanX}%, ${currentPanY}%, 0) scale(${scale})`;
            
            // GESTIÓN DE VISIBILIDAD (Overlay y Texto)
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
    // LÓGICA STEP 16: Paneo Puente Población
    if (step === '16') {
        const wrapper = element.querySelector('.pop-content-wrapper');
        const textCol = element.querySelector('.pop-text-col');

        if (wrapper) {
            // FASE 1: PANEO DE ENTRADA (0% - 50%)
            // Trae todo el bloque desde la derecha hacia el centro
            const panProgress = normalize(progress, 0.0, 0.5);
            
            const startX = 50; // Empieza 50% desplazado a la derecha
            const endX = 0;    // Termina en 0% (Centro)
            const currentX = startX - (panProgress * startX);

            wrapper.style.opacity = panProgress; 
            wrapper.style.transform = `translateX(${currentX}%)`;

            // FASE 2: FADE DEL TEXTO (40% - 100%)
            if (textCol) {
                // Entrada (Fade In)
                if (progress < 0.4) {
                    textCol.style.opacity = 0;
                } else if (progress >= 0.4 && progress < 0.9) {
                    textCol.style.opacity = normalize(progress, 0.4, 0.6);
                } 
                // Salida (Fade Out al terminar el paso)
                else {
                    textCol.style.opacity = 1 - normalize(progress, 0.9, 1.0);
                }
            }
        }
    }

    // LÓGICA STEP 19: Texto subiendo (Scroll vertical)
    if (step === '19') {
        const textContent = element.querySelector('.sliding-content');
        
        if (textContent) {
            // RANGO DE ANIMACIÓN:
            const startY = 100; // Empieza abajo (oculto)
            
            // 30% para asegurar que suba lo suficiente y se vea el final
            const endY = -20;   
            
            // Interpolación Lineal
            const currentY = startY - (progress * (startY - endY));
            
            textContent.style.transform = `translateY(${currentY}%)`;
            
            // Opacidad inicial suave
            if (progress < 0.1) {
                textContent.style.opacity = progress * 10;
            } else {
                textContent.style.opacity = 1;
            }
        }
    }
    //LÓGICA STEP 22: CIERRE
    if (step === '22') {
        const closingLayer = document.getElementById('closing-layer');
        const legend = document.getElementById('legend-step-21');
        
        if (closingLayer) {
            let opacityVal = normalize(progress, 0, 0.3); 
            
            if (opacityVal > 1) opacityVal = 1;
            closingLayer.style.opacity = opacityVal;

            // La leyenda desaparece
            if (legend) {
                legend.style.opacity = Math.max(0, 1 - (progress * 10));
            }
        }
    }
}

// Convierte un rango global (ej. 0.2 a 0.8) en un valor 0 a 1
function normalize(value, min, max) {
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
}
// El motor de suavizado (Loop infinito cuando el paso 9 está activo)
const EASE_FACTOR = 0.08; 

function sandVideoLoop() {
    if (!isStep9Active) return;

    const vid = document.getElementById('sand-video');
    
    // Verificamos readyState para evitar errores si no ha cargado
    if (vid && vid.readyState >= 1) {
        // Interpolación lineal (LERP)
        sandVideoCurrent += (sandVideoTarget - sandVideoCurrent) * EASE_FACTOR;

        // Solo actualizamos si el cambio es visible (ahorra CPU)
        if (Math.abs(sandVideoTarget - sandVideoCurrent) > 0.005) {
            vid.currentTime = sandVideoCurrent; 
        }
    }

    requestAnimationFrame(sandVideoLoop);
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

// ======================================================
// ZONA GSAP (Puntos + Step 18 + Step 20 + Step 21)
// ======================================================

if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    
    // 1. REGISTRO ÚNICO DEL PLUGIN
    gsap.registerPlugin(ScrollTrigger);

    // ------------------------------------------------------
    // A. LÓGICA DE PUNTOS
    // ------------------------------------------------------
    const contenedor = document.getElementById('visualizacion-puntos');
    const contador = document.getElementById('contador-puntos');
    const overlay = document.querySelector('.overlay-circle');
    const PERSONS_PER_DOT = 1000;

    if (contenedor) {
        
        const sections = document.querySelectorAll('#narrativa-dots .narrativa');
        const total = Array.from(sections).reduce((acc, el) => acc + parseInt(el.dataset.dots || '0', 10), 0);
        
        // Creación de puntos DOM
        const puntos = [];
        for (let i = 0; i < total; i++) {
            const d = document.createElement('div');
            d.className = 'punto';
            contenedor.appendChild(d);
            puntos.push(d);
        }

        // Variables de datos
        let offset = 0;
        const hudYear = document.getElementById('hud-year');
        const percentageDisplay = document.getElementById('percentage-display');
        const personsByDecade = [6867, 37190, 176765, 419815, 659311, 911503];
        
        // Cálculos de grilla
        const cw = contenedor.clientWidth;
        const ch = contenedor.clientHeight;
        const colsTotal = Math.ceil(Math.sqrt(total * cw / ch));
        const rowsTotal = Math.ceil(total / colsTotal);
        const cellWTotal = cw / colsTotal;
        const cellHTotal = ch / rowsTotal;
        const DOT_SIZE = 10;
        const finalScale = Math.min(cellWTotal, cellHTotal) / DOT_SIZE * 0.75;

        // Posicionamiento inicial
        for (let i = 0; i < total; i++) {
            const c = i % colsTotal;
            const r = Math.floor(i / colsTotal);
            const x = Math.round((c + 0.5) * cellWTotal - cw / 2);
            const y = Math.round((r + 0.5) * cellHTotal - ch / 2);
            gsap.set(puntos[i], { x, y });
        }

        // Orden de llenado
        const order = [];
        for (let c = 0; c < colsTotal; c++) {
            for (let r = rowsTotal - 1; r >= 0; r--) {
                const idx = r * colsTotal + c;
                if (idx < total) order.push(idx);
            }
        }

        const palette = ['#780000','#C1121F','#FDF0D5','#003049','#669BBC'];

        // Loop de animaciones por sección
        sections.forEach((seccion, index) => {
            const cantidad = parseInt(seccion.dataset.dots || '0', 10);
            const subset = order.slice(offset, offset + cantidad).map(i => puntos[i]);
            const startScale = index === 0 ? 0.55 : 0.85;
            const endScale = index === 0 ? 0.85 : 1.15;
            const color = palette[index] ?? palette[index % palette.length];
            const isLast = index === sections.length - 1;

            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: seccion,
                    start: isLast ? 'top top' : 'top center',
                    end: isLast ? 'bottom bottom' : 'bottom bottom',
                    endTrigger: isLast ? document.querySelector('.layout-dots') : undefined,
                    scrub: true,
                    pin: isLast,
                    pinSpacing: true,
                    onEnter: () => { if (hudYear) { const h = seccion.querySelector('h2'); hudYear.textContent = h ? h.textContent : String(1970 + index*10); } },
                    onLeave: () => { if (contador) { const persons = (personsByDecade[index] || cantidad * PERSONS_PER_DOT); contador.textContent = persons.toLocaleString('es-MX'); } },
                    onLeaveBack: () => { if (contador) { contador.textContent = '0'; } },
                    onEnterBack: () => { if (hudYear) { const h = seccion.querySelector('h2'); hudYear.textContent = h ? h.textContent : String(1970 + index*10); } }
                }
            });

            tl.to(subset, { opacity: 1, scale: finalScale, backgroundColor: color, duration: 1, stagger: { each: 0.004 }, ease: 'none' }, 0);
            tl.fromTo(overlay, { scale: startScale }, { scale: endScale, duration: 1, ease: 'none' }, 0);
            
            tl.eventCallback('onUpdate', () => {
                const p = tl.progress();
                const targetPersonsExact = personsByDecade[index] || (cantidad * PERSONS_PER_DOT);
                const persons = Math.round(targetPersonsExact * p);
                if (contador) contador.textContent = persons.toLocaleString('es-MX');
                if (percentageDisplay) {
                    const prevExact = personsByDecade.slice(0, index).reduce((a, b) => a + b, 0);
                    const growth = prevExact > 0 ? (targetPersonsExact / prevExact) - 1 : 0;
                    const pct = Math.round(Math.max(0, growth) * 100 * p);
                    percentageDisplay.textContent = `+${pct}%`;
                }
            });
            offset += cantidad;
        });

        // Resize Listener para Puntos
        window.addEventListener('resize', () => {
            const cw2 = contenedor.clientWidth;
            const ch2 = contenedor.clientHeight;
            const cols2 = Math.ceil(Math.sqrt(total * cw2 / ch2));
            const rows2 = Math.ceil(total / cols2);
            const cellW2 = cw2 / cols2;
            const cellH2 = ch2 / rows2;
            for (let i = 0; i < total; i++) {
                const c = i % cols2;
                const r = Math.floor(i / cols2);
                const x = Math.round((c + 0.5) * cellW2 - cw2 / 2);
                const y = Math.round((r + 0.5) * cellH2 - ch2 / 2);
                gsap.set(puntos[i], { x, y });
            }
            ScrollTrigger.refresh();
        });
    }

    // ------------------------------------------------------
    // B. LÓGICA DE EXPANSIÓN (Step 18 - Secuencial)
    // ------------------------------------------------------
    const stepExpansion = document.querySelector("#step-expansion");

    if (stepExpansion) {
        const tlExpansion = gsap.timeline({
            scrollTrigger: {
                trigger: "#step-expansion",
                start: "top top",
                end: "+=6000",
                pin: true,
                scrub: 1
            }
        });

        // 1. Desaparece texto inicial
        tlExpansion.to('#step-expansion .text-layer', { 
            opacity: 0, 
            y: -40, 
            duration: 3 
        });

        // 2. Aparecen imágenes una por una
        const expImgIds = ['#exp-84', '#exp-90', '#exp-00', '#exp-10', '#exp-20'];
        expImgIds.forEach((id) => {
            tlExpansion.to(id, {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 4,
                ease: "power2.out"
            }, "+=0.2"); // El scroll activa cada una secuencialmente
        });

        // 3. Espacio de observación (scroll vacío)
        tlExpansion.to({}, { duration: 2 });

        // 4. Transición a texto final
        tlExpansion.to('.expansion-gallery', { 
            opacity: 0.2, 
            filter: "blur(4px)", 
            duration: 3 
        }, "final");

        tlExpansion.to('#step-expansion .final-text-layer', { 
            opacity: 1, 
            y: 0, 
            duration: 4,
            onStart: () => gsap.set('#step-expansion .final-text-layer', { pointerEvents: "auto" })
        }, "final");

        // 5. Salida del paso
        tlExpansion.to('#step-expansion .step-content', { opacity: 0, duration: 4 }, "+=4");
    }

    // ------------------------------------------------------
    // C. LÓGICA STEP 20: FOREST LOSS (Horizontal/Vertical)
    // ------------------------------------------------------
    const stepForest = document.getElementById('step-forest-loss');

    if (stepForest) {
        
        const tlForest = gsap.timeline({
            scrollTrigger: {
                trigger: "#step-forest-loss",
                start: "center center", // Cuando el centro del step llega al centro de la pantalla
                end: "+=2000",          // Duración virtual del scroll (qué tanto debo scrollear para terminar)
                pin: true,              // Fija la sección en pantalla
                scrub: 1,               // Suaviza la animación (1 segundo de lag)
                anticipatePin: 1
            }
        });

        // SECUENCIA DE ANIMACIÓN:
        
        // 1. Aparece 2000 (desde abajo y transparente)
        tlForest.to(".card-2000", {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power2.out"
        })
        
        // Pequeña pausa de lectura visual
        .to({}, { duration: 0.2 }) 

        // 2. Aparece 2010
        .to(".card-2010", {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power2.out"
        })

        // Pausa
        .to({}, { duration: 0.2 })

        // 3. Aparece 2020
        .to(".card-2020", {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power2.out"
        })

        // 4. Pausa final para observar las tres juntas antes de desanclar
        .to({}, { duration: 1 });
    }

    // ------------------------------------------------------
    // D. LÓGICA STEP 21: PINTAR MAPA + SECUENCIA DE TEXTO
    // ------------------------------------------------------
    const stepMap = document.querySelector("#step-map-compare");

    if (stepMap) {
        const cards = document.querySelectorAll('.story-card');

        ScrollTrigger.create({
            trigger: "#step-map-compare",
            start: "top top",      
            end: "bottom bottom",  
            scrub: true,           
            
            onUpdate: (self) => {
                const p = self.progress; 

                // --- 1. LÓGICA DEL MAPA ---
                
                // A) Si existe la capa de Población, aseguramos que se vea
                if (map.getLayer('layer-cambio-poblacional')) {
                    map.setPaintProperty('layer-cambio-poblacional', 'fill-opacity', 0.85);
                }

                // B) Si existe otra capa
                if (map.getLayer('layer-geo')) {
                    map.setPaintProperty('layer-geo', 'fill-opacity', p * 0.6);
                }

                // --- 2. LÓGICA DE TEXTO (Tarjetas) ---
                // Se activan según el tercio del recorrido (0-33%, 33-66%, 66-100%)
                
                cards.forEach(c => c.classList.remove('is-active'));

                if (p < 0.33) {
                    if(cards[0]) cards[0].classList.add('is-active');
                } else if (p < 0.66) {
                    if(cards[1]) cards[1].classList.add('is-active');
                } else {
                    if(cards[2]) cards[2].classList.add('is-active');
                }
            },
            
            // --- GESTIÓN DE LEYENDA ---
            onEnter: () => {
                const legend = document.getElementById('legend-step-21');
                if(legend) legend.style.opacity = '1';
            },
            
            // Se queda visible para que el usuario pueda consultarla al terminar.
            onLeave: () => {
                // Si queremos que otra capa desaparezca al terminar, descomentar esto:
                // if (map.getLayer('layer-geo')) map.setPaintProperty('layer-geo', 'fill-opacity', 0);
            },

            // Al regresar hacia arriba, ocultamos la leyenda
            onLeaveBack: () => {
                if (map.getLayer('layer-geo')) map.setPaintProperty('layer-geo', 'fill-opacity', 0);
                if (map.getLayer('layer-cambio-poblacional')) map.setPaintProperty('layer-cambio-poblacional', 'fill-opacity', 0);

                const legend = document.getElementById('legend-step-21');
                if(legend) legend.style.opacity = '0';
            }
        });
    }

    /// ========================================================
    // 4. UI: BOTÓN VOLVER AL INICIO
    // ========================================================

    const backToTopBtn = document.getElementById('back-to-top');
    const legendStep21 = document.getElementById('legend-step-21'); 

    if (backToTopBtn) {
        ScrollTrigger.create({
            trigger: '.site-footer',
            start: "top bottom", // Cuando el tope del footer entra en la pantalla
            end: "bottom bottom",
            toggleActions: "play none none reverse",

            onEnter: () => {
                backToTopBtn.classList.add('is-visible');
            },
            onLeaveBack: () => {
                backToTopBtn.classList.remove('is-visible');
            }
        });

        backToTopBtn.addEventListener('click', (e) => {
            e.preventDefault();
            backToTopBtn.classList.remove('is-visible');

            if (legendStep21) {
                legendStep21.style.transition = 'none';
                legendStep21.style.opacity = '0';
                legendStep21.style.pointerEvents = 'none';
                
                setTimeout(() => {
                    legendStep21.style.transition = 'opacity 0.5s ease';
                }, 500);
            }

            // Limpieza de capas del mapa
            if (typeof map !== 'undefined' && map.getStyle()) { 
                if (map.getLayer('layer-geo')) map.setPaintProperty('layer-geo', 'fill-opacity', 0);
                if (map.getLayer('layer-cambio-poblacional')) map.setPaintProperty('layer-cambio-poblacional', 'fill-opacity', 0);
            }

            window.scrollTo({ top: 0, behavior: 'auto' });
            if(typeof isStep9Active !== 'undefined') isStep9Active = false;
        });
    }

    // ========================================================
    // 5. REFRESH FINAL DE SINCRONIZACIÓN
    // ========================================================
    setTimeout(() => {
        // 1. GSAP recalcula sus pines
        ScrollTrigger.refresh();
        
        // 2. Le decimos a Scrollama que mida la página de nuevo
        // porque GSAP cambió la altura total.
        scroller.resize(); 
    }, 1000);
}