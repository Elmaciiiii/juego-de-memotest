// Control de accesibilidad global para modo oscuro y daltonismo (idéntico al index)

document.addEventListener('DOMContentLoaded', function() {
    if (typeof setupAccessibilityEvents === 'function') {
        setupAccessibilityEvents();
    }
});
