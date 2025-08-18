// Función para configurar los eventos de accesibilidad (modo oscuro y daltonismo)
function setupAccessibilityEvents() {
    // Configurar el cambio de modo oscuro
    const darkModeToggles = document.querySelectorAll('#darkModeToggle');
    darkModeToggles.forEach(toggle => {
        toggle.addEventListener('change', function() {
            toggleDarkMode(this.checked);
        });
    });
    
    // Configurar el cambio de modo daltónico
    const colorblindModes = document.querySelectorAll('#colorblindMode');
    colorblindModes.forEach(select => {
        select.addEventListener('change', function() {
            changeColorblindMode(this.value);
        });
    });
}

function toggleDarkMode(isChecked) {
    if (isChecked === undefined) {
        document.body.classList.toggle('dark-mode');
    } else {
        if (isChecked) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }
    
    const isDarkMode = document.body.classList.contains('dark-mode');
    const modeText = document.getElementById('modeText');
    if (modeText) {
        modeText.textContent = isDarkMode ? 'Modo Claro' : 'Modo Oscuro';
    }
    
    localStorage.setItem('darkMode', isDarkMode);
    
    // Sincronizar todos los toggles
    const darkModeToggles = document.querySelectorAll('#darkModeToggle');
    darkModeToggles.forEach(toggle => {
        toggle.checked = isDarkMode;
    });
}

function changeColorblindMode(selectedMode) {
    const body = document.body;
    
    // Si no se proporciona un valor, obtenerlo del selector
    if (!selectedMode) {
        const modeSelect = document.getElementById('colorblindMode');
        if (modeSelect) {
            selectedMode = modeSelect.value;
        } else {
            return; // No hay selector, no podemos continuar
        }
    }
    
    // Eliminar todas las clases de daltonismo previas
    body.classList.remove('protanopia', 'tritanopia');
    
    // Aplicar la clase correspondiente al modo seleccionado
    if (selectedMode !== 'normal') {
        body.classList.add(selectedMode);
    }
    
    // Guardar preferencia en localStorage
    localStorage.setItem('colorblindMode', selectedMode);
    
    // Sincronizar todos los selectores
    const colorblindModes = document.querySelectorAll('#colorblindMode');
    colorblindModes.forEach(select => {
        select.value = selectedMode;
    });
}

let palabras = [];
let palabraActualIndex = 0;
let palabraActualElement = null;
let utterance = null;
let pausado = false;
let leyendo = false;
let usuarioScroll = false;
let temporizadorScroll;

// Función para mostrar alertas personalizadas
function showCustomAlert(message, title = "Mensaje") {
    const alertBox = document.getElementById('customAlert');
    const alertMessage = document.getElementById('customAlertMessage');
    const alertTitle = document.querySelector('.custom-alert-title');
    const alertBtn = document.getElementById('customAlertBtn');
    const alertClose = document.querySelector('.custom-alert-close');
    
    // Establecer mensaje y título
    alertMessage.textContent = message;
    alertTitle.textContent = title;
    
    // Mostrar alerta
    alertBox.style.display = 'flex';
    
    // Manejar cierre de alerta
    function closeAlert() {
        alertBox.style.display = 'none';
    }
    
    // Event listeners para cerrar alerta
    alertBtn.onclick = closeAlert;
    alertClose.onclick = closeAlert;
    
    // También cerrar al presionar Escape
    document.addEventListener('keydown', function escKeyHandler(e) {
        if (e.key === 'Escape') {
            closeAlert();
            document.removeEventListener('keydown', escKeyHandler);
        }
    });
}

window.addEventListener('scroll', () => {
    usuarioScroll = true;
    clearTimeout(temporizadorScroll);
    temporizadorScroll = setTimeout(() => {
        usuarioScroll = false;
    }, 1500);
});

async function fetchContent() {
    const url = document.getElementById('url').value;
    if (!url) {
        showCustomAlert('Por favor, ingresa un enlace válido.', 'Error');
        return;
    }
    // Validar formato de URL
    try {
        new URL(url);
    } catch (e) {
        showCustomAlert('La URL ingresada no es válida.', 'Error');
        return;
    }

    // Mostrar el spinner de carga
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = 'block';
    document.getElementById('content').innerHTML = '';
    document.getElementById('lecturaControles').style.display = 'none';

    try {
        const response = await fetch(`https://api.scraperapi.com?api_key=96eda2d73c8b84442282a4f56e70534b&url=${encodeURIComponent(url)}`);
        
        if (!response.ok) {
            throw new Error(`Error en la respuesta: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(data, 'text/html');

        // Intentar obtener el título de diferentes maneras
        let title = doc.querySelector('h1')?.innerText.trim() || 
                   doc.querySelector('title')?.innerText.trim() || 
                   'Sin título';
        
        // Obtener párrafos y filtrar contenido vacío
        let rawParagraphs = Array.from(doc.body.querySelectorAll('p, article p, main p, .content p, .article p'))
            .map(el => el.innerText.trim())
            .filter(text => text.length > 10); // Filtrar párrafos muy cortos
        
        // Si no se encontraron párrafos, intentar con otros elementos
        if (rawParagraphs.length === 0) {
            rawParagraphs = Array.from(doc.body.querySelectorAll('div, section'))
                .map(el => el.innerText.trim())
                .filter(text => text.length > 50) // Filtrar textos muy cortos
                .slice(0, 20); // Limitar a 20 secciones como máximo
        }

        // Limitar la cantidad de texto para evitar problemas con textos extremadamente grandes
        const maxParagraphs = 30; // Limitar a 30 párrafos como máximo
        const limitedParagraphs = rawParagraphs.slice(0, maxParagraphs);
        
        if (rawParagraphs.length > maxParagraphs) {
            const mensaje = `El texto es muy extenso. Se muestran ${maxParagraphs} de ${rawParagraphs.length} párrafos.`;
            console.warn(mensaje);
            // Añadir mensaje al contenido
            limitedParagraphs.push(mensaje);
        }
        
        // Si no hay contenido, mostrar un mensaje
        if (limitedParagraphs.length === 0) {
            spinner.style.display = 'none';
            showCustomAlert('No se pudo extraer contenido legible de esta página.', 'Aviso');
            return;
        }
        
        // Procesar el texto para la lectura
        const textoCompleto = `${title}. ${limitedParagraphs.join('. ')}`;
        palabras = textoCompleto.split(/\s+/).filter(w => w.length > 0);

        // Función para convertir texto a spans para la lectura
        let index = 0;
        const spanify = (text) => {
            if (!text) return '';
            return text.split(/\s+/).map(w => {
                if (w.length === 0) return '';
                return `<span class="palabra" id="palabra-${index++}">${w}</span>`;
            }).join(' ');
        };

        // Crear HTML con el contenido
        const titleHTML = `<h2 id="tituloNoticia">${spanify(title)}</h2>`;
        const bodyHTML = limitedParagraphs.map(p => `<p>${spanify(p)}</p>`).join('');

        // Ocultar el spinner de carga
        spinner.style.display = 'none';

        // Insertar el contenido en el DOM
        const contentElement = document.getElementById('content');
        contentElement.innerHTML = `${titleHTML}${bodyHTML}`;
        
        // Aplicar estilos para mejorar la legibilidad
        contentElement.style.lineHeight = '1.6';
        contentElement.style.textAlign = 'justify';
        contentElement.querySelectorAll('p').forEach(p => {
            p.style.marginBottom = '1.2em';
            p.style.maxWidth = '100%';
            p.style.overflowWrap = 'break-word';
        });

        palabraActualIndex = 0;
        document.getElementById('lecturaControles').style.display = 'flex';

    } catch (error) {
        console.error('Error al obtener el contenido:', error);
        // Ocultar el spinner de carga en caso de error
        spinner.style.display = 'none';
        showCustomAlert(`No se pudo cargar el contenido: ${error.message}`, 'Error');
    }
}

function resaltarPalabra(index) {
    if (palabraActualElement) {
        palabraActualElement.classList.remove('highlight');
    }

    const span = document.getElementById(`palabra-${index}`);
    if (span) {
        span.classList.add('highlight');

        if (!usuarioScroll) {
            const rect = span.getBoundingClientRect();
            const isFarAbove = rect.top < 50;
            const isFarBelow = rect.bottom > window.innerHeight - 50;

            if (isFarAbove || isFarBelow) {
                span.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        palabraActualElement = span;
    }
}

function leerTexto() {
    // Verificar si hemos llegado al final del texto
    if (palabraActualIndex >= palabras.length) {
        leyendo = false;
        pausado = false;
        return;
    }

    try {
        // Verificar si el sistema de síntesis de voz está disponible
        if (!window.speechSynthesis) {
            throw new Error('La síntesis de voz no está disponible en este navegador');
        }

        // Leer un grupo de palabras para mejor fluidez (reducido para mayor estabilidad)
        const tamanoFragmento = Math.min(5, palabras.length - palabraActualIndex);
        const fragmento = palabras.slice(palabraActualIndex, palabraActualIndex + tamanoFragmento).join(' ');
        
        // Crear nueva instancia de SpeechSynthesisUtterance para el fragmento
        utterance = new SpeechSynthesisUtterance(fragmento);
        utterance.lang = 'es-ES';
        
        // Obtener la velocidad seleccionada por el usuario
        const velocidadSelect = document.getElementById('velocidadLectura');
        let velocidad = velocidadSelect ? parseFloat(velocidadSelect.value) : 1;
        utterance.rate = velocidad;
        utterance.pitch = 1;

        // Resaltar la palabra actual inmediatamente
        resaltarPalabra(palabraActualIndex);
        
        // Configurar el evento de límite de palabra para resaltar cada palabra
        let palabrasProcesadas = 0;
        utterance.onboundary = (event) => {
            if (!leyendo) return; // No procesar si ya no estamos leyendo
            
            try {
                if (event.name === 'word' && palabrasProcesadas < tamanoFragmento) {
                    resaltarPalabra(palabraActualIndex + palabrasProcesadas);
                    palabrasProcesadas++;
                }
            } catch (error) {
                console.error('Error en onboundary:', error);
            }
        };
        
        // Manejar el final de la lectura del fragmento
        utterance.onend = () => {
            if (!leyendo) return; // No procesar si ya no estamos leyendo
            
            try {
                if (!pausado) {
                    // Avanzar al siguiente fragmento
                    palabraActualIndex += tamanoFragmento;
                    
                    // Pequeña pausa entre fragmentos para evitar sobrecarga
                    setTimeout(() => {
                        if (leyendo && !pausado) {
                            leerTexto();
                        }
                    }, 10);
                }
            } catch (error) {
                console.error('Error en onend:', error);
                // Intentar recuperarse del error silenciosamente
                detenerLectura(true); // true = no mostrar alerta
            }
        };

        // Manejar errores durante la síntesis de voz
        utterance.onerror = (event) => {
            console.error('Error en la síntesis de voz:', event);
            detenerLectura(true); // Detener sin mostrar alerta para evitar bucles de error
        };

        // Iniciar la síntesis de voz
        window.speechSynthesis.speak(utterance);
        leyendo = true;
        
    } catch (error) {
        console.error('Error al iniciar la síntesis de voz:', error);
        detenerLectura(true);
    }
}

function iniciarLectura() {
    if (!('speechSynthesis' in window)) {
        showCustomAlert("Tu navegador no soporta la síntesis de voz.", "Error");
        return;
    }

    if (palabras.length === 0) {
        showCustomAlert("No hay contenido para leer.", "Error");
        return;
    }

    try {
        // Asegurarse de que cualquier síntesis previa se haya cancelado
        speechSynthesis.cancel();
        
        // Reiniciar variables de control
        palabraActualIndex = 0;
        pausado = false;
        leyendo = true;
        
        // Iniciar la lectura con un pequeño retraso para asegurar que todo esté listo
        setTimeout(() => {
            leerTexto();
        }, 100);
        
    } catch (error) {
        console.error('Error al iniciar la lectura:', error);
        showCustomAlert("Se produjo un error al iniciar la lectura. Por favor, recarga la página e intenta de nuevo.", "Error");
    }
}

function pausarLectura() {
    try {
        if (leyendo) {
            speechSynthesis.pause();
            pausado = true;
            leyendo = false;
        } else if (pausado) {
            speechSynthesis.resume();
            pausado = false;
            leyendo = true;
        }
    } catch (error) {
        console.error('Error al pausar/reanudar la lectura:', error);
        // Intentar recuperarse del error
        detenerLectura();
        showCustomAlert('Se produjo un error al pausar o reanudar la lectura. Por favor, inténtalo de nuevo.', 'Error');
    }
}

function detenerLectura(silencioso = false) {
    // Primero, establecer que ya no estamos leyendo para evitar callbacks adicionales
    leyendo = false;
    pausado = false;
    
    try {
        // Cancelar cualquier síntesis de voz en curso
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        
        // Limpiar cualquier utterance pendiente
        if (utterance) {
            // Eliminar los event listeners para evitar callbacks inesperados
            utterance.onend = null;
            utterance.onboundary = null;
            utterance.onerror = null;
            utterance = null;
        }
        
        // Reiniciar variables de control
        palabraActualIndex = 0;
        
        // Eliminar el resaltado de la palabra actual
        if (palabraActualElement) {
            palabraActualElement.classList.remove('highlight');
            palabraActualElement = null;
        }
        
        // Solución para el problema conocido de Chrome donde speechSynthesis puede quedar en estado inconsistente
        if (window.chrome) {
            setTimeout(() => {
                if (window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                }
            }, 50);
        }
    } catch (error) {
        console.error('Error al detener la lectura:', error);
    } finally {
        // Asegurarse de que estas variables se reseteen incluso si hay errores
        palabraActualIndex = 0;
        pausado = false;
        leyendo = false;
        
        // Mostrar alerta solo si no es una detención silenciosa
        if (!silencioso) {
            // Usar setTimeout para evitar problemas con alertas durante la cancelación de la síntesis
            setTimeout(() => {
                try {
                    // Verificar si el lector ya está detenido antes de mostrar mensaje
                    if (!leyendo && !pausado) {
                        // No mostrar alerta, ya que podría ser confuso para el usuario
                    }
                } catch (e) {
                    console.error('Error al mostrar alerta:', e);
                }
            }, 100);
        }
    }
}

function updatePreview() {
    let fontSize = document.getElementById('fontSize').value;
    const fontColor = document.getElementById('fontColor').value;
    const bgColor = document.getElementById('bgColor').value;
    const fontFamily = document.getElementById('fontFamily').value;

    // Limitar el tamaño de letra a 50 para la vista previa
    if (fontSize > 50) {
        fontSize = 50;
    }

    const preview = document.getElementById('preview');
    preview.style.fontSize = fontSize ? fontSize + 'px' : '16px';
    preview.style.color = fontColor;
    preview.style.backgroundColor = bgColor;
    preview.style.fontFamily = fontFamily;
}

function applyStyles() {
    let fontSize = document.getElementById('fontSize').value;
    const fontColor = document.getElementById('fontColor').value;
    const bgColor = document.getElementById('bgColor').value;
    const fontFamily = document.getElementById('fontFamily').value;

    const content = document.getElementById('content');
    
    // Verificar si hay contenido para aplicar los estilos
    if (content.innerHTML.trim() === '') {
        showCustomAlert('No hay contenido para aplicar los estilos. Primero carga un texto.', 'Aviso');
        return;
    }
    
    // Limitar el tamaño de letra a 50 para la aplicacion
    if (fontSize > 50) {
        fontSize = 50;
    }
    
    // Aplicar estilos al contenedor principal
    content.style.fontSize = fontSize ? fontSize + 'px' : '18px';
    content.style.color = fontColor;
    content.style.backgroundColor = bgColor;
    content.style.fontFamily = fontFamily;
    
    // Aplicar estilos a todos los elementos de texto dentro del contenido
    const textElements = content.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div');
    textElements.forEach(element => {
        // Si se selecciona OpenDyslexic, añadir también el espaciado de letras y altura de línea
        if (fontFamily.includes('OpenDyslexic')) {
            element.style.letterSpacing = '0.12em';
            element.style.lineHeight = '1.6';
        } else {
            element.style.letterSpacing = 'normal';
            element.style.lineHeight = 'normal';
        }
        element.style.fontFamily = fontFamily;
    });

    // Mostrar alerta de exito
    showCustomAlert('¡Estilos aplicados correctamente!', 'Éxito');
}

function resetStyles() {
    const content = document.getElementById('content');
    
    // Verificar si hay contenido para reiniciar los estilos
    if (content.innerHTML.trim() === '') {
        showCustomAlert('No hay contenido para reiniciar los estilos.', 'Aviso');
        return;
    }
    
    // Reiniciar estilos del contenedor principal
    content.style.fontSize = '';
    content.style.color = '';
    content.style.backgroundColor = '';
    content.style.fontFamily = '';
    
    // Reiniciar estilos de todos los elementos de texto dentro del contenido
    const textElements = content.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div');
    textElements.forEach(element => {
        element.style.fontFamily = '';
        element.style.letterSpacing = '';
        element.style.lineHeight = '';
    });
    
    // Reiniciar valores en los controles
    document.getElementById('fontSize').value = '';
    document.getElementById('fontColor').selectedIndex = 0;
    document.getElementById('bgColor').selectedIndex = 0;
    document.getElementById('fontFamily').selectedIndex = 0;
    
    // Actualizar los previews de color
    document.getElementById('fontColorPreview').style.backgroundColor = document.getElementById('fontColor').value;
    document.getElementById('bgColorPreview').style.backgroundColor = document.getElementById('bgColor').value;
    
    // Mostrar alerta de exito
    showCustomAlert('¡Estilos restaurados correctamente!', 'Éxito');
}

async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        if (text) {
            document.getElementById('url').value = text;
        } else {
            showCustomAlert("El portapapeles está vacío.", "Aviso");
        }
    } catch (err) {
        showCustomAlert("No se pudo acceder al portapapeles. Asegúrate de permitir el acceso.", "Error");
    }
}

// Funcion para mostrar u ocultar la vista previa
function togglePreview() {
    const previewContainer = document.getElementById('previewContainer');
    const previewButton = document.getElementById('previewButton');
    const isVisible = previewContainer.style.display !== 'none';
    
    if (isVisible) {
        previewContainer.style.display = 'none';
        previewButton.textContent = '👁️ Ver Vista Previa';
    } else {
        previewContainer.style.display = 'block';
        previewButton.textContent = '👁️ Ocultar Vista Previa';
        updatePreview(); // Actualizar la vista previa cuando se muestra
    }
}

// Event listeners para actualizar la vista previa en tiempo real
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar los cuadrados de vista previa de color si existen
    const fontColorPreview = document.getElementById('fontColorPreview');
    const bgColorPreview = document.getElementById('bgColorPreview');
    const fontColor = document.getElementById('fontColor');
    const bgColor = document.getElementById('bgColor');
    const fontSize = document.getElementById('fontSize');
    
    // Verificar si los elementos existen antes de usarlos
    if (fontColorPreview && fontColor) {
        fontColorPreview.style.backgroundColor = fontColor.value;
    }
    
    if (bgColorPreview && bgColor) {
        bgColorPreview.style.backgroundColor = bgColor.value;
    }
    
    // Actualizar la vista previa inicial si los elementos existen
    if (document.querySelector('.preview-content')) {
        updatePreview();
    }
    
    // Event listeners para cambios en los controles
    if (fontSize) {
        fontSize.addEventListener('input', updatePreview);
    }
    
    if (fontColor) {
        fontColor.addEventListener('change', function() {
            if (fontColorPreview) {
                fontColorPreview.style.backgroundColor = this.value;
            }
            updatePreview();
        });
    }
    if (document.getElementById('bgColor')) {
        document.getElementById('bgColor').addEventListener('change', function() {
            if (document.getElementById('bgColorPreview')) {
                document.getElementById('bgColorPreview').style.backgroundColor = this.value;
            }
            updatePreview();
        });
    }
    if (document.getElementById('fontFamily')) {
        document.getElementById('fontFamily').addEventListener('change', updatePreview);
    }
    
    // para mayor claridad y mejor manejo de eventos
    const customMenuToggle = document.getElementById('customMenuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
});

// Funcion para alternar la visibilidad del sidebar
function toggleSidebar() {
    sidebar.classList.toggle('active');
    if (sidebar.classList.contains('active')) {
        sidebarOverlay.style.display = 'block';
    } else {
        sidebarOverlay.style.display = 'none';
    }
}

// Nota: Los event listeners para el sidebar se manejan en la funcion window.onload

// Configurar el boton cuando la pagina este cargada
document.addEventListener('DOMContentLoaded', function() {
    const pasteButton = document.getElementById('pasteButton');
    
    if (pasteButton) {
        pasteButton.addEventListener('click', requestClipboardPermission);
    }
});

// Cargar preferencias guardadas al iniciar
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si hay una preferencia de modo oscuro guardada
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
        document.body.classList.add('dark-mode');
    }
    
    // Verificar si hay una preferencia de modo daltonico guardada
    const savedColorblindMode = localStorage.getItem('colorblindMode');
    if (savedColorblindMode && savedColorblindMode !== 'normal') {
        document.body.classList.add(savedColorblindMode);
        document.getElementById('colorblindMode').value = savedColorblindMode;
    }
});

// Funcion para solicitar acceso al portapapeles
function requestClipboardPermission() {
    // Forzar la solicitud de permisos directamente
    navigator.clipboard.readText()
        .then(text => {
            // Si tiene exito, pegar el texto
            document.getElementById('url').value = text;
        })
        .catch(err => {
            console.error('Error al acceder al portapapeles:', err);
            // Mostrar instrucciones para cambiar los permisos
            showCustomAlert('Para usar el botón de pegar, necesitas permitir el acceso al portapapeles.\n\nEn Chrome: Haz clic en el icono de candado en la barra de direcciones > Permisos > Portapapeles > Permitir.\n\nEn Firefox: Haz clic en el icono de candado > Permisos > Acceder al portapapeles > Permitir.', 'Permisos Requeridos');
        });
}

// Funcion para abrir el sidebar
function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    // Abrir el sidebar
    sidebar.classList.add('active');
    sidebarOverlay.style.display = 'block';
    setTimeout(function() {
        sidebarOverlay.style.opacity = '1';
    }, 10);
}

// Funcion para cerrar el sidebar
function closeSidebar(event) {
    // Prevenir comportamiento por defecto si es un evento
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const customMenuToggle = document.getElementById('customMenuToggle');
    
    // Cerrar el sidebar si existe
    if (sidebar) {
        sidebar.classList.remove('active');
    }
    
    // Ocultar el overlay con transición si existe
    if (sidebarOverlay) {
        sidebarOverlay.style.opacity = '0';
        // Ocultar completamente el overlay después de la transición
        setTimeout(() => {
            if (sidebarOverlay) {
                sidebarOverlay.style.display = 'none';
            }
        }, 300);
    }
    
    // Mostrar el botón del menú si existe
    customMenuToggle.classList.remove('hidden');
    
    setTimeout(function() {
        sidebarOverlay.style.display = 'none';
    }, 300);
}

// Cuando el DOM este completamente cargado
window.onload = function() {
    // Obtener referencias a los elementos
    const customMenuToggle = document.getElementById('customMenuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    
    // Verificar si los elementos existen antes de manipularlos
    if (sidebarOverlay) {
        sidebarOverlay.style.display = 'none';
        sidebarOverlay.style.opacity = '0';
    }
    
    // Agregar evento de clic al boton del menu SOLO para abrir el sidebar
    if (customMenuToggle) {
        customMenuToggle.addEventListener('click', openSidebar);
    }
    
    // Agregar evento de clic al overlay SOLO para cerrar el sidebar
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }
    
    // Agregar evento de clic al boton de cierre del sidebar
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', function() {
            closeSidebar();
        });
    }
    
    // Evitar que los clics dentro del sidebar lo cierren
    if (sidebar) {
        sidebar.addEventListener('click', function(event) {
            event.stopPropagation();
        });
    }
};
// Función para generar un PDF con el contenido extraído y los estilos aplicados
async function generarPDF() {
    // Verificar si hay contenido para generar el PDF
    const contentElement = document.getElementById('content');
    if (contentElement.innerHTML.trim() === '') {
        showCustomAlert('No hay contenido para generar el PDF. Primero carga un texto.', 'Aviso');
        return;
    }

    // Mostrar spinner de carga
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = 'block';
    
    try {
        // Obtener estilos actuales
        const fontSize = contentElement.style.fontSize || '14px';
        const fontSizeValue = parseInt(fontSize);
        const textColor = contentElement.style.color || '#000000';
        const bgColor = contentElement.style.backgroundColor || '#FFFFFF';
        const fontFamily = contentElement.style.fontFamily || 'Arial';
        
        // Detectar si se está usando OpenDyslexic u otra fuente personalizada
        const isCustomFont = fontFamily.toLowerCase().includes('opendyslexic') || 
                           !['arial', 'helvetica', 'times', 'courier'].some(font => 
                               fontFamily.toLowerCase().includes(font));
        
        if (isCustomFont) {
            console.log('Fuente personalizada detectada, usando método canvas');
            await generarPDFConCanvas();
        } else {
            console.log('Fuente estándar detectada, usando método jsPDF');
            await generarPDFEstandar();
        }
        
    } catch (error) {
        console.error('Error al generar el PDF:', error);
        spinner.style.display = 'none';
        showCustomAlert('Error al generar el PDF. Intentando método alternativo...', 'Error');
        
        // Fallback al método canvas
        try {
            await generarPDFConCanvas();
        } catch (fallbackError) {
            console.error('Error en método fallback:', fallbackError);
            showCustomAlert('No se pudo generar el PDF. Verifica el contenido e intenta nuevamente.', 'Error');
        }
    }
}

// Función mejorada para generar PDF con fuentes estándar usando jsPDF
async function generarPDFEstandar() {
    const contentElement = document.getElementById('content');
    const spinner = document.getElementById('loadingSpinner');
    
    try {
        // Configurar opciones de jsPDF
        const { jsPDF } = window.jspdf;
        
        // Crear un nuevo documento PDF
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });
        
        // Obtener estilos actuales
        const fontSize = contentElement.style.fontSize || '16px';
        const fontSizeValue = parseInt(fontSize);
        const textColor = contentElement.style.color || '#000000';
        const bgColor = contentElement.style.backgroundColor || '#FFFFFF';
        const fontFamily = contentElement.style.fontFamily || 'Arial';
        
        // Configurar márgenes más pequeños para aprovechar mejor el espacio
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 12; // Márgenes reducidos
        const contentWidth = pageWidth - (margin * 2);
        const contentHeight = pageHeight - (margin * 2);
        
        // Configurar colores
        const { r, g, b } = parseColor(bgColor);
        const { r: textR, g: textG, b: textB } = parseColor(textColor);
        
        // Mapear fuente CSS a fuente PDF
        const pdfFont = mapearFuente(fontFamily);
        
        // Calcular tamaños de fuente más grandes para mejor legibilidad
        const pdfFontSize = Math.max(12, Math.min(24, fontSizeValue * 0.85)); // Tamaño más grande
        const titleFontSize = Math.max(16, pdfFontSize + 6); // Título más prominente
        const lineHeight = pdfFontSize * 0.6; // Espaciado entre líneas mejorado
        const paragraphSpacing = lineHeight * 1.2; // Espaciado entre párrafos mejorado
        
        // Configurar propiedades del documento
        pdf.setProperties({
            title: 'OpenDislex - Documento Adaptado',
            subject: 'Documento adaptado para dislexia',
            author: 'OpenDislex',
            keywords: 'dislexia, accesibilidad, lectura',
            creator: 'OpenDislex Tool'
        });
        
        // Establecer color de fondo y fuente
        pdf.setFillColor(r, g, b);
        pdf.setTextColor(textR, textG, textB);
        pdf.setFont(pdfFont);
        
        // Extraer contenido
        const title = contentElement.querySelector('h2')?.textContent || 'Sin título';
        const paragraphs = extraerParrafosOptimizado(contentElement);
        
        // Variables para posicionamiento
        let currentPage = 1;
        let yPosition = margin;
        
        // Función para añadir nueva página
        const addNewPage = () => {
            pdf.addPage();
            currentPage++;
            pdf.setFillColor(r, g, b);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');
            yPosition = margin;
        };
        
        // Establecer fondo de la primera página
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
        
        // Añadir título con mejor formato
        pdf.setFontSize(titleFontSize);
        pdf.setFont(pdfFont, 'bold');
        
        const titleLines = dividirTextoEnLineas(pdf, title, contentWidth, titleFontSize);
        const titleHeight = titleLines.length * (titleFontSize * 0.4);
        
        if (yPosition + titleHeight + 15 > pageHeight - margin) {
            addNewPage();
        }
        
        // Centrar cada línea del título
        titleLines.forEach((line, index) => {
            const lineWidth = pdf.getStringUnitWidth(line) * titleFontSize / pdf.internal.scaleFactor;
            const titleX = (pageWidth - lineWidth) / 2;
            pdf.text(line, titleX, yPosition + 8 + (index * titleFontSize * 0.4));
        });
        
        yPosition += titleHeight + 25; // Más espacio después del título
        
        // Configurar fuente para contenido
        pdf.setFontSize(pdfFontSize);
        pdf.setFont(pdfFont, 'normal');
        
        // Añadir párrafos con mejor distribución
        paragraphs.forEach((text, index) => {
            // Dividir texto en líneas sin cortar palabras
            const lines = dividirTextoEnLineas(pdf, text, contentWidth, pdfFontSize);
            const requiredHeight = lines.length * lineHeight + paragraphSpacing;
            
            // Verificar si hay espacio suficiente en la página actual
            if (yPosition + requiredHeight > pageHeight - margin) {
                addNewPage();
            }
            
            // Añadir texto línea por línea para mejor control
            lines.forEach((line, lineIndex) => {
                pdf.text(line, margin, yPosition + (lineIndex * lineHeight));
            });
            
            yPosition += lines.length * lineHeight + paragraphSpacing;
            
            // Si el próximo párrafo no cabe, crear nueva página
            if (index < paragraphs.length - 1) {
                const nextText = paragraphs[index + 1];
                const nextLines = dividirTextoEnLineas(pdf, nextText, contentWidth, pdfFontSize);
                const nextHeight = nextLines.length * lineHeight + paragraphSpacing;
                
                if (yPosition + nextHeight > pageHeight - margin) {
                    addNewPage();
                }
            }
        });
        
        // Añadir numeración de páginas mejorada
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            pdf.setFontSize(10);
            pdf.setFont(pdfFont, 'normal');
            const pageText = `Página ${i} de ${totalPages}`;
            const pageTextWidth = pdf.getStringUnitWidth(pageText) * 10 / pdf.internal.scaleFactor;
            pdf.text(pageText, (pageWidth - pageTextWidth) / 2, pageHeight - 8);
        }
        
        // Generar archivo
        const fileName = generarNombreArchivo();
        spinner.style.display = 'none';
        mostrarVistaPreviaPDF(pdf, fileName);
        
    } catch (error) {
        console.error('Error en generarPDFEstandar:', error);
        throw error;
    }
}

// Nueva función mejorada para dividir texto en líneas sin cortar palabras
function dividirTextoEnLineas(pdf, texto, anchoMaximo, tamanoFuente) {
    const lineas = [];
    const palabras = texto.split(' ');
    let lineaActual = '';
    
    // Configurar temporalmente el tamaño de fuente para mediciones
    const tamanoOriginal = pdf.getFontSize();
    pdf.setFontSize(tamanoFuente);
    
    for (let i = 0; i < palabras.length; i++) {
        const palabra = palabras[i];
        const lineaConPalabra = lineaActual ? lineaActual + ' ' + palabra : palabra;
        
        // Medir el ancho de la línea con la nueva palabra
        const anchoLinea = pdf.getStringUnitWidth(lineaConPalabra) * tamanoFuente / pdf.internal.scaleFactor;
        
        if (anchoLinea <= anchoMaximo) {
            // La línea cabe, añadir la palabra
            lineaActual = lineaConPalabra;
        } else {
            // La línea no cabe
            if (lineaActual) {
                // Guardar la línea actual y empezar una nueva
                lineas.push(lineaActual);
                lineaActual = palabra;
            } else {
                // La palabra sola es muy larga, intentar dividirla
                const palabraDividida = dividirPalabraLarga(pdf, palabra, anchoMaximo, tamanoFuente);
                lineas.push(...palabraDividida.slice(0, -1));
                lineaActual = palabraDividida[palabraDividida.length - 1];
            }
        }
    }
    
    // Añadir la última línea si tiene contenido
    if (lineaActual) {
        lineas.push(lineaActual);
    }
    
    // Restaurar el tamaño de fuente original
    pdf.setFontSize(tamanoOriginal);
    
    return lineas;
}

// Función para dividir palabras muy largas que no caben en una línea
function dividirPalabraLarga(pdf, palabra, anchoMaximo, tamanoFuente) {
    const partes = [];
    let parteActual = '';
    
    for (let i = 0; i < palabra.length; i++) {
        const caracter = palabra[i];
        const parteConCaracter = parteActual + caracter;
        
        const anchoParteConCaracter = pdf.getStringUnitWidth(parteConCaracter) * tamanoFuente / pdf.internal.scaleFactor;
        
        if (anchoParteConCaracter <= anchoMaximo) {
            parteActual = parteConCaracter;
        } else {
            if (parteActual) {
                partes.push(parteActual + '-');
                parteActual = caracter;
            } else {
                // Incluso un caracter no cabe, forzar inclusión
                partes.push(caracter);
                parteActual = '';
            }
        }
    }
    
    if (parteActual) {
        partes.push(parteActual);
    }
    
    return partes.length > 0 ? partes : [palabra];
}

// Función mejorada para generar PDF con canvas
async function generarPDFConCanvas() {
    const contentElement = document.getElementById('content');
    const spinner = document.getElementById('loadingSpinner');
    
    try {
        // Crear múltiples contenedores para páginas
        const pdfContainers = crearContenedoresPaginados(contentElement);
        
        // Crear PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });
        
        // Configurar propiedades del documento
        pdf.setProperties({
            title: 'OpenDislex - Documento Adaptado',
            subject: 'Documento adaptado para dislexia',
            author: 'OpenDislex',
            keywords: 'dislexia, accesibilidad, lectura',
            creator: 'OpenDislex Tool'
        });
        
        // Procesar cada página
        for (let i = 0; i < pdfContainers.length; i++) {
            const container = pdfContainers[i];
            
            if (i > 0) {
                pdf.addPage();
            }
            
            // Añadir al DOM temporalmente
            document.body.appendChild(container);
            
            // Esperar a que las fuentes se carguen
            await esperarCargaFuentes();
            
            // Generar canvas con alta calidad
            const canvas = await html2canvas(container, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: contentElement.style.backgroundColor || '#FFFFFF',
                width: container.scrollWidth,
                height: container.scrollHeight,
                logging: false
            });
            
            // Convertir canvas a imagen y añadir al PDF
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            
            // Limpiar contenedor temporal
            if (document.body.contains(container)) {
                document.body.removeChild(container);
            }
        }
        
        // Mostrar resultado
        const fileName = generarNombreArchivo();
        spinner.style.display = 'none';
        mostrarVistaPreviaPDF(pdf, fileName);
        
    } catch (error) {
        console.error('Error en generarPDFConCanvas:', error);
        spinner.style.display = 'none';
        throw error;
    }
}

// Nueva función mejorada para crear contenedores paginados
function crearContenedoresPaginados(sourceElement) {
    const containers = [];
    const fontSize = parseInt(sourceElement.style.fontSize || '16px');
    const lineHeight = fontSize * 1.6;
    const pageHeight = 297; // A4 height in mm
    const margin = 12;
    const contentHeight = pageHeight - (margin * 2);
    const pixelsPerMm = 3.78; // Aproximado
    const availablePixelHeight = contentHeight * pixelsPerMm;
    const linesPerPage = Math.floor(availablePixelHeight / lineHeight);
    
    // Extraer título y párrafos
    const title = sourceElement.querySelector('h2')?.textContent || 'Sin título';
    const paragraphs = extraerParrafosOptimizado(sourceElement);
    
    let currentContainer = null;
    let currentLines = 0;
    
    const createNewContainer = () => {
        const container = document.createElement('div');
        setupPDFContainerMejorado(container, sourceElement);
        containers.push(container);
        currentLines = 0;
        return container;
    };
    
    // Crear primera página con título
    currentContainer = createNewContainer();
    
    if (title) {
        const titleElement = document.createElement('h2');
        titleElement.textContent = title;
        titleElement.style.cssText = `
            text-align: center;
            margin-bottom: 20px;
            margin-top: 5px;
            font-weight: bold;
            font-size: ${fontSize + 4}px;
            word-wrap: break-word;
            hyphens: none;
            line-height: 1.4;
        `;
        currentContainer.appendChild(titleElement);
        
        // Calcular líneas del título más precisamente
        const titleLines = Math.ceil(title.length / 60); // Estimación más conservadora
        currentLines += titleLines + 2; // +2 para el espaciado
    }
    
    // Distribuir párrafos con mejor control de palabras
    paragraphs.forEach(text => {
        // Calcular líneas necesarias más precisamente
        const palabras = text.split(' ');
        const caracteresPromedioPorLinea = 80; // Más conservador
        const lineasEstimadas = Math.ceil(text.length / caracteresPromedioPorLinea) + 1; // +1 para espaciado
        
        // Si el párrafo no cabe en la página actual, crear nueva página
        if (currentLines + lineasEstimadas > linesPerPage - 2) { // -2 para margen de seguridad
            currentContainer = createNewContainer();
        }
        
        const pElement = document.createElement('p');
        pElement.textContent = text;
        pElement.style.cssText = `
            margin-bottom: 15px;
            margin-top: 0px;
            text-align: justify;
            line-height: 1.6;
            word-wrap: break-word;
            hyphens: auto;
            word-break: normal;
            overflow-wrap: break-word;
            white-space: normal;
        `;
        
        currentContainer.appendChild(pElement);
        currentLines += lineasEstimadas;
    });
    
    return containers;
}

// Función mejorada para configurar el contenedor temporal para PDF
function setupPDFContainerMejorado(container, sourceElement) {
    const computedStyle = window.getComputedStyle(sourceElement);
    const fontSize = sourceElement.style.fontSize || '16px';
    
    container.style.cssText = `
        width: 210mm;
        height: 297mm;
        min-height: 297mm;
        max-height: 297mm;
        padding: 12mm;
        position: absolute;
        left: -9999px;
        top: 0;
        background-color: ${sourceElement.style.backgroundColor || '#FFFFFF'};
        color: ${sourceElement.style.color || '#000000'};
        font-family: ${sourceElement.style.fontFamily || 'Arial'};
        font-size: ${fontSize};
        line-height: 1.6;
        box-sizing: border-box;
        overflow: hidden;
        word-wrap: break-word;
        hyphens: auto;
        text-align: justify;
        page-break-inside: avoid;
        word-break: normal;
        overflow-wrap: break-word;
        white-space: normal;
    `;
}

// Función optimizada para extraer párrafos sin cortar palabras
function extraerParrafosOptimizado(contentElement) {
    const paragraphs = [];
    const pElements = contentElement.querySelectorAll('p');
    
    pElements.forEach(p => {
        let cleanText = p.textContent.trim();
        if (cleanText) {
            // Dividir párrafos muy largos respetando las oraciones completas
            if (cleanText.length > 1000) {
                // Intentar dividir por oraciones completas
                const oraciones = cleanText.match(/[^.!?]+[.!?]+/g) || [];
                if (oraciones.length > 1) {
                    let fragmentoActual = '';
                    oraciones.forEach(oracion => {
                        const oracionLimpia = oracion.trim();
                        if (fragmentoActual.length + oracionLimpia.length > 800 && fragmentoActual.length > 0) {
                            paragraphs.push(fragmentoActual.trim());
                            fragmentoActual = oracionLimpia;
                        } else {
                            fragmentoActual += (fragmentoActual ? ' ' : '') + oracionLimpia;
                        }
                    });
                    if (fragmentoActual.trim()) {
                        paragraphs.push(fragmentoActual.trim());
                    }
                } else {
                    // Si no hay oraciones claras, dividir por frases o comas
                    const frases = cleanText.split(/[,;]/);
                    let fragmentoActual = '';
                    frases.forEach((frase, index) => {
                        const fraseConPuntuacion = frase + (index < frases.length - 1 ? ',' : '');
                        if (fragmentoActual.length + fraseConPuntuacion.length > 800 && fragmentoActual.length > 0) {
                            paragraphs.push(fragmentoActual.trim());
                            fragmentoActual = fraseConPuntuacion;
                        } else {
                            fragmentoActual += (fragmentoActual ? '' : '') + fraseConPuntuacion;
                        }
                    });
                    if (fragmentoActual.trim()) {
                        paragraphs.push(fragmentoActual.trim());
                    }
                }
            } else {
                paragraphs.push(cleanText);
            }
        }
    });
    
    return paragraphs;
}

// Función para esperar a que las fuentes se carguen
function esperarCargaFuentes() {
    return new Promise((resolve) => {
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(resolve);
        } else {
            setTimeout(resolve, 500);
        }
    });
}

// Función para mapear fuentes CSS a fuentes PDF
function mapearFuente(cssFont) {
    const fontLower = cssFont.toLowerCase();
    
    if (fontLower.includes('arial') || fontLower.includes('helvetica')) {
        return 'helvetica';
    } else if (fontLower.includes('times') || fontLower.includes('serif')) {
        return 'times';
    } else if (fontLower.includes('courier') || fontLower.includes('monospace')) {
        return 'courier';
    } else {
        return 'helvetica';
    }
}

// Función para parsear colores CSS a RGB
function parseColor(color) {
    let r = 255, g = 255, b = 255;
    
    if (color.startsWith('#')) {
        const hex = color.substring(1);
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
    } else if (color.startsWith('rgb')) {
        const rgbValues = color.match(/\d+/g);
        if (rgbValues && rgbValues.length >= 3) {
            r = parseInt(rgbValues[0]);
            g = parseInt(rgbValues[1]);
            b = parseInt(rgbValues[2]);
        }
    }
    
    return { r, g, b };
}

// Función para generar nombre de archivo con timestamp
function generarNombreArchivo() {
    const now = new Date();
    const timestamp = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    return `OpenDislex_${timestamp}.pdf`;
}

/**
 * Función para mostrar una vista previa del PDF generado
 */
function mostrarVistaPreviaPDF(pdf, fileName) {
    try {
        // Generar blob del PDF
        const pdfBlob = pdf.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        // Crear nombre truncado para mostrar si es muy largo
        const displayFileName = fileName.length > 50 ? fileName.substring(0, 47) + '...' : fileName;
        
        // Crear un contenedor para la vista previa
        const previewContainer = document.createElement('div');
        previewContainer.className = 'pdf-preview-overlay';
        previewContainer.id = 'pdfPreviewModal';
        previewContainer.innerHTML = `
            <div class="pdf-preview-container">
                <div class="pdf-preview-header">
                    <h3 title="${fileName}">Vista previa: ${displayFileName}</h3>
                    <button class="pdf-preview-close" aria-label="Cerrar vista previa">&times;</button>
                </div>
                <div class="pdf-preview-content">
                    <iframe src="${pdfUrl}" width="100%" height="100%" title="Vista previa del PDF"></iframe>
                </div>
                <div class="pdf-preview-footer">
                    <button class="pdf-download-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Descargar PDF
                    </button>
                </div>
            </div>
        `;
        
        // Añadir estilos para la vista previa
        const style = document.createElement('style');
        style.textContent = `
            .pdf-preview-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            .pdf-preview-container {
                width: 95%;
                max-width: 1000px;
                height: 90vh;
                background-color: white;
                border-radius: 5px;
                box-shadow: 0 5px 30px rgba(0, 0, 0, 0.3);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                margin: 0;
                padding: 0;
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }
            .pdf-preview-header {
                background-color: #2196F3;
                color: white;
                padding: 10px 15px !important;
                display: flex;
                justify-content: space-between;
                align-items: center;
                width: 100%;
                box-sizing: border-box;
                height: 60px;
                flex-shrink: 0;
                min-height: 60px;
            }
            .pdf-preview-header h3 {
                margin: 0;
                font-size: 16px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: calc(100% - 50px);
                flex: 1;
                padding-right: 10px;
                cursor: default;
            }
            .pdf-preview-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                font-size: 20px;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                cursor: pointer;
                padding: 0;
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background-color 0.2s;
                flex-shrink: 0;
            }
            
            .pdf-preview-close:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            .pdf-preview-content {
                flex: 1;
                background-color: #f5f5f5;
                overflow: hidden;
                padding: 0 !important;
                margin: 0 !important;
                display: flex;
                flex-direction: column;
                height: calc(100% - 120px);
                position: relative;
            }
            .pdf-preview-content iframe {
                border: none !important;
                flex: 1;
                width: 100% !important;
                height: 100% !important;
                min-height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                display: block !important;
                position: absolute;
                top: 0;
                bottom: 0;
                left: 0;
                right: 0;
            }
            .pdf-preview-footer {
                background-color: #f5f5f5;
                padding: 10px 15px !important;
                text-align: right;
                border-top: 1px solid #e0e0e0;
                height: 60px;
                display: flex;
                align-items: center;
                justify-content: flex-end;
                flex-shrink: 0;
                min-height: 60px;
            }
            .pdf-download-btn {
                background-color: #1a73e8;
                color: white;
                border: none;
                padding: 10px 24px;
                border-radius: 4px;
                font-size: 16px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }
            .pdf-download-btn:hover {
                background-color: #0d5bcd;
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
            }
            .pdf-download-btn:active {
                transform: translateY(0);
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            }
            
            /* Estilos responsivos */
            @media (max-width: 768px) {
                .pdf-preview-container {
                    width: 95%;
                    height: 90%;
                }
                .pdf-preview-header h3 {
                    font-size: 14px;
                    max-width: calc(100% - 45px);
                }
                .pdf-download-btn {
                    padding: 8px 16px;
                    font-size: 14px;
                }
            }
            
            @media (max-width: 480px) {
                .pdf-preview-header h3 {
                    font-size: 12px;
                }
                .pdf-preview-close {
                    width: 25px;
                    height: 25px;
                    font-size: 18px;
                }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(previewContainer);
        
        // Asegurarse de que el modal sea visible
        setTimeout(() => {
            previewContainer.style.opacity = '1';
        }, 10);
        
        // Configurar eventos para la vista previa
        const closeBtn = previewContainer.querySelector('.pdf-preview-close');
        const downloadBtn = previewContainer.querySelector('.pdf-download-btn');
        
        // Función para manejar el cierre
        const handleClose = () => {
            cerrarVistaPreviaPDF(style);
            // Revocar la URL del blob para liberar memoria
            URL.revokeObjectURL(pdfUrl);
            // Eliminar eventos para evitar memory leaks
            previewContainer.removeEventListener('click', handleOutsideClick);
            document.removeEventListener('keydown', handleEscape);
        };
        
        // Cerrar al hacer clic fuera del contenido
        const handleOutsideClick = (e) => {
            if (e.target === previewContainer) {
                handleClose();
            }
        };
        
        // Cerrar con tecla Escape
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        };
        
        // Asignar eventos
        previewContainer.addEventListener('click', handleOutsideClick);
        closeBtn.addEventListener('click', handleClose);
        downloadBtn.addEventListener('click', () => {
            pdf.save(fileName);
            showCustomAlert(`PDF "OpenDislex" descargado correctamente como "${fileName}".`, 'Éxito');
        });
        document.addEventListener('keydown', handleEscape);

    } catch (error) {
        console.error('Error al mostrar la vista previa del PDF:', error);
        showCustomAlert('No se pudo mostrar la vista previa. Descargando directamente...', 'Aviso');
        // Si falla la vista previa, descargar directamente
        try {
            pdf.save(fileName);
        } catch (e) {
            console.error('Error al guardar el PDF:', e);
            showCustomAlert('No se pudo generar el PDF.', 'Error');
        }
    }
}

// Función para cerrar la vista previa del PDF
function cerrarVistaPreviaPDF(style) {
    const modal = document.getElementById('pdfPreviewModal');
    if (modal) {
        // Eliminar el modal
        document.body.removeChild(modal);
        // Eliminar los estilos si se proporcionan
        if (style && document.head.contains(style)) {
            document.head.removeChild(style);
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const customMenuToggle = document.getElementById('customMenuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    
    // Configurar eventos de accesibilidad (modo oscuro y daltonismo)
    if (typeof setupAccessibilityEvents === 'function') {
        setupAccessibilityEvents();
    } else {
        console.warn('La función setupAccessibilityEvents no está disponible');
    }
    
    if (customMenuToggle && sidebar && sidebarOverlay && closeSidebarBtn) {
        // Abrir sidebar
        customMenuToggle.addEventListener('click', function() {
            sidebar.classList.add('open');
            sidebarOverlay.style.display = 'block';
        });
        
        // Cerrar sidebar (botón X)
        closeSidebarBtn.addEventListener('click', function() {
            sidebar.classList.remove('open');
            sidebarOverlay.style.display = 'none';
        });
        
        // Cerrar sidebar (clic en overlay)
        sidebarOverlay.addEventListener('click', function() {
            sidebar.classList.remove('open');
            sidebarOverlay.style.display = 'none';
        });
    }
});