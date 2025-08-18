// JavaScript para el menú principal

document.addEventListener('DOMContentLoaded', function() {
    // Animación de las secciones al cargar la página
    animateSections();
    
    // Efecto hover en las secciones
    setupSectionHoverEffects();
    
    // Inicializar los estilos guardados
    initializeStyles();
});

// Función para animar las secciones con un efecto escalonado
function animateSections() {
    const sections = document.querySelectorAll('.menu-section');
    
    // Las animaciones ya están configuradas en CSS con delays
    // Esta función puede extenderse para animaciones más complejas
    
    // Añadimos una animación adicional para los iconos
    setTimeout(() => {
        document.querySelectorAll('.section-icon').forEach(icon => {
            icon.style.animation = 'pulse 2s infinite';
        });
    }, 1500);
}

// Configurar efectos de hover más avanzados para las secciones
function setupSectionHoverEffects() {
    const sections = document.querySelectorAll('.menu-section');
    
    sections.forEach(section => {
        section.addEventListener('mouseenter', function() {
            // Añadir clase para efecto de elevación
            this.classList.add('section-hover');
            
            // Efecto de brillo en el botón
            const button = this.querySelector('.section-button');
            if (button) {
                button.style.boxShadow = '0 0 15px rgba(247, 148, 29, 0.7)';
            }
        });
        
        section.addEventListener('mouseleave', function() {
            // Quitar clase al salir
            this.classList.remove('section-hover');
            
            // Restaurar botón
            const button = this.querySelector('.section-button');
            if (button) {
                button.style.boxShadow = '';
            }
        });
    });
}

// Inicializar estilos guardados (para mantener consistencia con otras páginas)
function initializeStyles() {
    // Cargar preferencias de localStorage si existen
    const savedFontSize = localStorage.getItem('fontSize');
    const savedFontColor = localStorage.getItem('fontColor');
    const savedBgColor = localStorage.getItem('bgColor');
    const savedFontFamily = localStorage.getItem('fontFamily');
    const savedLineSpacing = localStorage.getItem('lineSpacing');
    const savedLetterSpacing = localStorage.getItem('letterSpacing');
    const savedDarkMode = localStorage.getItem('darkMode');
    const savedColorblindMode = localStorage.getItem('colorblindMode');
    
    // Aplicar estilos guardados
    if (savedFontSize) document.documentElement.style.setProperty('--font-size', savedFontSize + 'px');
    if (savedFontColor) document.documentElement.style.setProperty('--text-color', savedFontColor);
    if (savedBgColor) document.documentElement.style.setProperty('--background-color', savedBgColor);
    if (savedFontFamily) document.documentElement.style.setProperty('--font-family', savedFontFamily);
    if (savedLineSpacing) document.documentElement.style.setProperty('--line-height', savedLineSpacing);
    if (savedLetterSpacing) document.documentElement.style.setProperty('--letter-spacing', savedLetterSpacing);
    
    // Aplicar modo oscuro si estaba activado
    if (savedDarkMode === 'true') {
        document.body.classList.add('dark-mode');
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) darkModeToggle.checked = true;
    }
    
    // Aplicar modo daltónico si estaba seleccionado
    if (savedColorblindMode && savedColorblindMode !== 'normal') {
        document.body.classList.add(savedColorblindMode);
        const colorblindSelect = document.getElementById('colorblindMode');
        if (colorblindSelect) colorblindSelect.value = savedColorblindMode;
    }
    
    // Configurar los eventos para el modo oscuro y daltonismo
    setupAccessibilityEvents();
}

// Animación de pulso para los iconos
document.head.insertAdjacentHTML('beforeend', `
<style>
@keyframes pulse {
    0% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.1);
    }
    100% {
        transform: scale(1);
    }
}
.section-hover {
    transform: translateY(-8px) !important;
    transition: transform 0.3s ease-out !important;
}
</style>
`);

// Función para mostrar alertas personalizadas
function showCustomAlert(message) {
    const customAlert = document.getElementById('customAlert');
    const customAlertMessage = document.getElementById('customAlertMessage');
    
    if (customAlert && customAlertMessage) {
        customAlertMessage.textContent = message;
        customAlert.style.display = 'flex';
        
        // Configurar botón de cierre
        const closeBtn = document.querySelector('.custom-alert-close');
        const acceptBtn = document.getElementById('customAlertBtn');
        
        const closeAlert = function() {
            customAlert.style.display = 'none';
        };
        
        if (closeBtn) closeBtn.onclick = closeAlert;
        if (acceptBtn) acceptBtn.onclick = closeAlert;
    }
}

// Función para configurar los eventos de accesibilidad (modo oscuro y daltonismo)
function setupAccessibilityEvents() {
    // Configurar el cambio de modo oscuro
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', function() {
            if (this.checked) {
                document.body.classList.add('dark-mode');
                localStorage.setItem('darkMode', 'true');
            } else {
                document.body.classList.remove('dark-mode');
                localStorage.setItem('darkMode', 'false');
            }
        });
    }
    
    // Configurar el cambio de modo daltónico
    const colorblindMode = document.getElementById('colorblindMode');
    if (colorblindMode) {
        colorblindMode.addEventListener('change', function() {
            // Primero eliminar todas las clases de daltonismo
            document.body.classList.remove('protanopia', 'tritanopia');
            
            // Luego añadir la clase seleccionada si no es 'normal'
            if (this.value !== 'normal') {
                document.body.classList.add(this.value);
            }
            
            // Guardar la preferencia
            localStorage.setItem('colorblindMode', this.value);
        });
    }
}

// Configurar la barra lateral de personalización
document.addEventListener('DOMContentLoaded', function() {
    // Ya no necesitamos esta parte porque eliminamos el menú de personalización del index
});
