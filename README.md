# Burrito Chichero Simulator

Beta 0.1 de exploración 3D para navegador y futura compilación APK horizontal. La escena está inspirada en La Legua-San Jacinto, Catacaos, Piura, tomando como referencia visual el punto `INICIO` aportado por el usuario, pero usa una interpretación artística del entorno y no reproduce viviendas privadas exactas.

## Qué incluye esta beta

- Mundo 3D WebGL real con Three.js: terreno con relieve, cielo, iluminación hemisférica, sombras direccionales, materiales PBR, caminos de tierra, algarrobos, cactus, banderines, puesto de chicha y punto `INICIO`.
- Burrito protagonista personalizable: nombre, cinco colores y accesorio de pañuelo, sombrero o ninguno.
- Modelo GLB generado para el juego, rig cuadrúpedo y clip de caminar reproducido con `AnimationMixer`.
- Exploración en tercera persona, WASD/joystick, sprint, salto, interacción y recorrido de parkour sencillo.
- Campaña 01: llegar a `INICIO`, buscar el puesto `CHICHA` y completar la actividad comunitaria.
- Portada cinematográfica 16:9, pantalla de carga vertical 9:16 para celular y orientación horizontal obligatoria.
- UI de sala con aforo objetivo de 10 participantes. La beta local muestra `1/10` y no finge una conexión online.

## Ejecutar

```bash
pnpm install
pnpm build
pnpm dev -- --host 127.0.0.1 --port 3000
```

Después abre `http://127.0.0.1:3000`. En celular gira la pantalla a horizontal.

Controles: `WASD` o flechas para moverse, `Shift` para sprint, `Espacio` para saltar y `E` para interactuar con el puesto de chicha. En táctil aparece joystick y botones.

## Estado del multijugador

No hay un endpoint público verificado en esta sesión: la URL anterior respondió 404. El cliente puede usar `VITE_ROOM_URL` cuando exista un Worker desplegado y probado; sin esa variable, permanece en modo local. El Worker exige sesión anónima/autenticada de Supabase, valida el origen permitido y retransmite snapshots de posición limitados a 20 Hz. El cliente crea burritos remotos y suaviza sus transformaciones. Esta sincronización inicial es cliente-autoritativa: no valida colisiones, velocidad real, saltos ni misiones. No se debe publicar el modo online hasta desplegar el Worker, activar Supabase y probar dos clientes reales.

El servidor `server/` pertenece al starter authoritative y se conserva como referencia técnica. No se presenta como el backend activo de esta beta. Al conectar el backend futuro, las reglas de ronda, sincronización, límites de sala y resultados deben pertenecer al servidor, no al cliente.

## Estructura importante

| Ruta | Uso |
| --- | --- |
| `src/game/arena.ts` | Entorno 3D de La Legua interpretado para la beta |
| `src/game/game.ts` | Movimiento, salto, misión y modo local |
| `src/game/balls.ts` | Vista del burrito, accesorios, modelo GLB y mixer |
| `src/ui/` y `src/styles/main.css` | Portada, personalización, HUD, menú y controles táctiles |
| `assets/models/` | Fuentes de los modelos GLB generados |
| `public/assets/models/` | Copia servida por Vite del burrito animado |
| `public/art/` | Portada horizontal y carga vertical |
| `game-sharing.json` | Metadatos de portada, favicon y captions |
| `docs/ONLINE-ROADMAP.md` | Plan de Cloudflare + Supabase sin secretos |

## Validación realizada

`pnpm build` pasa con typecheck, Vite y el chequeo de tamaño. El smoke test local abre la portada, carga el GLB animado, confirma `AnimationMixer`, entra al HUD, mueve el burrito y ejecuta salto sin errores de consola. La animación exportada contiene un clip cuadrúpedo `preset:quadruped:walk` de 2.6 s y 23 canales.

La beta está preparada como experiencia 3D real, no como una simulación HTML de 3D. Aun así, no es una producción AAA tipo GTA 5: el mapa, arte y red son una primera beta modular para validar el núcleo jugable antes de ampliar el mundo y conectar servicios.

## Créditos y licencias

Fuentes ManusCC0 y ManusCC0 Sans CJK SC: CC0 1.0. Three.js: MIT. Los assets generados para este proyecto se conservan dentro de `assets/` y `public/`.
