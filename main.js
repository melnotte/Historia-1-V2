// --- 1. CONFIGURACIÓN Y DATOS ---

// Token de Mapbox.
mapboxgl.accessToken = 'pk.eyJ1IjoiZGVtb3VzZXIiLCJhIjoiY2x6Znh5eDkwMDBzNjJrb2x6Znh5eDkwIn0.F7_SAMPLE_TOKEN_HERE'; 

// Comprobación simple de token
if(mapboxgl.accessToken.includes('SAMPLE_TOKEN') || mapboxgl.accessToken === '') {
    const warning = document.getElementById('no-token-warning');
    if(warning) warning.style.display = 'block';
    console.warn("Por favor añade un token válido de Mapbox en el código JS");
}

// Datos de Población
const populationData = [
    { year: 1970, pop: 6867 },
    { year: 1980, pop: 37190 },
    { year: 1990, pop: 167730 }, 
    { year: 2000, pop: 419815 },
    { year: 2010, pop: 661176 },
    { year: 2020, pop: 911503 }
];

// Coordenadas Clave
const locations = {
    center: [-86.8515, 21.1619],
    overview: { center: [-86.85, 21.12], zoom: 10, pitch: 0, bearing: 0 },
    zoneHotelera: { center: [-86.75, 21.12], zoom: 12.5, pitch: 45, bearing: -20 },
    centro: { center: [-86.82, 21.16], zoom: 14, pitch: 0, bearing: 0 },
    airport: { center: [-86.87, 21.04], zoom: 13, pitch: 30, bearing: 0 },
    expansion: { center: [-86.90, 21.15], zoom: 10.5, pitch: 0, bearing: 0 }
};

// --- 2. INICIALIZACIÓN DEL MAPA ---
const map = new mapboxgl.Map({
    container: 'map',
    // Usamos 'light-v11' que combina bien con el fondo crema, 
    // pero idealmente crearías un estilo personalizado en Mapbox Studio usando #fdf0d5 como color de agua/tierra.
    style: 'mapbox://styles/mapbox/light-v11', 
    center: locations.center,
    zoom: 10,
    interactive: false 
});

// --- 3. D3 GRÁFICO DE POBLACIÓN ---
function createChart() {
    const container = document.getElementById('chart-container');
    
    // Dimensiones dinámicas
    const margin = {top: 60, right: 30, bottom: 50, left: 70};
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight * 0.6 - margin.top - margin.bottom;

    // Limpiar si ya existe
    d3.select("#chart-container svg").remove();

    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Escalas
    const x = d3.scaleLinear()
        .domain(d3.extent(populationData, d => d.year))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(populationData, d => d.pop)])
        .range([height, 0]);

    // Ejes
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .attr("class", "axis")
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    svg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y));

    // Título
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -30)
        .attr("text-anchor", "middle")
        .attr("class", "chart-title")
        .text("Explosión Demográfica (1970 - 2020)");

    // Línea
    const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.pop));

    // Área (relleno debajo)
    const area = d3.area()
        .x(d => x(d.year))
        .y0(height)
        .y1(d => y(d.pop));

    const path = svg.append("path")
        .datum(populationData)
        .attr("class", "line")
        .attr("d", line)
        .attr("stroke-dasharray", function() { return this.getTotalLength(); })
        .attr("stroke-dashoffset", function() { return this.getTotalLength(); });

        svg.append("path")
        .datum(populationData)
        .attr("class", "area")
        .attr("d", area)
        .style("opacity", 0); 

    return { path, svg };
}

let chartRefs = null;

document.addEventListener("DOMContentLoaded", () => {
    chartRefs = createChart();
});

// --- Animación de escritura para el título del step 1 ---
function typeTitle(el, speed = 40) {
    if (!el) return;
    const fullText = (el.getAttribute('data-text') || el.textContent || '').trim();
    if (!fullText) return;
    if (el._typingRunning) return;
    // cancelar cualquier temporizador previo
    if (el._typingTimer) { clearTimeout(el._typingTimer); el._typingTimer = null; }
    el.innerHTML = '';
    el._typingRunning = true;
    let i = 0;
    function step() {
        if (i <= fullText.length) {
            const slice = fullText.slice(0, i);
            el.innerHTML = `<span class="sline typing">${slice}</span>`;
            i++;
            // pequeña variación aleatoria para una escritura natural
            const variance = Math.floor(Math.random() * 40) - 10;
            el._typingTimer = setTimeout(step, Math.max(20, speed + variance));
        } else {
            el.textContent = fullText;
            el._typingTimer = setTimeout(() => { el._typingTimer = null; el._typingRunning = false; }, 200);
        }
    }
    step();
}

// Intentar iniciar la escritura al cargar si el paso 1 está centrado en el viewport
document.addEventListener('DOMContentLoaded', () => {
    const h1 = document.querySelector('h1.step1-title');
    if (!h1) return;
    if (!h1.getAttribute('data-text')) h1.setAttribute('data-text', h1.textContent.trim());
    const stepElem = h1.closest('.step');
    if (stepElem && stepElem.classList.contains('intro')) {
        // comprobar si el centro del step está en el centro del viewport
        const rect = stepElem.getBoundingClientRect();
        const mid = window.innerHeight / 2;
    }
});

// --- 4. GEOJSON SIMULADOS & COLORES ---
map.on('load', () => {
    
    // Capa: Zona Hotelera (Línea)
    map.addSource('zh-source', {
        'type': 'geojson',
        'data': {
            'type': 'Feature',
            'geometry': {
                'type': 'LineString',
                'coordinates': [[-86.78, 21.13], [-86.75, 21.11], [-86.76, 21.08], [-86.78, 21.04]]
            }
        }
    });
    map.addLayer({
        'id': 'zh-layer',
        'type': 'line',
        'source': 'zh-source',
        'layout': {'line-join': 'round', 'line-cap': 'round'},
        'paint': {
            'line-color': '#c1121f', // CAMBIO: Rojo Vibrante
            'line-width': 8, 
            'line-opacity': 0
        }
    });

    // Capa: Supermanzanas (Polígonos aproximados)
    map.addSource('sm-source', {
        'type': 'geojson',
        'data': {
            'type': 'FeatureCollection',
            'features': [
                { 'type': 'Feature', 'geometry': { 'type': 'Polygon', 'coordinates': [[[-86.83, 21.16], [-86.82, 21.16], [-86.82, 21.15], [-86.83, 21.15], [-86.83, 21.16]]] } },
                { 'type': 'Feature', 'geometry': { 'type': 'Polygon', 'coordinates': [[[-86.84, 21.17], [-86.83, 21.17], [-86.83, 21.16], [-86.84, 21.16], [-86.84, 21.17]]] } }
            ]
        }
    });
    map.addLayer({
        'id': 'sm-layer',
        'type': 'fill',
        'source': 'sm-source',
        'paint': {
            'fill-color': '#669bbc', // CAMBIO: Azul Claro (Secundario)
            'fill-opacity': 0
        }
    });

    // Capa: Expansión Urbana (Círculo grande)
    map.addSource('expansion-source', {
        'type': 'geojson',
        'data': {
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [-86.86, 21.14]
            }
        }
    });
    map.addLayer({
        'id': 'expansion-layer',
        'type': 'circle',
        'source': 'expansion-source',
        'paint': {
            'circle-radius': 100,
            'circle-color': '#780000', // CAMBIO: Rojo Oscuro (Riesgo/Alerta)
            'circle-opacity': 0,
            'circle-blur': 0.5
        }
    });
});

// --- 5. LOGICA SCROLLAMA (SCROLLYTELLING) ---
const scroller = scrollama();

function handleStepEnter(response) {
    const stepIndex = response.index + 1; 
    if (stepIndex !== 1) {
        document.body.classList.remove('video-active');
        document.body.classList.remove('step1-visible');
        try {
            const h1clear = document.querySelector('h1.step1-title');
            if (h1clear && h1clear.dataset.typed) delete h1clear.dataset.typed;
        } catch(e) {}
    }
    const el = response.element;

    // UI: Activar clase CSS
    document.querySelectorAll('.step').forEach(s => s.classList.remove('is-active'));
    el.classList.add('is-active');

    // Lógica por pasos
    switch(stepIndex) {
        case 1: // Portada (video)
            // Asegurar que capas de mapa estén en opacidad 0 para la portada
            setLayerOpacity('zh-layer', 0);
            setLayerOpacity('sm-layer', 0);
            setLayerOpacity('expansion-layer', 0);
            try {
                switchLayer('video');
                const h1 = document.querySelector('#video-title');
                if (h1) {
                    if (!h1.getAttribute('data-text')) h1.setAttribute('data-text', h1.textContent.trim());
                    if (!h1.dataset.typed) {
                        typeTitle(h1, 45);
                        h1.dataset.typed = 'true';
                    }
                }
                document.body.classList.add('step1-visible');
            } catch(e) { console.warn('Step1 init error', e); }
            break;
        case 2: // Texto introductorio (step 2)
            // Mantener el mapa activo pero sin capas
            switchLayer('map');
            setLayerOpacity('zh-layer', 0);
            setLayerOpacity('sm-layer', 0);
            setLayerOpacity('expansion-layer', 0);
            break;
        case 3: // Planeación
            switchLayer('map');
            map.flyTo({ ...locations.overview, zoom: 11 });
            break;
        case 4: // Plan Maestro
            switchLayer('map');
            map.flyTo(locations.zoneHotelera);
            break;
        case 5: // Primera línea
            switchLayer('map');
            setLayerOpacity('zh-layer', 1);
            break;
        case 6: // Supermanzanas
            switchLayer('map');
            map.flyTo(locations.centro);
            setLayerOpacity('sm-layer', 0.5);
            break;
        case 7: // Hoteles
            switchLayer('map');
            setLayerOpacity('zh-layer', 1); 
            break;
        case 8: // Aeropuerto
            switchLayer('map');
            map.flyTo(locations.airport);
            setLayerOpacity('sm-layer', 0);
            break;
        case 9: // GRÁFICO POBLACIÓN
            switchLayer('chart');
            if(chartRefs) {
                chartRefs.path.transition().duration(2000).ease(d3.easeLinear)
                    .attr("stroke-dashoffset", 0);
                d3.select(".area").transition().delay(1500).duration(1000).style("opacity", 0.2);
            }
            break;
        case 10: // Expansión
            switchLayer('map');
            map.flyTo(locations.expansion);
            setLayerOpacity('expansion-layer', 0.4);
            break;
        case 11: // Riesgo
            switchLayer('map');
            setLayerOpacity('expansion-layer', 0.6); 
            break;
        case 12: // Huella Verde
            switchLayer('map');
            map.flyTo({ ...locations.expansion, zoom: 9 });
            break;
        case 13: // Futuro
            switchLayer('map');
            map.flyTo(locations.overview);
            setLayerOpacity('expansion-layer', 0);
            setLayerOpacity('zh-layer', 0);
            break;
        
        default:
            break;
    }
}

function handleStepExit(response) {
    try {
        const el = response.element;
        if (!el) return;
        const stepNum = Number(el.dataset.step || 0);
        
        // Desactivar el step 1 fixed cuando se sale de él
        if (stepNum === 1) {
            document.body.classList.remove('video-active');
        }
        
        if (stepNum === 2) {
            const sep = el.querySelector('.separator-block, .separator-substep');
            const overlayBox = el.querySelector('.separator-overlay .overlay-box');
            if (sep) sep.classList.remove('stuck');
            if (overlayBox) overlayBox.classList.remove('show-from-right');
        }
    } catch (e) {
        console.warn('handleStepExit error', e);
    }
}

// Maneja el progreso del step (0..1). Usamos esto para disparar el comportamiento
// cuando el paso 2 alcanza el 100% (progress === 1). Añade/remueve clases.
function handleStepProgress(response) {
    try {
        const el = response.element;
        if (!el) return;
        const stepNum = Number(el.dataset.step || 0);

        // Nos interesa específicamente el step 2 que contiene el separador
        if (stepNum === 2) {
            const sep = el.querySelector('.separator-block, .separator-substep');
            const overlayBox = el.querySelector('.separator-overlay .overlay-box');

            if (!sep || !overlayBox) return;
            // Más tolerante: activar cuando progreso >= 0.9, desactivar cuando <= 0.1
            if (response.progress >= 0.9) {
                if (!sep.classList.contains('stuck')) {
                    sep.classList.add('stuck');
                    overlayBox.classList.add('show-from-right');
                    fixSeparatorToViewport(sep);
                }
            } else if (response.progress <= 0.1) {
                if (sep.classList.contains('stuck')) {
                    sep.classList.remove('stuck');
                    overlayBox.classList.remove('show-from-right');
                    releaseSeparatorFromViewport();
                }
            }
        }
    } catch (e) {
        console.warn('handleStepProgress error', e);
    }
}

function switchLayer(layerName) {
    const layers = document.querySelectorAll('.graphic-layer');
    layers.forEach(l => l.classList.remove('active'));

    const vid = document.getElementById('hero-video');
    document.body.classList.remove('video-active', 'map-active', 'chart-active');

    if (layerName === 'map') {
        document.getElementById('map').classList.add('active');
        document.body.classList.add('map-active');
        if (vid) {
            try { vid.pause(); vid.currentTime = 0; } catch(e){}
        }
    }

    if (layerName === 'chart') {
        document.getElementById('chart-container').classList.add('active');
        document.body.classList.add('chart-active');
        if (vid) {
            try { vid.pause(); vid.currentTime = 0; } catch(e){}
        }
    }

    if (layerName === 'video') {
        document.getElementById('video-layer').classList.add('active');
        document.body.classList.add('video-active');
        if (vid) {
            // Intenta reproducir (podría fallar si el navegador bloquea autoplay sin interacción)
            try { vid.play().catch(()=>{}); } catch(e){}
        }
    }
}

function setLayerOpacity(layerId, opacity) {
    if (map.getLayer(layerId)) {
        if(layerId.includes('line')) map.setPaintProperty(layerId, 'line-opacity', opacity);
        if(layerId.includes('fill')) map.setPaintProperty(layerId, 'fill-opacity', opacity);
        if(layerId.includes('circle')) map.setPaintProperty(layerId, 'circle-opacity', opacity);
    }
}

const _step1MoveState = {
    parent: null,
    nextSibling: null,
    wrapper: null,
    active: false
};

// Estado para mover la imagen del separador fuera del flujo y fijarla al viewport
const _sepMoveState = {
    parent: null,
    nextSibling: null,
    wrapper: null,
    active: false,
    image: null
};

function fixSeparatorToViewport(sep) {
    try {
        if (!sep || _sepMoveState.active) return;
        const img = sep.querySelector('.separator-image');
        if (!img) return;

        _sepMoveState.parent = img.parentNode;
        _sepMoveState.nextSibling = img.nextSibling;
        _sepMoveState.image = img;

        const wrapper = document.createElement('div');
        wrapper.id = 'separator-fixed-wrapper';
        wrapper.style.position = 'fixed';
        wrapper.style.top = '0';
        wrapper.style.left = '0';
        wrapper.style.width = '100vw';
        wrapper.style.height = '100vh';
        wrapper.style.zIndex = '10000';
        wrapper.style.pointerEvents = 'none';

        document.body.appendChild(wrapper);
        wrapper.appendChild(img);

        _sepMoveState.wrapper = wrapper;
        _sepMoveState.active = true;
    } catch (e) {
        console.warn('fixSeparatorToViewport error', e);
    }
}

function releaseSeparatorFromViewport() {
    try {
        if (!_sepMoveState.active) return;
        const { parent, nextSibling, wrapper, image } = _sepMoveState;
        if (!wrapper || !image) return;

        if (parent) {
            if (nextSibling) parent.insertBefore(image, nextSibling);
            else parent.appendChild(image);
        }

        if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);

        _sepMoveState.parent = null;
        _sepMoveState.nextSibling = null;
        _sepMoveState.wrapper = null;
        _sepMoveState.image = null;
        _sepMoveState.active = false;
        console.log('releaseSeparatorFromViewport: restored image to original place');
    } catch (e) {
        console.warn('releaseSeparatorFromViewport error', e);
    }
}



function init() {
    scroller
        .setup({
            step: '#article .step',
            offset: 0.5,
            debug: false
        })
        .onStepEnter(handleStepEnter)
        .onStepExit(handleStepExit)
        .onStepProgress(handleStepProgress);

    window.addEventListener('resize', () => {
        scroller.resize();
        chartRefs = createChart();
    });
}

init();

// --- 6. GSAP ScrollTrigger ---
let scrollLocked = false;
let lockedScrollPosition = 0;
let animationCompleted = false;

function lockScroll() {
    if (scrollLocked) return;
    scrollLocked = true;
    lockedScrollPosition = window.pageYOffset;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${lockedScrollPosition}px`;
    document.body.style.width = '100%';
}

function unlockScroll() {
    if (!scrollLocked) return;
    scrollLocked = false;
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, lockedScrollPosition);
}

function initSeparatorScrollAnimation() {
    try {
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
            console.warn('GSAP or ScrollTrigger not available — separator scrub disabled.');
            return;
        }

        gsap.registerPlugin(ScrollTrigger);

        const track = document.querySelector('.separator-track');
        const overlay = document.querySelector('.separator-substep .separator-overlay .overlay-box') || document.querySelector('.separator-track .separator-overlay .overlay-box');
        if (!track || !overlay) return;

        gsap.set(overlay, { xPercent: 100, opacity: 0 });

        // Forzar que el sticky se active añadiendo un ScrollTrigger que actualiza constantemente
        ScrollTrigger.create({
            trigger: track,
            start: 'top bottom',
            end: 'bottom top',
            onUpdate: (self) => {
                const sticky = track.querySelector('.separator-sticky');
                if (sticky && self.progress > 0 && self.progress < 1) {
                    sticky.style.position = 'sticky';
                }
            }
        });

        // Bloquear scroll cuando el track entra 100% en vista (top del track llega al top del viewport)
        ScrollTrigger.create({
            trigger: track,
            start: 'top top+=1',
            end: 'top top',
            fastScrollEnd: true,
            onEnter: () => {
                animationCompleted = false;
                lockScroll();
                // Animar entrada del overlay
                gsap.to(overlay, {
                    xPercent: 0,
                    opacity: 1,
                    duration: 1.2,
                    ease: 'power2.out',
                    onComplete: () => {
                        animationCompleted = true;
                        // Desbloquear scroll después de la animación
                        setTimeout(() => {
                            unlockScroll();
                        }, 800);
                    }
                });
            },
            onLeaveBack: () => {
                if (scrollLocked) {
                    unlockScroll();
                }
                gsap.set(overlay, { xPercent: 100, opacity: 0 });
                animationCompleted = false;
            }
        });

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: track,
                start: 'top top',
                end: 'bottom top',
                scrub: true,
            }
        });

        tl.to(overlay, { xPercent: 0, opacity: 1, ease: 'none' }, 0);
        tl.to(overlay, { xPercent: 0, opacity: 1, ease: 'none' }, 0.15);
        tl.to(overlay, { xPercent: 100, opacity: 0, ease: 'none' }, 0.9);

        ScrollTrigger.create({
            trigger: track,
            start: 'top top',
            end: 'bottom top',
            onUpdate: self => {
                const p = self.progress;
                if (p > 0.05 && p < 0.9) overlay.style.pointerEvents = 'auto';
                else overlay.style.pointerEvents = 'none';
            }
        });

    } catch (e) {
        console.warn('initSeparatorScrollAnimation error', e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initSeparatorScrollAnimation, 120);
});

// Asegura que el Step 1 sea visible.
(function ensureInitialStep() {
    try {
        const firstStep = document.querySelector('#article .step[data-step="1"]');
        if (firstStep && !firstStep.classList.contains('is-active')) {
            // marcar como activo para que el CSS posicione el título fijo en el centro
            document.querySelectorAll('.step').forEach(s => s.classList.remove('is-active'));
            firstStep.classList.add('is-active');
        }

        // activar la capa de video para que el título se sitúe encima del fondo de video
        switchLayer('video');
        const vid = document.getElementById('hero-video');
        if (vid) {
            // intentar reproducir (podría fallar si el navegador bloquea autoplay sin interacción)
            vid.muted = true;
            vid.play().catch(()=>{});
        }

        // Iniciar la animación de escritura en el overlay si existe el título
        try {
            const h1 = document.querySelector('#video-title');
            if (h1) {
                if (!h1.getAttribute('data-text')) h1.setAttribute('data-text', h1.textContent.trim());
                if (!h1.dataset.typed) {
                    typeTitle(h1, 45);
                    h1.dataset.typed = 'true';
                }
            }
        } catch(e) { /* ignore */ }

        // Asegurar que el overlay esté visible inicialmente
        if (document && document.body && document.body.classList) {
            document.body.classList.add('step1-visible');
        }

    } catch(e) { console.warn('Initial step setup error', e); }
})();