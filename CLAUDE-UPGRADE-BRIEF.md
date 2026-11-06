# Brief maestro para Claude — Burrito Chichero Simulator

## Objetivo

Auditar y ampliar `Burrito Chichero Simulator`, una beta 3D para Android y navegador hecha con Three.js, TypeScript, Vite y Capacitor. El objetivo no es simular una imagen 3D con HTML: debe mantenerse como una escena WebGL/Three.js real, con modelos 3D, materiales físicos, iluminación, sombras, animaciones y controles jugables.

El juego está inspirado en La Legua–San Jacinto y el entorno rural-urbano de Piura, Perú. La referencia principal del usuario es una captura de Google Earth con un punto marcado como `INICIO`. La escena debe ser una interpretación artística respetuosa, no una copia exacta de casas privadas ni una reconstrucción que exponga domicilios.

## Referencia geográfica entregada por el usuario

Usar como punto aproximado de investigación visual el lugar señalado en la captura, cerca de:

- Latitud aproximada: `-5.23164`
- Longitud aproximada: `-80.65874`
- Texto visible en la captura: `La Legua`, Piura; punto de inicio marcado como `INICIO`.
- Referencia visual: trama de calles, terrenos secos, viviendas de baja altura, avenida principal, vegetación dispersa y suelo cálido/desértico.

Si se utiliza Google Earth o Google Earth Pro para estudiar el lugar, observar solamente patrones públicos y generales: relieve, orientación de caminos, proporción entre lotes, colores del suelo, vegetación, tipos de techos y relación entre zona habitada y terrenos abiertos. No importar ni redistribuir capturas, texturas o modelos de Google Earth sin licencia. No recrear una vivienda particular identificable.

## Solicitud de exploración con “el ojo de Dios”

Interpretar “el ojo de Dios” como una revisión aérea amplia del área mediante Google Earth o una fuente cartográfica autorizada. Claude debe, si tiene acceso a navegación, producir un informe visual de:

1. Topografía y pendientes suaves.
2. Calles principales y caminos secundarios, sin convertirlos en direcciones exactas de personas.
3. Terreno seco, polvo, lotes vacíos y zonas con vegetación.
4. Algarrobos, arbustos, cactus u otra vegetación visible de la región.
5. Materiales visuales predominantes: adobe, ladrillo, cemento, madera, calamina, tierra y concreto.
6. Color e iluminación regional: cielo intenso, sol duro, atardecer anaranjado y sombras largas.
7. Espacios comunitarios plausibles para una plaza, mercado o punto de reunión.

El informe debe separar claramente: datos observados, inferencias artísticas y elementos inventados para el juego.

## Dirección visual deseada

Prioridad: realismo 3D estilizado de alta calidad, no prometer que es GTA 5 ni afirmar que es fotorrealismo AAA si no se alcanza técnicamente.

Implementar y auditar:

- Modelos GLB/GLTF con topología limpia.
- Texturas PBR separadas: base color/albedo, normal, roughness, ambient occlusion y, cuando convenga, height/displacement.
- `MeshStandardMaterial` o `MeshPhysicalMaterial` correctamente configurados.
- Sombras suaves y cascaded shadow maps o una estrategia equivalente para móvil.
- Tone mapping ACES, exposición ajustable y color space sRGB.
- Cielo HDRI o sky model autorizado, con fallback ligero.
- Agua con transmisión y refracción solo en calidad alta; fallback barato en dispositivos débiles.
- Vegetación con alpha test, instancing y LOD.
- Partículas de polvo y ambiente con límites estrictos.
- Oclusión ambiental y bloom solamente en perfiles compatibles.
- LOD por distancia para casas, puestos, árboles y props.
- Instancing para piedras, cactus, banderines y vegetación repetida.
- Compresión KTX2/Basis para texturas grandes y Draco/Meshopt para geometría cuando el pipeline lo permita.

## Modelos 3D que deben priorizarse

Crear, buscar o integrar con licencia compatible, en este orden:

1. Burrito protagonista cuadrúpedo, riggeado, con ciclos de caminar, trotar, saltar, caer, idle, girar, celebrar y recibir daño.
2. Variantes del burrito: colores, manchas, albarda, sombrero, pañuelo, campanilla y accesorios intercambiables.
3. Puesto de chicha con cántaros, vasos, mesa, toldo, letrero y utensilios.
4. Casas de adobe y ladrillo genéricas, sin copiar una vivienda real.
5. Algarrobos, cactus, arbustos secos, piedras y vegetación local.
6. Acequia o canal de riego con piedra, agua y puentes pequeños.
7. Plaza comunal, mercado, escenario para música y zona de reunión.
8. Props culturales genéricos: tinajas, jarras, canastas, mantas, banderines, bancos y elementos de feria.
9. Obstáculos de parkour: muros bajos, rampas, pilas de cajas, zanjas y pasarelas.

Cada asset debe documentar procedencia/licencia, triángulos, resolución de texturas, tamaño en MB, LOD disponibles y si es generado o comprado. No usar modelos descargados sin licencia clara.

## Animación y gameplay

El burrito debe tener locomoción legible y natural. Revisar:

- Pies que no atraviesen el suelo.
- Root motion o movimiento externo consistente, pero no ambos sin control.
- Mezcla suave entre idle, walk, trot, jump y landing.
- Inclinación del cuerpo en aceleración y frenado.
- Orejas, cola, cabeza y albarda con animación secundaria.
- Cámara tercera persona estable, con colisión contra paredes y sin giros bruscos.
- Joystick fijo en la esquina inferior izquierda.
- Botones separados para salto, interacción y sprint.
- Juego siempre en horizontal en Android.
- Reasignación de controles para teclado y táctil.

## Historia base

El protagonista es un burrito personalizable que llega al punto `INICIO` para participar en una jornada comunitaria. La campaña debe celebrar la cooperación, la música, la comida y el paisaje de Piura sin caricaturizar ni apropiarse de tradiciones de manera irrespetuosa.

Arco inicial sugerido:

1. **Llegada a INICIO:** personalizar nombre, color y accesorios.
2. **Ruta de la chicha:** ayudar a preparar y repartir insumos de una bebida tradicional, sin convertir la cultura en un minijuego trivial.
3. **La plaza comunal:** reunir participantes y reparar un espacio de encuentro.
4. **La acequia:** limpiar obstáculos y restablecer el paso del agua.
5. **El mirador:** completar un recorrido de parkour y contemplar el atardecer.
6. **Fiesta colaborativa:** reunir recursos para música, banderines y comida; cerrar la beta con una celebración.

## Misiones y sistemas

Implementar o proponer:

- Misiones principales y secundarias.
- Objetivos cooperativos para salas de hasta 10 jugadores.
- Coleccionables culturales respetuosos con descripciones cortas.
- Reputación comunitaria en lugar de violencia.
- Personalización persistente del burrito.
- Inventario simple de accesorios y recursos.
- Checkpoints y guardado de progreso con Supabase.
- Estado authoritative para reglas de sala en Cloudflare.
- Recompensas cosméticas, no pay-to-win.
- Eventos ambientales: viento, polvo, atardecer, nubes y lluvia ocasional si es compatible con el tono regional.

## Multijugador

Revisar que la arquitectura no finja conexión online:

- Salas de máximo 10 participantes.
- Cloudflare Durable Objects/WebSockets como autoridad de sala.
- Supabase solo para perfiles, personalización y progreso persistente.
- Validación server-side de nombre, sala, posiciones y eventos.
- Interpolación y snapshots para jugadores remotos.
- Reconciliación del jugador local sin teletransportes bruscos.
- Rate limits, heartbeat y reconexión.
- Mensajes versionados en el protocolo.
- Fallback offline visible y honesto.

## Objetivo de tamaño “mínimo 1 GB”

El usuario desea que el juego tenga como mínimo aproximadamente 1 GB de contenido total para mejorar la calidad. No rellenar artificialmente el APK con basura ni duplicar archivos. Diseñar una estrategia por paquetes:

- APK/base jugable ligera.
- Paquete HD opcional de modelos y texturas 2K/4K.
- Paquete de audio y música.
- Paquetes de zonas descargables o actualización incremental.
- Cache local con límite configurable.
- Verificación de hash y reanudación de descargas.
- LOD móvil y perfil ultra para equipos potentes.

Reportar siempre el tamaño real de cada paquete, memoria RAM estimada, VRAM aproximada y rendimiento esperado. Un APK de 1 GB puede ser mala experiencia en muchos teléfonos; priorizar streaming y paquetes opcionales antes que forzar un APK monolítico.

## Calidad y fluidez

Medir, no adivinar:

- FPS en Android básico, medio y potente.
- Frame time de CPU y GPU.
- Draw calls.
- Triángulos visibles.
- Texturas residentes.
- Memoria de geometrías.
- Tiempo de carga inicial.
- Tiempo de entrada a una sala.
- Uso de red y frecuencia de snapshots.

Definir perfiles `bajo`, `medio`, `alto` y `ultra`. El perfil por defecto debe evitar calentamiento excesivo y tirones.

## Auditoría solicitada a Claude

1. Leer `README.md`, `CLAUDE.md`, este archivo y `package.json`.
2. Revisar `src/game/arena.ts`, `src/game/game.ts`, `src/game/balls.ts`, `src/game/camera.ts`, `src/engine/renderer.ts`, `src/ui/touch.ts`, `src/net/room.ts`, `src/net/protocol.ts` y `src/net/supabase.ts`.
3. Ejecutar `pnpm install --frozen-lockfile`, `pnpm test` y `pnpm build`.
4. Señalar errores reales de compilación, seguridad, rendimiento y jugabilidad.
5. Proponer cambios en orden de impacto, con archivos concretos y criterios de aceptación.
6. No afirmar que se inspeccionó Google Earth si no se tuvo acceso a él.
7. No inventar modelos, shaders, animaciones, benchmarks o pruebas que no se hayan ejecutado.
8. Mantener la orientación horizontal, el idioma español y el límite de 10 jugadores.

## Criterio de éxito de la siguiente versión

La siguiente versión debe demostrar una escena PBR visible y jugable, una cámara cómoda, joystick fijo, burrito animado, misión de la Ruta Chichera, iluminación de atardecer, carga razonable en Android, un informe de presupuesto de rendimiento y una ruta clara para incorporar el paquete HD de aproximadamente 1 GB sin degradar todos los dispositivos.
