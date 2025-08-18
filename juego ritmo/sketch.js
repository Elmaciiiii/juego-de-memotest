let sonidos = {};
let nombres = ["tambor", "campana", "palmas", "flauta", "guitarra", "maraca"];
let emojis = {
  tambor: "🥁", campana: "🔔", palmas: "👏",
  flauta: "🎶", guitarra: "🎸", maraca: "🪇"
};

let botones = [];
let secuencia = [];
let usuario = [];
let instrumentosActivos = [];
let estado = "inicio";
let nivel = 1;
let rondaActual = 1;
let niveles = [3, 5, 7, 9, 12];
let cantidadInstrumentos = 4;
let turno = 0;
let audioContextStarted = false;
let indiceSecuencia = 0;

function preload() {
  for (let nombre in emojis) {
    sonidos[nombre] = loadSound(`sonidos/${nombre}.mp3`, () => {
      // Callback opcional cuando el sonido se carga
    }, (err) => {
      console.error(`Error al cargar el sonido ${nombre}:`, err);
    });
  }
}

function setup() {
  let canvas = createCanvas(700, 400);
  canvas.parent("juego");
  generarControles();
}

function draw() {
  background("#e3f2fd");
  fill(50);
  textAlign(CENTER, CENTER);
  textSize(24);
  text("Ronda: " + rondaActual, width / 2, 30);

  for (let boton of botones) {
    boton.dibujar();
  }
}

function generarControles() {
  let btn = select("#comenzar");
  let nivelSel = select("#nivel");
  let cantSel = select("#instrumentoCantidad");

  // Iniciar audio context al primer clic
  document.addEventListener('click', () => {
    if (!audioContextStarted) {
      getAudioContext().resume().then(() => {
        audioContextStarted = true;
      });
    }
  }, { once: true });

  btn.mousePressed(() => {
    detenerTodosLosSonidos();
    estado = "inicio";
    secuencia = [];
    usuario = [];
    turno = 0;
    nivel = int(nivelSel.value());
    cantidadInstrumentos = int(cantSel.value());
    instrumentosActivos = shuffle([...nombres]).slice(0, cantidadInstrumentos);
    generarBotones();
    reiniciarJuego();
    mostrarMensaje("¡Comienza el juego! Escucha la secuencia...");
  });
}

function generarBotones() {
  botones = [];
  let itemsPerRow = 3;
  let margin = 15; // Reduced margin
  
  // Calculate button size based on canvas width and number of items per row
  let size = (width - (itemsPerRow + 1) * margin) / itemsPerRow;
  size = Math.min(size, 100); // Maximum button size
  
  // Calculate number of rows needed
  let rows = Math.ceil(cantidadInstrumentos / itemsPerRow);
  
  // Calculate total height needed
  let totalHeight = rows * size + (rows - 1) * margin;
  
  // Center the grid vertically
  let startY = (height - totalHeight) / 2;
  
  // Center the grid horizontally
  let totalWidth = Math.min(cantidadInstrumentos, itemsPerRow) * (size + margin) - margin;
  let startX = (width - totalWidth) / 2;
  
  // Create buttons in a grid
  for (let i = 0; i < cantidadInstrumentos; i++) {
    let row = Math.floor(i / itemsPerRow);
    let col = i % itemsPerRow;
    
    // Center the last row if it's not full
    if (row === rows - 1 && cantidadInstrumentos % itemsPerRow !== 0) {
      let itemsInLastRow = cantidadInstrumentos % itemsPerRow;
      startX = (width - (itemsInLastRow * (size + margin) - margin)) / 2;
    }
    
    let x = startX + col * (size + margin);
    let y = startY + row * (size + margin);
    
    botones.push(new BotonInstrumento(x, y, size, instrumentosActivos[i]));
  }
}

function reiniciarJuego() {
  secuencia = [];
  usuario = [];
  turno = 0;
  rondaActual = 1;
  indiceSecuencia = 0;
  estado = "mostrando";
  agregarASecuencia();
}

function agregarASecuencia() {
  if (secuencia.length >= niveles[nivel - 1]) {
    // Ya no necesitamos mostrar el modal aquí, se maneja en mousePressed
    return;
  }

  let nuevo = random(instrumentosActivos);
  secuencia.push(nuevo);
  usuario = [];
  turno = 0;
  indiceSecuencia = 0;

  // Reproducir la secuencia completa usando el sistema correcto
  setTimeout(() => {
    reproducirSiguienteSonido();
  }, 1000);
}

function reproducirSiguienteSonido() {
  // Deshabilitar todos los botones al comenzar la reproducción
  manejarEstadoBloqueo();

  if (indiceSecuencia >= secuencia.length) {
    // Terminó de reproducir la secuencia
    estado = "jugando";
    indiceSecuencia = 0;
    
    // Habilitar botones relevantes al terminar la reproducción
    liberarEstadoBloqueo();
    
    mostrarMensaje("¡Tu turno! Repite la secuencia presionando los botones en el mismo orden.");
    return;
  }

  let nombreSonido = secuencia[indiceSecuencia];
  let sonido = sonidos[nombreSonido];
  
  if (sonido) {
    // Asegurar que el contexto de audio esté activo
    if (getAudioContext().state !== 'running') {
      getAudioContext().resume();
    }
    
    // NO resaltar el botón cuando la computadora reproduce (solo escuchar)
    // for (let boton of botones) {
    //   if (boton.nombre === nombreSonido) {
    //     boton.presionado = true;
    //     setTimeout(() => { boton.presionado = false; }, 300);
    //     break;
    //   }
    // }
    
    // Reproducir el sonido
    try {
      sonido.play();
      
      // Configurar el evento para el final de la reproducción
      sonido.onended(() => {
        // Pequeña pausa entre sonidos para mejor claridad
        setTimeout(() => {
          indiceSecuencia++;
          reproducirSiguienteSonido();
        }, 300);
      });
      
    } catch (error) {
      console.error("Error al reproducir sonido:", error);
      // Continuar con el siguiente sonido incluso si hay error
      setTimeout(() => {
        indiceSecuencia++;
        reproducirSiguienteSonido();
      }, 300);
    }
  } else {
    // Si no se puede reproducir el sonido, continuar con el siguiente
    setTimeout(() => {
      indiceSecuencia++;
      reproducirSiguienteSonido();
    }, 300);
  }
}

// Función para detener todos los sonidos (solo usar al comenzar nuevo juego)
function detenerTodosLosSonidos() {
  for (let nombre in sonidos) {
    try {
      sonidos[nombre].stop();
      // Limpiar cualquier evento pendiente
      sonidos[nombre].onended(() => {});
    } catch (error) {
      console.error(`Error al detener sonido ${nombre}:`, error);
    }
  }
}

function reproducirSecuencia() {
  if (estado === "error") return;
  
  estado = "escuchando";
  manejarEstadoBloqueo();
  
  let i = 0;
  let intervalo = setInterval(() => {
    if (i >= secuencia.length) {
      clearInterval(intervalo);
      estado = "jugando";
      liberarEstadoBloqueo();
      mostrarMensaje("¡Tu turno! Repite la secuencia.");
      return;
    }
    
    let nombreSonido = secuencia[i];
    if (sonidos[nombreSonido]) {
      // Asegurar que el contexto de audio esté activo
      if (getAudioContext().state !== 'running') {
        getAudioContext().resume();
      }
      
      // Reproducir el sonido
      try {
        sonidos[nombreSonido].play();
        
        // NO resaltar el botón cuando la computadora reproduce (solo escuchar)
        // for (let boton of botones) {
        //   if (boton.nombre === nombreSonido) {
        //     boton.presionado = true;
        //     setTimeout(() => { boton.presionado = false; }, 300);
        //     break;
        //   }
        // }
      } catch (error) {
        console.error("Error al reproducir sonido:", error);
      }
    }
    i++;
  }, 1000); // Intervalo de 1 segundo entre sonidos
}

function mostrarMensaje(mensaje, tipo = 'info') {
  const mensajeElement = select("#mensaje");
  mensajeElement.html(mensaje);
  
  // Resetear clases
  mensajeElement.removeClass('correcto');
  mensajeElement.removeClass('incorrecto');
  
  // Añadir clase según el tipo de mensaje
  if (tipo === 'correcto') {
    mensajeElement.addClass('correcto');
  } else if (tipo === 'incorrecto') {
    mensajeElement.addClass('incorrecto');
  }
  
  // Asegurarse de que tenga la clase base
  if (!mensajeElement.class().includes('mensaje-juego')) {
    mensajeElement.addClass('mensaje-juego');
  }
  
  // Mostrar el mensaje con animación
  mensajeElement.style('display', 'block');
  mensajeElement.style('opacity', '1');
  mensajeElement.style('transform', 'translateY(0)');
  mensajeElement.style('visibility', 'visible');
}

function mostrarModalPerdiste() {
  ocultarMensaje();
  // Actualizar estadísticas en el modal
  document.getElementById('rondaAlcanzada').textContent = rondaActual - 1;
  document.getElementById('secuenciaMasLarga').textContent = secuencia.length;
  document.getElementById('nivelJugado').textContent = nivel;
  
  // Mostrar el modal
  document.getElementById('perdisteModal').style.display = 'block';
  
  // Configurar botones del modal
  document.getElementById('reintentar').onclick = function() {
    document.getElementById('perdisteModal').style.display = 'none';
    reiniciarJuego();
  };
  
  document.getElementById('cambiarConfig').onclick = function() {
    document.getElementById('perdisteModal').style.display = 'none';
    // Habilitar controles para cambiar configuración
    document.getElementById('controles').style.display = 'flex';
    document.getElementById('comenzar').disabled = false;
  };
  
  document.getElementById('cerrarModal').onclick = function() {
    document.getElementById('perdisteModal').style.display = 'none';
  };
  
  // Cerrar con la X
  document.querySelector('#perdisteModal .cerrar').onclick = function() {
    document.getElementById('perdisteModal').style.display = 'none';
  };
}

function mostrarModalGanaste() {
  // Ocultar cualquier mensaje visible
  const mensajeElement = select("#mensaje");
  mensajeElement.style('display', 'none');
  
  // Crear modal de victoria dinámicamente
  const modalHTML = `
    <div id="ganasteModal" class="modal mostrar">
      <div class="modal-contenido">
        <span class="cerrar">&times;</span>
        <h2>🎉 ¡Felicitaciones! ¡Ganaste el Nivel ${nivel}!</h2>
        <div class="resultado-juego">
          <div class="estadisticas">
            <h3>🏆 Tu Logro</h3>
            <p><strong>Nivel completado:</strong> ${nivel}</p>
            <p><strong>Secuencia final:</strong> ${niveles[nivel - 1]} sonidos</p>
            <p><strong>Rondas jugadas:</strong> ${rondaActual - 1}</p>
          </div>
          
          <div class="consejos">
            <h3>🎯 ¿Qué sigue?</h3>
            <ul>
              <li>¡Intenta el siguiente nivel!</li>
              <li>Prueba con más instrumentos</li>
              <li>¡Sigue practicando!</li>
            </ul>
          </div>
        </div>
        
        <div class="botones-modal">
          <button id="siguienteNivel" class="btn-modal">🚀 Siguiente Nivel</button>
          <button id="repetirNivel" class="btn-modal btn-secundario">🔄 Repetir Nivel</button>
          <button id="cerrarGanaste" class="btn-modal btn-secundario">❌ Cerrar</button>
        </div>
      </div>
    </div>
  `;
  
  // Agregar el modal al DOM
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Función para ocultar mensaje al cerrar modal
  function cerrarModalGanaste() {
    document.getElementById('ganasteModal').remove();
    const mensajeElement = select("#mensaje");
    mensajeElement.style('display', 'none');
  }

  // Configurar botones
  document.getElementById('siguienteNivel').onclick = function() {
    cerrarModalGanaste();
    if (nivel < 5) {
      nivel++;
      document.getElementById('nivel').value = nivel;
      reiniciarJuego();
    } else {
      mostrarMensaje("🎉 ¡Has completado todos los niveles! ¡Eres un maestro de la memoria musical!", 'correcto');
    }
  };
  
  document.getElementById('repetirNivel').onclick = function() {
    cerrarModalGanaste();
    reiniciarJuego();
  };
  
  document.getElementById('cerrarGanaste').onclick = cerrarModalGanaste;
  // Cerrar con la X
  document.querySelector('#ganasteModal .cerrar').onclick = cerrarModalGanaste;
}

// Refuerzo para el modal de derrota (ya lo hacía, pero lo aseguro)
function ocultarMensaje() {
  const mensajeElement = select("#mensaje");
  mensajeElement.style('display', 'none');
}

function mousePressed() {
  // No hacer nada si no es el turno del jugador o si se está reproduciendo un sonido
  if (estado !== "jugando" || document.querySelector('button:disabled:not(#ayuda)')) return;

  for (let boton of botones) {
    if (boton.estaSobre(mouseX, mouseY)) {
      let seleccionado = boton.nombre;

      // Resaltar visualmente el botón presionado
      boton.presionado = true;
      setTimeout(() => { boton.presionado = false; }, 200);

      // Bloquear mientras se procesa la respuesta
      estado = "bloqueado";
      manejarEstadoBloqueo();

      // Verificar si es el sonido correcto
      if (seleccionado === secuencia[indiceSecuencia]) {
        // Sonido correcto - reproducir el sonido del botón presionado
        sonidos[seleccionado].play();
        
        indiceSecuencia++;
        
        if (indiceSecuencia >= secuencia.length) {
          // Secuencia completada correctamente - esperar a que termine el sonido
          sonidos[seleccionado].onended(() => {
            rondaActual++;
            
            // Verificar si completó el nivel
            if (secuencia.length >= niveles[nivel - 1]) {
              // Completó el nivel - mostrar modal de victoria
              mostrarModalGanaste();
            } else {
              // Aún no completó el nivel - continuar con siguiente ronda
              mostrarMensaje("✅ ¡Perfecto! Completaste la secuencia. Pasando a la ronda " + rondaActual + "...", 'correcto');
              
              setTimeout(() => {
                agregarASecuencia();
              }, 1500);
            }
          });
        } else {
          // Esperar a que termine el sonido antes de permitir el siguiente
          sonidos[seleccionado].onended(() => {
            estado = "jugando";
            liberarEstadoBloqueo();
            mostrarMensaje("¡Correcto! Ahora presiona el siguiente sonido de la secuencia...");
          });
        }
      } else {
        // Error en la secuencia - NO reproducir sonido
        estado = "error";
        liberarEstadoBloqueo();
        mostrarMensaje("❌ ¡Ups! Esa no era la secuencia.", 'incorrecto');
        
        // Mostrar el modal de "Perdiste" después de un breve retraso
        setTimeout(mostrarModalPerdiste, 1000);
      }
      
      break;
    }
  }
}

// Función para manejar el estado de bloqueo durante la reproducción
function manejarEstadoBloqueo() {
  // Deshabilitar botones de instrumentos durante el bloqueo
  document.querySelectorAll('button').forEach(btn => {
    if (btn.id !== 'ayuda' && btn.id !== 'comenzar') {
      btn.disabled = true;
    }
  });
}

// Función para liberar el estado de bloqueo
function liberarEstadoBloqueo() {
  // Habilitar botones de instrumentos
  document.querySelectorAll('button').forEach(btn => {
    if (btn.id !== 'ayuda') {
      btn.disabled = false;
    }
  });
}

class BotonInstrumento {
  constructor(x, y, size, nombre) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.nombre = nombre;
    this.presionado = false;
  }

  dibujar() {
    // Cambiar color si está presionado
    if (this.presionado) {
      fill("#8bc34a"); // Un verde más oscuro cuando se presiona
    } else {
      fill("#aed581"); // Verde normal
    }
    
    stroke(0);
    strokeWeight(2);
    rect(this.x, this.y, this.size, this.size, 15);
    
    // Sombra cuando se presiona
    if (this.presionado) {
      fill(0, 0, 0, 50);
      noStroke();
      rect(this.x + 3, this.y + 3, this.size, this.size, 15);
    }
    
    fill(0);
    noStroke();
    textSize(36);
    textAlign(CENTER, CENTER);
    text(emojis[this.nombre] || "🎵", this.x + this.size / 2, this.y + this.size / 2 - 5);
    textSize(12);
    text(this.nombre, this.x + this.size / 2, this.y + this.size - 15);
  }

  estaSobre(mx, my) {
    return mx > this.x && mx < this.x + this.size &&
           my > this.y && my < this.y + this.size;
  }
}
