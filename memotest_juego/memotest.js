// Variables del juego
let cards = [];
let hasFlippedCard = false;
let lockBoard = false;
let firstCard, secondCard;
let matchedPairs = 0;
let currentMode = '';
let sounds = {};
let gameTimer = null;
let gameStartTime = null;
let gameDuration = 0;

// Elementos del DOM
const gameBoard = document.getElementById('gameBoard');
const startBtn = document.getElementById('startBtn');
const sidebarStartBtn = document.getElementById('sidebarStartBtn');
const changeModeBtn = document.getElementById('changeModeBtn');
const scoreDisplay = document.getElementById('score');
const modeCards = document.querySelectorAll('.mode-card');
const changeModeModal = document.getElementById('changeModeModal');
const cancelChangeMode = document.getElementById('cancelChangeMode');
const confirmChangeMode = document.getElementById('confirmChangeMode');
const victoryModal = document.getElementById('victoryModal');
const playAgainBtn = document.getElementById('playAgainBtn');
const newGameBtn = document.getElementById('newGameBtn');
const restartBtn = document.getElementById('restartBtn');
const timerDisplay = document.getElementById('timer');
const currentModeBadge = document.getElementById('currentModeBadge');

// Datos para los diferentes modos de juego
const gameData = {
    'image-image': {
        pairs: 8,
        items: [
            { id: 1, content: '🐱', type: 'emoji' },
            { id: 2, content: '🐶', type: 'emoji' },
            { id: 3, content: '🐭', type: 'emoji' },
            { id: 4, content: '🐰', type: 'emoji' },
            { id: 5, content: '🦊', type: 'emoji' },
            { id: 6, content: '🐻', type: 'emoji' },
            { id: 7, content: '🐼', type: 'emoji' },
            { id: 8, content: '🦁', type: 'emoji' }
        ]
    },
    'image-word': {
        pairs: 8,
        items: [
            { id: 1, content: '🐱', match: 'gato', type: 'emoji' },
            { id: 2, content: '🐶', match: 'perro', type: 'emoji' },
            { id: 3, content: '🐭', match: 'ratón', type: 'emoji' },
            { id: 4, content: '🐰', match: 'conejo', type: 'emoji' },
            { id: 5, content: '🦊', match: 'zorro', type: 'emoji' },
            { id: 6, content: '🐻', match: 'oso', type: 'emoji' },
            { id: 7, content: '🐼', match: 'panda', type: 'emoji' },
            { id: 8, content: '🦁', match: 'león', type: 'emoji' }
        ]
    },
    'sound-image': {
        pairs: 8, // 8 pares = 16 cartas total
        items: [
            { id: 1, content: '🐱', sound: 'gato', type: 'emoji' },
            { id: 2, content: '🐶', sound: 'perro', type: 'emoji' },
            { id: 3, content: '🐷', sound: 'chancho', type: 'emoji' },
            { id: 4, content: '🐴', sound: 'caballo', type: 'emoji' },
            { id: 5, content: '🐔', sound: 'gallo', type: 'emoji' },
            { id: 6, content: '🐦', sound: 'pajar', type: 'emoji' },
            { id: 7, content: '🐄', sound: 'vaca', type: 'emoji' },
            { id: 8, content: '🦆', sound: 'pato', type: 'emoji' }
        ]
    },
'numbers': {
    pairs: 8,
    items: [
        { id: 1, content: '1', type: 'number' },
        { id: 2, content: '2', type: 'number' },
        { id: 3, content: '3', type: 'number' },
        { id: 4, content: '4', type: 'number' },
        { id: 5, content: '5', type: 'number' },
        { id: 6, content: '6', type: 'number' },
        { id: 7, content: '7', type: 'number' },
        { id: 8, content: '8', type: 'number' }
    ]
}

};

// Animación de pulso para la selección
const pulseKeyframes = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.03); }
        100% { transform: scale(1); }
    }
`;

// Agregar estilos de animación
const styleElement = document.createElement('style');
styleElement.textContent = pulseKeyframes;
document.head.appendChild(styleElement);

// Inicialización del juego
function initGame() {
    // Cargar sonidos
    loadSounds();
    
    // Deshabilitar botón de inicio por defecto
    startBtn.disabled = true;
    
    // Cargar último modo seleccionado si existe
    const lastMode = localStorage.getItem('lastSelectedMode');
    if (lastMode) {
        const lastModeElement = document.querySelector(`.mode-card[data-mode="${lastMode}"]`);
        if (lastModeElement) {
            lastModeElement.click(); // Simular clic en el último modo seleccionado
        }
    }
    
    // Event listeners
    startBtn.addEventListener('click', startGame);
    changeModeBtn.addEventListener('click', changeGameMode);
    
    // Selección de modo de juego
    modeCards.forEach(card => {
        card.addEventListener('click', () => {
            // Si ya está activo, no hacer nada
            if (card.classList.contains('active')) return;
            
            // Remover clase activa de todas las tarjetas
            modeCards.forEach(c => c.classList.remove('active'));
            
            // Agregar clase activa a la tarjeta seleccionada
            card.classList.add('active');
            
            // Agregar clase de animación
            card.style.animation = 'pulse 0.5s';
            
            // Remover la animación después de que termine
            setTimeout(() => {
                card.style.animation = '';
            }, 500);
            
            // Habilitar botón de inicio
            startBtn.disabled = false;
            currentMode = card.dataset.mode;
            
            // Guardar la selección en el almacenamiento local
            localStorage.setItem('lastSelectedMode', currentMode);
        });
    });

    // Configuración del modo oscuro
    const darkModeToggle = document.getElementById('darkModeToggle');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Verificar preferencias del sistema
    if (prefersDarkScheme.matches) {
        document.body.classList.add('dark-mode');
        darkModeToggle.textContent = '☀️';
    } else {
        // Asegurar que el botón muestre la luna por defecto
        darkModeToggle.textContent = '🌙';
    }
    
    // Cargar estado guardado del modo oscuro
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
        document.body.classList.add('dark-mode');
        darkModeToggle.textContent = '☀️';
    } else if (savedDarkMode === 'false') {
        document.body.classList.remove('dark-mode');
        darkModeToggle.textContent = '🌙';
    }
    
    // Alternar modo oscuro
    darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        darkModeToggle.textContent = isDarkMode ? '☀️' : '🌙';
        localStorage.setItem('darkMode', isDarkMode);
    });

    // Configuración de accesibilidad para daltonismo
    const colorblindMode = document.getElementById('colorblindMode');
    
    // Cargar estado guardado del modo de daltonismo
    const savedColorMode = localStorage.getItem('colorMode');
    if (savedColorMode && savedColorMode !== 'normal') {
        document.body.classList.add(savedColorMode);
        colorblindMode.value = savedColorMode;
        // Aplicar el filtro a las cartas existentes si las hay
        setTimeout(() => {
            updateCardsForColorblindMode(savedColorMode);
        }, 100);
    }
    
    colorblindMode.addEventListener('change', (e) => {
        // Remover todas las clases de daltonismo
        document.body.classList.remove('protanopia', 'tritanopia');
        
        // Agregar la nueva clase si no es normal
        if (e.target.value !== 'normal') {
            document.body.classList.add(e.target.value);
        }
        
        // Preservar modo oscuro si está activo
        if (darkModeToggle.innerHTML.includes('<div class="sun-icon">')) {
            document.body.classList.add('dark-mode');
        }
        
        // Actualizar las cartas existentes con el nuevo filtro de daltonismo
        updateCardsForColorblindMode(e.target.value);
        
        localStorage.setItem('colorMode', e.target.value);
    });

    // Event listeners para el modal de cambio de modo
    cancelChangeMode.addEventListener('click', () => {
        changeModeModal.classList.remove('show');
    });

    confirmChangeMode.addEventListener('click', () => {
        // Ocultar modal
        changeModeModal.classList.remove('show');
        
        // Resetear a la selección de modos
        resetToModeSelection();
    });

    // Event listeners para el modal de victoria
    playAgainBtn.addEventListener('click', playAgain);

    newGameBtn.addEventListener('click', () => {
        victoryModal.classList.remove('show');
        resetToModeSelection(); // Volver a la selección de modos
    });

    // Event listeners para los botones del sidebar
    restartBtn.addEventListener('click', restartGame);
    
    // Event listener para el botón de comenzar del sidebar
    sidebarStartBtn.addEventListener('click', startGameTimer);

    // Cerrar modal haciendo clic fuera de él
    changeModeModal.addEventListener('click', (e) => {
        if (e.target === changeModeModal) {
            changeModeModal.classList.remove('show');
        }
    });

    // Cerrar modal con tecla Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && changeModeModal.classList.contains('show')) {
            changeModeModal.classList.remove('show');
        }
        if (e.key === 'Escape' && victoryModal.classList.contains('show')) {
            victoryModal.classList.remove('show');
        }
    });
}

// Cargar sonidos
function loadSounds() {
    // Sonidos para el modo de sonido - usando archivos MP3 locales
    sounds = {
        'gato': new Audio('sonidos_animales/gato.mp3'),
        'perro': new Audio('sonidos_animales/perro.mp3'),
        'chancho': new Audio('sonidos_animales/chancho.mp3'),
        'caballo': new Audio('sonidos_animales/caballo.mp3'),
        'gallo': new Audio('sonidos_animales/gallo.mp3'),
        'pajar': new Audio('sonidos_animales/pajar.mp3'),
        'vaca': new Audio('sonidos_animales/vaca.mp3'),
        'pato': new Audio('sonidos_animales/pato.mp3')
    };
    
    // Precargar todos los sonidos para mejor rendimiento
    Object.values(sounds).forEach(audio => {
        audio.load();
        audio.volume = 0.7; // Volumen moderado
    });
}

// Iniciar juego
function startGame() {
    if (!currentMode) {
        alert('Por favor, selecciona un modo de juego antes de comenzar.');
        return;
    }
    if (startBtn.disabled) {
        alert('Por favor, selecciona un modo de juego antes de comenzar.');
        return;
    }
    
    // Reiniciar variables del juego
    cards = [];
    matchedPairs = 0;
    hasFlippedCard = false;
    lockBoard = false;
    firstCard = null;
    secondCard = null;
    
    // Limpiar tablero
    gameBoard.innerHTML = '';
    
    // Ocultar selección de modos
    document.querySelector('.game-modes').style.display = 'none';
    
    // Ocultar botón de comenzar juego completamente
    startBtn.style.display = 'none';
    
    // Mostrar tablero de juego
    document.querySelector('.game-board-container').style.display = 'block';
    gameBoard.style.display = 'grid';
    
    // Agregar clase específica para el modo de sonido
    if (currentMode === 'sound-image') {
        gameBoard.classList.add('sound-image');
    } else {
        gameBoard.classList.remove('sound-image');
    }
    
    // Crear mazo de cartas
    createBoard();
    
    // Mostrar contador de puntuación
    document.querySelector('.score-display').style.display = 'block';
    document.getElementById('total-pairs').textContent = gameData[currentMode].pairs;
    
    // Mostrar modo actual
    currentModeBadge.textContent = getModeName(currentMode);
    
    // Actualizar puntuación inicial
    updateScore();
}

// Iniciar timer del juego
function startGameTimer() {
    // Deshabilitar botón de comenzar del sidebar
    sidebarStartBtn.disabled = true;
    
    // Iniciar timer
    startTimer();
    
    // Habilitar interacción con las cartas
    cards.forEach(card => {
        card.element.style.pointerEvents = 'auto';
    });
}

// Crear tablero de juego
function createBoard() {
    gameBoard.innerHTML = '';
    const modeData = gameData[currentMode];
    
    // Duplicar y mezclar las cartas
    let gameCards = [];
    
    if (currentMode === 'image-image' || currentMode === 'numbers') {
        // Para estos modos, cada ítem se convierte en un par de cartas iguales
        modeData.items.slice(0, modeData.pairs).forEach(item => {
            gameCards.push({ ...item, isMatch: false });
            gameCards.push({ ...item, isMatch: true });
        });
    } else if (currentMode === 'image-word') {
        // Para este modo, cada ítem tiene dos representaciones diferentes
        modeData.items.slice(0, modeData.pairs).forEach(item => {
            // Primera carta: imagen
            gameCards.push({
                id: item.id,
                content: item.content,
                matchContent: item.match,
                type: item.type,
                isMatch: false
            });
            
            // Segunda carta: palabra
            gameCards.push({
                id: item.id,
                content: item.match,
                matchContent: item.content,
                type: 'text',
                isMatch: true
            });
        });
    } else if (currentMode === 'sound-image') {
        // Para el modo de sonido, cada ítem se convierte en un par de cartas iguales
        modeData.items.slice(0, modeData.pairs).forEach(item => {
            gameCards.push({ ...item, isMatch: false });
            gameCards.push({ ...item, isMatch: true });
        });
    }
    
    // Mezclar las cartas
    gameCards = shuffleArray(gameCards);
    
    // Crear las cartas en el DOM
    gameCards.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.dataset.id = card.id;
        cardElement.dataset.index = index;
        cardElement.dataset.isMatch = card.isMatch;
        cardElement.dataset.sound = card.sound || '';
        
        // Contenido frontal (reverso de la carta)
        const front = document.createElement('div');
        front.className = 'card-content card-front';
        front.textContent = '?';
        
        // Contenido trasero (frente de la carta)
        const back = document.createElement('div');
        back.className = 'card-content card-back';
        
        // Personalizar el contenido según el modo de juego
        if (currentMode === 'sound-image' && card.isMatch) {
            // Para el modo de sonido, mostrar icono de altavoz en la segunda carta
            back.innerHTML = '<i class="fas fa-volume-up" style="font-size: 2rem; color: var(--accent);"></i>';
        } else if (currentMode === 'colors' && card.type === 'color') {
            // Para el modo de colores, crear un elemento div con el color RGB
            const colorElement = document.createElement('div');
            colorElement.style.width = '60px';
            colorElement.style.height = '60px';
            
            // Determinar qué color usar basado en el modo de daltonismo
            const currentColorblindMode = document.getElementById('colorblindMode').value;
            let colorToUse = card.rgb; // Color normal por defecto
            
            if (currentColorblindMode === 'protanopia' && card.protanopia) {
                colorToUse = card.protanopia;
            } else if (currentColorblindMode === 'tritanopia' && card.tritanopia) {
                colorToUse = card.tritanopia;
            }
            
            colorElement.style.backgroundColor = colorToUse;
            colorElement.style.borderRadius = '50%';
            colorElement.style.border = colorToUse === '#FFFFFF' ? '2px solid #ccc' : 'none';
            colorElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            colorElement.title = card.name;
            back.appendChild(colorElement);
        } else {
            back.textContent = card.content;
            if (card.type === 'emoji') {
                back.style.fontSize = '2.5rem';
            }
        }
        
        cardElement.appendChild(front);
        cardElement.appendChild(back);
        
        // Agregar evento de clic
        cardElement.addEventListener('click', flipCard);
        
        // Deshabilitar interacción inicialmente
        cardElement.style.pointerEvents = 'none';
        
        // Agregar al tablero
        gameBoard.appendChild(cardElement);
        
        // Aplicar filtro de daltonismo si está activo
        const currentColorblindMode = document.getElementById('colorblindMode').value;
        if (currentColorblindMode !== 'normal') {
            if (currentColorblindMode === 'protanopia') {
                cardElement.style.filter = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\'><filter id=\'protanopia\'><feColorMatrix type=\'matrix\' values=\'0.567, 0.433, 0, 0, 0, 0.558, 0.442, 0, 0, 0, 0, 0.242, 0.758, 0, 0, 0, 0, 0, 1, 0\'/></filter></svg>#protanopia")';
            } else if (currentColorblindMode === 'tritanopia') {
                cardElement.style.filter = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\'><filter id=\'tritanopia\'><feColorMatrix type=\'matrix\' values=\'0.95, 0.05, 0, 0, 0, 0, 0.433, 0.567, 0, 0, 0, 0.475, 0.525, 0, 0, 0, 0, 0, 1, 0\'/></filter></svg>#tritanopia")';
            }
        }
        
        // Guardar referencia a la carta
        cards.push({
            element: cardElement,
            id: card.id,
            isFlipped: false,
            isMatched: false,
            isMatch: card.isMatch,
            content: card.content,
            matchContent: card.matchContent,
            type: card.type,
            sound: card.sound
        });
    });
}

// Voltear carta
function flipCard() {
    if (lockBoard) {
        console.log('Tablero bloqueado, no se puede voltear más cartas');
        return;
    }
    
    const cardIndex = parseInt(this.dataset.index);
    const card = cards[cardIndex];
    
    // No hacer nada si la carta ya está volteada o emparejada
    if (card.isFlipped || card.isMatched) {
        console.log('Carta ya volteada o emparejada');
        return;
    }
    
    // Verificar si ya hay 2 cartas volteadas (debería ser imposible, pero por seguridad)
    if (hasFlippedCard && firstCard && secondCard) {
        console.log('Ya hay 2 cartas volteadas, esperando...');
        return;
    }
    
    // Voltear la carta
    this.classList.add('flipped');
    card.isFlipped = true;
    
    console.log(`Carta volteada: ${cardIndex}, hasFlippedCard: ${hasFlippedCard}, lockBoard: ${lockBoard}`);
    
    // Reproducir sonido solo si es una carta con logo de altavoz (isMatch = true)
    if (card.sound && currentMode === 'sound-image' && card.isMatch) {
        playSound(card.sound);
    }
    
    // Verificar si es la primera o segunda carta volteada
    if (!hasFlippedCard) {
        // Primera carta
        hasFlippedCard = true;
        firstCard = card;
        console.log('Primera carta volteada');
        return;
    }
    
    // Segunda carta - bloquear el tablero inmediatamente
    secondCard = card;
    lockBoard = true;
    console.log('Segunda carta volteada, tablero bloqueado');
    checkForMatch();
}

// Verificar si hay coincidencia
function checkForMatch() {
    const isMatch = firstCard.id === secondCard.id;
    
    if (isMatch) {
        // Esperar 1 segundo para que vean el contenido de las cartas
        setTimeout(() => {
            // Mostrar tick en ambas cartas
            firstCard.element.classList.add('correct');
            secondCard.element.classList.add('correct');
            
            // Esperar un poco para que se vea el tick
            setTimeout(() => {
                disableCards();
                matchedPairs++;
                updateScore();
                
                // Verificar si se completó el juego
                if (matchedPairs === gameData[currentMode].pairs) {
                    setTimeout(() => {
                        showVictoryModal();
                    }, 800);
                }
            }, 600);
        }, 1000);
    } else {
        // Esperar 1 segundo para que vean el contenido de las cartas
        setTimeout(() => {
            // Mostrar cruz en ambas cartas
            firstCard.element.classList.add('incorrect');
            secondCard.element.classList.add('incorrect');
            
            // Después de un tiempo, voltear las cartas
            setTimeout(() => {
                unflipCards();
            }, 800);
        }, 1000);
    }
}

// Deshabilitar cartas emparejadas
function disableCards() {
    firstCard.isMatched = true;
    secondCard.isMatched = true;
    
    // Marcar como emparejadas visualmente
    firstCard.element.classList.add('matched');
    secondCard.element.classList.add('matched');
    
    // Eliminar eventos de clic
    firstCard.element.removeEventListener('click', flipCard);
    secondCard.element.removeEventListener('click', flipCard);
    
    resetBoard();
}

// Volver a voltear las cartas si no hay coincidencia
function unflipCards() {
    lockBoard = true;
    
    setTimeout(() => {
        // Remover cruces
        firstCard.element.classList.remove('incorrect');
        secondCard.element.classList.remove('incorrect');
        
        // Voltear las cartas
        firstCard.element.classList.remove('flipped');
        secondCard.element.classList.remove('flipped');
        
        firstCard.isFlipped = false;
        secondCard.isFlipped = false;
        
        resetBoard();
    }, 500);
}

// Reiniciar el tablero después de cada jugada
function resetBoard() {
    hasFlippedCard = false;
    lockBoard = false;
    firstCard = null;
    secondCard = null;
}

// Actualizar puntuación
function updateScore() {
    scoreDisplay.textContent = matchedPairs;
    document.getElementById('total-pairs').textContent = gameData[currentMode].pairs;
}

// Reiniciar juego
function resetGame() {
    // Detener timer
    stopTimer();
    
    // Limpiar variables
    cards = [];
    matchedPairs = 0;
    resetBoard();
    
    // Limpiar tablero
    gameBoard.innerHTML = '';
    
    // Ocultar contenedor del tablero
    document.querySelector('.game-board-container').style.display = 'none';
    
    // Reiniciar puntuación
    updateScore();
    
    // Solo mostrar selección de modos si no estamos en el proceso de cambio de modo
    if (!changeModeModal.classList.contains('show')) {
        // Mostrar selección de modos
        document.querySelector('.game-modes').style.display = 'grid';
        
        // Mostrar botón de comenzar juego
        startBtn.style.display = 'inline-flex';
        
        // Deshabilitar botón de inicio hasta que se seleccione un modo
        startBtn.disabled = true;
    }
    
    // Habilitar botón del sidebar
    sidebarStartBtn.disabled = false;
}

// Función para mezclar array (algoritmo de Fisher-Yates)
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Función para cambiar de modo de juego
function changeGameMode() {
    // Volver directamente a la selección de modos
    resetToModeSelection();
}

// Función para resetear a la selección de modos
function resetToModeSelection() {
    // Detener timer si está activo
    stopTimer();
    
    // Limpiar variables del juego
    cards = [];
    matchedPairs = 0;
    resetBoard();
    
    // Limpiar tablero
    gameBoard.innerHTML = '';
    
    // Ocultar tablero de juego
    document.querySelector('.game-board-container').style.display = 'none';
    
    // Mostrar selección de modos
    document.querySelector('.game-modes').style.display = 'grid';
    
    // Mostrar botón de comenzar juego
    startBtn.style.display = 'inline-flex';
    
    // Deshabilitar botón de inicio hasta que se seleccione un modo
    startBtn.disabled = true;
    
    // Reiniciar puntuación
    updateScore();
    
    // Limpiar selección activa
    modeCards.forEach(c => c.classList.remove('active'));
    currentMode = '';
    
    // Habilitar botón del sidebar
    sidebarStartBtn.disabled = false;
}

// Reproducir sonido
function playSound(sound) {
    if (sounds[sound]) {
        try {
            sounds[sound].currentTime = 0;
            sounds[sound].play().catch(e => {
                console.error('Error al reproducir sonido:', e);
                // Fallback: usar sonidos del sistema si es posible
                if (sound === 'gato') {
                    // Intentar reproducir un beep simple
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    
                    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                    
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.2);
                }
            });
        } catch (error) {
            console.error('Error al reproducir sonido:', error);
        }
    }
}

// Obtener nombre del modo de juego
function getModeName(mode) {
    const names = {
        'image-image': 'Imagen con Imagen',
        'image-word': 'Imagen con Palabra',
        'sound-image': 'Sonido con Imagen',
        'numbers': 'Números'
    };
    return names[mode] || '';
}

// Mostrar modal de victoria
function showVictoryModal() {
    // Detener timer
    stopTimer();
    
    // Calcular tiempo total del juego
    const totalTime = gameDuration;
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Actualizar información del modal
    document.getElementById('victoryModeName').textContent = getModeName(currentMode);
    document.getElementById('victoryTime').textContent = timeString;
    
    // Mostrar modal
    victoryModal.classList.add('show');
}

// Funciones del timer
function startTimer() {
    gameStartTime = Date.now();
    gameTimer = setInterval(updateTimer, 1000);
}

function stopTimer() {
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    gameDuration = elapsed;
}

// Funciones de los botones del sidebar
function restartGame() {
    // Detener timer actual
    stopTimer();
    
    // Reiniciar variables del juego
    cards = [];
    matchedPairs = 0;
    hasFlippedCard = false;
    lockBoard = false;
    firstCard = null;
    secondCard = null;
    
    // Limpiar tablero
    gameBoard.innerHTML = '';
    
    // Crear nuevo tablero
    createBoard();
    
    // Reiniciar puntuación
    updateScore();
    
    // Habilitar botón de comenzar del sidebar
    sidebarStartBtn.disabled = false;
    
    // Resetear timer
    timerDisplay.textContent = '00:00';
}

// Función para jugar otra vez después de victoria
function playAgain() {
    // Ocultar modal de victoria
    victoryModal.classList.remove('show');
    
    // Reiniciar variables del juego
    cards = [];
    matchedPairs = 0;
    hasFlippedCard = false;
    lockBoard = false;
    firstCard = null;
    secondCard = null;
    
    // Limpiar tablero
    gameBoard.innerHTML = '';
    
    // Crear nuevo tablero
    createBoard();
    
    // Reiniciar puntuación
    updateScore();
    
    // Resetear timer
    timerDisplay.textContent = '00:00';
    
    // Habilitar botón de comenzar del sidebar
    sidebarStartBtn.disabled = false;
    
    // Las cartas estarán deshabilitadas hasta que se haga clic en "Comenzar" del sidebar
    cards.forEach(card => {
        card.element.style.pointerEvents = 'none';
    });
}

// Función para actualizar las cartas con el filtro de daltonismo
function updateCardsForColorblindMode(colorblindMode) {
    // Obtener todas las cartas del tablero
    const cardElements = document.querySelectorAll('.card');
    
    cardElements.forEach(cardElement => {
        // Remover filtros previos
        cardElement.style.filter = '';
        
        // Si estamos en modo de colores, actualizar los colores directamente
        if (currentMode === 'colors') {
            const cardIndex = parseInt(cardElement.dataset.index);
            const cardData = cards[cardIndex];
            if (cardData && cardData.id) {
                // Encontrar el ítem correspondiente en gameData
                const item = gameData.colors.items.find(item => item.id === cardData.id);
                if (item && item.type === 'color') {
                    // Encontrar el elemento de color dentro de la carta
                    const colorElement = cardElement.querySelector('.card-back div');
                    if (colorElement) {
                        let colorToUse = item.rgb; // Color normal por defecto
                        
                        if (colorblindMode === 'protanopia' && item.protanopia) {
                            colorToUse = item.protanopia;
                        } else if (colorblindMode === 'tritanopia' && item.tritanopia) {
                            colorToUse = item.tritanopia;
                        }
                        
                        colorElement.style.backgroundColor = colorToUse;
                        colorElement.style.border = colorToUse === '#FFFFFF' ? '2px solid #ccc' : 'none';
                    }
                }
            }
        } else {
            // Para otros modos, aplicar el filtro SVG
            if (colorblindMode === 'protanopia') {
                cardElement.style.filter = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\'><filter id=\'protanopia\'><feColorMatrix type=\'matrix\' values=\'0.567, 0.433, 0, 0, 0, 0.558, 0.442, 0, 0, 0, 0, 0.242, 0.758, 0, 0, 0, 0, 0, 1, 0\'/></filter></svg>#protanopia")';
            } else if (colorblindMode === 'tritanopia') {
                cardElement.style.filter = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\'><filter id=\'tritanopia\'><feColorMatrix type=\'matrix\' values=\'0.95, 0.05, 0, 0, 0, 0, 0.433, 0.567, 0, 0, 0, 0.475, 0.525, 0, 0, 0, 0, 0, 1, 0\'/></filter></svg>#tritanopia")';
            }
        }
        // Si es 'normal', no se aplica ningún filtro (ya se removió arriba)
    });
}

// Inicializar el juego cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', initGame);
