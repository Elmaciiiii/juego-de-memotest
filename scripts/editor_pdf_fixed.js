// Precargar la fuente OpenDyslexic
const preloadFont = new FontFace('OpenDyslexic', 'url(./fonts/OpenDyslexic-Regular.ttf)');
preloadFont.load().then(() => {
    document.fonts.add(preloadFont);
    console.log('Fuente OpenDyslexic precargada correctamente');
}).catch(err => {
    console.error('Error al precargar la fuente OpenDyslexic:', err);
});

// Variables globales
let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;
let pdfPages = []; // Array para almacenar el texto de cada página
let originalFileName = '';
let currentSettings = {
    fontSize: 16,
    textColor: '#000000',
    bgColor: '#ffffff',
    fontFamily: 'OpenDyslexic'
};

// Configurar PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
});

function setupEventListeners() {
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    const uploadIcon = document.querySelector('.upload-icon');
    const loadBtn = document.getElementById('loadBtn');
    let currentFile = null;
    let isLoaded = false;

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'application/pdf') {
            const newFile = files[0];
            if (!currentFile || newFile.name !== currentFile.name) {
                fileInput.files = files;
                updateUIWithFile(newFile);
                loadBtn.disabled = false;
            }
        }
    });

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
            if (!currentFile || file.name !== currentFile.name) {
                updateUIWithFile(file);
                loadBtn.disabled = false;
                // Cambiar el botón de "Seleccionar PDF" cuando hay un archivo
                uploadArea.querySelector('button').textContent = 'Seleccionar otro PDF';
                // Limpiar el estado de carga para permitir cargar nuevo archivo
                isLoaded = false;
            }
        } else {
            fileInput.files = currentFile ? new DataTransfer().files : fileInput.files;
            if (currentFile) {
                updateUIWithFile(currentFile);
                loadBtn.disabled = false;
                uploadArea.querySelector('button').textContent = 'Seleccionar otro PDF';
            } else {
                resetUI();
                loadBtn.disabled = true;
            }
        }
    });

    function updateUIWithFile(file) {
        currentFile = file;
        uploadIcon.textContent = '📄';
        uploadArea.querySelector('h3').textContent = `Archivo seleccionado: ${file.name}`;
        uploadArea.querySelector('p').textContent = 'Haz clic para cargar o arrastra otro archivo';
    }

    function resetUI() {
        currentFile = null;
        isLoaded = false;
        uploadIcon.textContent = '📁';
        uploadArea.querySelector('h3').textContent = 'Arrastra tu archivo PDF aquí';
        uploadArea.querySelector('p').textContent = 'o haz clic para seleccionar';
        uploadArea.querySelector('button').textContent = 'Seleccionar PDF';
        loadBtn.textContent = 'Cargar Contenido';
        loadBtn.disabled = true;
    }

    loadBtn.addEventListener('click', () => {
        const file = fileInput.files[0];
        if (file) {
            if (!isLoaded || file.name !== currentFile.name) {
                // Si no está cargado o es un archivo diferente, se carga
                currentFile = file;
                loadPDF();
            }
        }
    });

    // Controles de edición
    setupEditControls();
}

function setupEditControls() {
    const fontSize = document.getElementById('fontSize');
    const fontSizeValue = document.getElementById('fontSizeValue');
    const fontFamily = document.getElementById('fontFamily');

    fontSize.addEventListener('input', () => {
        currentSettings.fontSize = fontSize.value;
        fontSizeValue.textContent = fontSize.value + 'px';
        updatePreview();
    });

    fontFamily.addEventListener('change', () => {
        currentSettings.fontFamily = fontFamily.value;
        updatePreview();
    });

    // Color selectors
    setupColorSelector('textColorGrid', 'textColor');
    setupColorSelector('bgColorGrid', 'bgColor');
}

function setupColorSelector(gridId, property) {
    const grid = document.getElementById(gridId);
    const colors = grid.querySelectorAll('.color-option');

    colors.forEach(color => {
        color.addEventListener('click', () => {
            // Remove selected class from all
            colors.forEach(c => c.classList.remove('selected'));
            // Add selected class to clicked
            color.classList.add('selected');
            // Update setting
            currentSettings[property] = color.dataset.color;
            updatePreview();
        });
    });
}

async function loadPDF() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) return;

    originalFileName = file.name.replace('.pdf', '');
    showLoading(true);

    try {
        const arrayBuffer = await file.arrayBuffer();
        pdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise;
        totalPages = pdfDoc.numPages;
        
        await extractTextFromPDF();
        
        showMainContent();
        updatePreview();
        updatePageInfo();
        
    } catch (error) {
        console.error('Error loading PDF:', error);
        alert('Error al cargar el PDF. Por favor, intenta con otro archivo.');
    } finally {
        showLoading(false);
    }
}

async function extractTextFromPDF() {
    pdfPages = [];
    
    for (let i = 1; i <= totalPages; i++) {
        try {
            const page = await pdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            
            // Agrupar elementos de texto por líneas basado en posición Y
            const lines = [];
            const tolerance = 5; // Tolerancia para considerar elementos en la misma línea
            
            // Ordenar elementos por posición Y (de arriba a abajo)
            const sortedItems = textContent.items
                .filter(item => item.str && item.str.trim() !== '')
                .sort((a, b) => b.transform[5] - a.transform[5]);
            
            // Agrupar elementos por líneas
            for (const item of sortedItems) {
                const y = item.transform[5];
                const x = item.transform[4];
                
                // Filtrar elementos de texto muy pequeños o posiblemente superpuestos
                if (item.str.length === 0 || item.str.trim() === '') {
                    continue;
                }
                
                // Buscar si existe una línea con Y similar
                let lineFound = false;
                for (const line of lines) {
                    if (Math.abs(line.y - y) <= tolerance) {
                        // Verificar si ya existe un elemento muy similar en la misma posición
                        const existingSimilar = line.items.find(existing => 
                            Math.abs(existing.x - x) <= 5 && existing.text.trim() === item.str.trim()
                        );
                        
                        if (!existingSimilar) {
                            line.items.push({ text: item.str, x: x });
                        }
                        lineFound = true;
                        break;
                    }
                }
                
                // Si no se encontró una línea similar, crear una nueva
                if (!lineFound) {
                    lines.push({
                        y: y,
                        items: [{ text: item.str, x: x }]
                    });
                }
            }
            
            // Ordenar líneas por Y (de arriba a abajo) y elementos dentro de cada línea por X (izquierda a derecha)
            lines.sort((a, b) => b.y - a.y);
            lines.forEach(line => {
                line.items.sort((a, b) => a.x - b.x);
            });
            
            // Reconstruir el texto línea por línea con lógica de párrafos
            let pageText = '';
            for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                const line = lines[lineIndex];
                const nextLine = lines[lineIndex + 1];
                let lineText = '';
                
                for (let itemIndex = 0; itemIndex < line.items.length; itemIndex++) {
                    const currentItem = line.items[itemIndex];
                    const nextItem = line.items[itemIndex + 1];
                    
                    // Agregar el texto del elemento actual
                    lineText += currentItem.text;
                    
                    // Determinar si necesitamos agregar un espacio
                    if (nextItem) {
                        const currentEndsWithSpace = currentItem.text.endsWith(' ');
                        const nextStartsWithSpace = nextItem.text.startsWith(' ');
                        
                        // Agregar espacio si no hay espacios ya presentes
                        if (!currentEndsWithSpace && !nextStartsWithSpace) {
                            // Calcular distancia aproximada entre elementos
                            const xDistance = nextItem.x - (currentItem.x + (currentItem.text.length * 7));
                            
                            // Agregar espacio si hay distancia significativa O si es necesario para separar palabras
                            if (xDistance > 1 || (!currentItem.text.match(/[.,;:!?)\]}\-]$/) && !nextItem.text.match(/^[(\[{\-.,;:!?]/))) {
                                lineText += ' ';
                            }
                        }
                    }
                }
                
                // Agregar la línea al texto de la página
                pageText += lineText.trim();
                
                // Determinar si agregar salto de línea o espacio
                if (lineIndex < lines.length - 1) {
                    const currentLineText = lineText.trim();
                    const nextLineText = nextLine.items.map(item => item.text).join('').trim();
                    
                    // Detectar si debe ser un nuevo párrafo
                    const isNewParagraph = (
                        // Línea actual termina con punto y la siguiente empieza con mayúscula
                        (currentLineText.endsWith('.') && nextLineText.match(/^[A-Z]/)) ||
                        // Línea actual termina con dos puntos (como "Respuestas:")
                        currentLineText.endsWith(':') ||
                        // La siguiente línea empieza con número seguido de paréntesis (como "1)")
                        nextLineText.match(/^\d+\)/) ||
                        // Línea muy corta (probablemente título o separador)
                        currentLineText.length < 50 ||
                        // Gran diferencia de Y entre líneas (párrafo separado)
                        Math.abs(line.y - nextLine.y) > 15
                    );
                    
                    if (isNewParagraph) {
                        pageText += '\n\n';
                    } else {
                        // Continuar el párrafo con un espacio
                        pageText += ' ';
                    }
                }
            }
            
            // Normalizar el texto preservando la estructura
            pageText = pageText
                .replace(/[ \t]+/g, ' ') // Reemplazar múltiples espacios/tabs por uno solo, pero preservar saltos de línea
                .replace(/\n\s+/g, '\n') // Eliminar espacios al inicio de líneas
                .replace(/\s+\n/g, '\n') // Eliminar espacios al final de líneas
                .replace(/\n{3,}/g, '\n\n') // Limitar saltos de línea múltiples a máximo 2
                .trim();
            
            // Agregar el texto de la página al array de páginas
            pdfPages.push(pageText);
            
        } catch (error) {
            console.error(`Error extrayendo texto de la página ${i}:`, error);
            pdfPages.push(`Error al extraer texto de la página ${i}`);
        }
    }
    
    return pdfPages;
}

function updatePreview() {
    const preview = document.getElementById('pdfPreview');
    const { fontSize, textColor, bgColor, fontFamily } = currentSettings;
    
    preview.style.fontSize = fontSize + 'px';
    preview.style.color = textColor;
    preview.style.backgroundColor = bgColor;
    preview.style.fontFamily = fontFamily;
    
    // Calcular páginas dinámicamente según el tamaño de fuente
    const dynamicPages = calculateDynamicPages();
    
    // Mostrar el texto de la página actual con formato
    const pageText = dynamicPages[currentPage - 1] || 'No hay contenido disponible para esta página';
    
    preview.innerHTML = pageText.replace(/\n/g, '<br>');
    
    // Actualizar el total de páginas dinámicas
    totalPages = dynamicPages.length;
    updatePageInfo();
    
    // Show download section
    document.getElementById('downloadSection').style.display = 'block';
}

function calculateDynamicPages() {
    // Obtener el texto completo formateado
    let allText = '';
    for (let i = 0; i < pdfPages.length; i++) {
        const pageText = pdfPages[i] || '';
        
        // Formatear igual que en la generación del PDF
        const formattedText = pageText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n\n');
        
        allText += formattedText;
        if (i < pdfPages.length - 1) {
            allText += '\n\n';
        }
    }
    
    // Configuración de página para la vista previa (similar al PDF)
    const previewHeight = 600; // Altura aproximada del contenedor de vista previa
    const lineHeight = parseInt(currentSettings.fontSize) * 1.4;
    const linesPerPage = Math.floor(previewHeight / lineHeight);
    
    // Dividir el texto en párrafos
    const paragraphs = allText.split('\n\n');
    const dynamicPages = [];
    let currentPageContent = '';
    let currentLines = 0;
    
    for (const paragraph of paragraphs) {
        if (paragraph.trim() === '') continue;
        
        // Estimar cuántas líneas ocupará este párrafo
        const words = paragraph.split(' ');
        const wordsPerLine = Math.max(1, Math.floor(80 / (parseInt(currentSettings.fontSize) / 12))); // Estimación aproximada
        const paragraphLines = Math.ceil(words.length / wordsPerLine);
        
        // Si agregar este párrafo excede el límite de líneas, crear nueva página
        if (currentLines + paragraphLines + 1 > linesPerPage && currentPageContent !== '') {
            dynamicPages.push(currentPageContent.trim());
            currentPageContent = paragraph;
            currentLines = paragraphLines;
        } else {
            if (currentPageContent !== '') {
                currentPageContent += '\n\n' + paragraph;
            } else {
                currentPageContent = paragraph;
            }
            currentLines += paragraphLines + 1; // +1 por el espacio entre párrafos
        }
    }
    
    // Agregar la última página si tiene contenido
    if (currentPageContent.trim() !== '') {
        dynamicPages.push(currentPageContent.trim());
    }
    
    return dynamicPages.length > 0 ? dynamicPages : ['No hay contenido disponible'];
}

function changePage(direction) {
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        updatePreview();
        updatePageInfo();
    }
}

function updatePageInfo() {
    document.getElementById('pageInfo').textContent = `Página ${currentPage} de ${totalPages}`;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    document.getElementById('uploadSection').style.display = show ? 'none' : 'block';
}

function showMainContent() {
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
}

const fontMap = {
    'OpenDyslexic': 'OpenDyslexic-Regular',
    'Arial': 'Arial',
    'Times New Roman': 'TimesNewRoman',
    'Courier New': 'Courier',
    'Helvetica': 'Helvetica',
};

const fontPaths = {
    'OpenDyslexic-Regular': './fonts/OpenDyslexic-Regular.ttf'
};

function preserveSpecialCharacters(text) {
    if (!text || typeof text !== 'string') {
        return text || '';
    }
    // Esta función puede ser expandida para manejar más caracteres si es necesario
    return text;
}

document.getElementById('downloadBtn').addEventListener('click', async function () {
    if (!pdfDoc || pdfPages.length === 0) {
        alert('No hay contenido para descargar');
        return;
    }

    const downloadBtn = document.getElementById('downloadBtn');
    const originalText = downloadBtn.textContent;
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Generando PDF...';

    try {
        const newPdf = await PDFLib.PDFDocument.create();
        newPdf.registerFontkit(fontkit);
        let font;

        const selectedFont = currentSettings.fontFamily;
        let fontNameToLog = 'Helvetica'; // Para logging

        const standardFonts = {
            'Arial': PDFLib.StandardFonts.Helvetica,
            'TimesNewRoman': PDFLib.StandardFonts.TimesRoman,
            'Courier': PDFLib.StandardFonts.Courier,
            'Helvetica': PDFLib.StandardFonts.Helvetica,
            'Impact': PDFLib.StandardFonts.Helvetica // Impact vuelve a ser un fallback
        };

        if (selectedFont === 'OpenDyslexic') {
            const fontKey = fontMap[selectedFont];
            const fontPath = fontPaths[fontKey];
            fontNameToLog = fontKey;
            try {
                console.log(`Cargando fuente personalizada: ${fontPath}`);
                const fontBytes = await fetch(fontPath).then(res => res.arrayBuffer());
                font = await newPdf.embedFont(fontBytes);
                console.log(`Fuente '${fontNameToLog}' incrustada correctamente.`);
            } catch (e) {
                console.error(`Error al cargar la fuente personalizada '${fontNameToLog}':`, e);
                font = await newPdf.embedFont(PDFLib.StandardFonts.Helvetica);
                fontNameToLog = 'Helvetica (fallback)';
            }
        } else if (selectedFont && fontMap[selectedFont] && standardFonts[fontMap[selectedFont]]) {
            const fontKey = fontMap[selectedFont];
            fontNameToLog = fontKey;
            try {
                font = await newPdf.embedFont(standardFonts[fontKey]);
                console.log(`Fuente estándar '${fontNameToLog}' incrustada.`);
            } catch (e) {
                console.error(`Error al incrustar la fuente estándar '${fontNameToLog}':`, e);
                font = await newPdf.embedFont(PDFLib.StandardFonts.Helvetica);
                fontNameToLog = 'Helvetica (fallback)';
            }
        } else {
            console.log('Fuente no soportada, usando Helvetica.');
            font = await newPdf.embedFont(PDFLib.StandardFonts.Helvetica);
        }

        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? { r: parseInt(result[1], 16) / 255, g: parseInt(result[2], 16) / 255, b: parseInt(result[3], 16) / 255 } : { r: 0, g: 0, b: 0 };
        };

        const textColor = hexToRgb(currentSettings.textColor);
        const bgColor = hexToRgb(currentSettings.bgColor);
        const fontSize = parseInt(currentSettings.fontSize);
        const lineHeight = fontSize * 1.4;
        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const margin = { top: 60, bottom: 60, left: 50, right: 50 };
        const maxWidth = pageWidth - margin.left - margin.right;

        const addNewPage = () => {
            const newPage = newPdf.addPage([pageWidth, pageHeight]);
            newPage.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: PDFLib.rgb(bgColor.r, bgColor.g, bgColor.b) });
            return newPage;
        };

        const measureTextWidth = (text) => font.widthOfTextAtSize(text, fontSize);

        const splitTextIntoLines = (text) => {
            const allLines = [];
            const paragraphs = text.split('\n\n'); // Dividir por párrafos (doble salto de línea)
            
            for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex++) {
                const paragraph = paragraphs[paragraphIndex].trim();
                
                if (paragraph === '') {
                    // Párrafo vacío, agregar línea en blanco
                    allLines.push('');
                    continue;
                }
                
                // Dividir el párrafo en líneas que quepan en el ancho
                const words = paragraph.split(' ');
                let currentLine = '';
                
                for (const word of words) {
                    const testLine = currentLine ? `${currentLine} ${word}` : word;
                    if (measureTextWidth(testLine) <= maxWidth) {
                        currentLine = testLine;
                    } else {
                        if (currentLine) allLines.push(currentLine);
                        currentLine = word;
                    }
                }
                
                // Agregar la última línea del párrafo
                if (currentLine) allLines.push(currentLine);
                
                // Agregar línea en blanco entre párrafos (excepto después del último)
                if (paragraphIndex < paragraphs.length - 1) {
                    allLines.push('');
                }
            }
            
            return allLines;
        };

        // Obtener el texto formateado exactamente como se ve en la vista previa
        let allText = '';
        for (let i = 0; i < pdfPages.length; i++) {
            const pageText = pdfPages[i] || '';
            
            // Formatear igual que en updatePreview()
            const formattedText = pageText
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .join('\n\n');
            
            allText += formattedText;
            if (i < pdfPages.length - 1) {
                allText += '\n\n';
            }
        }
        
        let currentPage = addNewPage();
        let y = pageHeight - margin.top;

        // Dividir por párrafos (doble salto de línea) 
        const paragraphs = allText.split('\n\n');
        
        for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex++) {
            const paragraph = paragraphs[paragraphIndex].trim();
            
            if (paragraph === '') {
                // Párrafo vacío - agregar espacio extra
                y -= lineHeight;
                continue;
            }
            
            // Dividir el párrafo en líneas que quepan en el ancho
            const words = paragraph.split(' ');
            let currentLine = '';
            
            for (const word of words) {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                if (measureTextWidth(testLine) <= maxWidth) {
                    currentLine = testLine;
                } else {
                    // Escribir la línea actual si no está vacía
                    if (currentLine.trim() !== '') {
                        // Verificar si necesitamos nueva página
                        if (y < margin.bottom + lineHeight) {
                            currentPage = addNewPage();
                            y = pageHeight - margin.top;
                        }
                        
                        currentPage.drawText(currentLine, {
                            x: margin.left,
                            y: y,
                            font: font,
                            size: fontSize,
                            color: PDFLib.rgb(textColor.r, textColor.g, textColor.b),
                        });
                        y -= lineHeight;
                    }
                    currentLine = word;
                }
            }
            
            // Escribir la última línea del párrafo
            if (currentLine.trim() !== '') {
                // Verificar si necesitamos nueva página
                if (y < margin.bottom + lineHeight) {
                    currentPage = addNewPage();
                    y = pageHeight - margin.top;
                }
                
                currentPage.drawText(currentLine, {
                    x: margin.left,
                    y: y,
                    font: font,
                    size: fontSize,
                    color: PDFLib.rgb(textColor.r, textColor.g, textColor.b),
                });
                y -= lineHeight;
            }
            
            // Agregar espacio extra entre párrafos
            if (paragraphIndex < paragraphs.length - 1) {
                y -= lineHeight * 0.5; // Espacio adicional entre párrafos
            }
        }

        const pdfBytes = await newPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${originalFileName}_editado.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (e) {
        console.error('Error generando PDF:', e);
        alert('Hubo un error al crear el PDF: ' + e.message);
    } finally {
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.textContent = originalText;
        }
    }
});

// Función para cambiar el modo daltónico
function changeColorblindMode(selectedMode) {
    const body = document.body;
    
    // Si no se proporciona un valor, obtenerlo del selector
    if (!selectedMode) {
        const modeSelect = document.getElementById('colorblindMode');
        if (modeSelect) {
            selectedMode = modeSelect.value;
        } else {
            selectedMode = 'normal';
        }
    }
    
    // Remover todas las clases de daltonismo existentes
    body.classList.remove('protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia');
    
    // Aplicar la nueva clase si no es 'normal'
    if (selectedMode !== 'normal') {
        body.classList.add(selectedMode);
    }
    
    console.log(`Modo daltónico cambiado a: ${selectedMode}`);
}

// Configurar el evento de cambio para el selector de modo daltónico
document.addEventListener('DOMContentLoaded', function() {
    const colorblindMode = document.getElementById('colorblindMode');
    if (colorblindMode) {
        colorblindMode.addEventListener('change', function() {
            changeColorblindMode(this.value);
        });
        
        // Aplicar el modo inicial
        changeColorblindMode(colorblindMode.value);
    }
});
