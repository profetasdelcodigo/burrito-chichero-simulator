# Catálogo de skills y conectores para Burrito Chichero Simulator

Fecha de investigación: 2026-11-06.

Este catálogo distingue entre **disponible en esta sesión**, **candidato externo** y **servicio que requiere autorización**. Que una herramienta aparezca aquí no significa que Manus pueda instalarla automáticamente como skill ni que sea gratuita para producción.

## Skills y herramientas de conocimiento recomendadas

| # | Skill/herramienta | Estado | Prioridad | Uso en el proyecto |
|---|---|---|---|---|
| 1 | Three.js Documentation + Examples | Candidato externo | Alta | PBR, WebGL, shaders, WebGPU opcional, sombras, LOD y renderer móvil. WebGL debe seguir siendo la ruta base. [1] |
| 2 | MDN WebGL/WebGPU | Candidato externo | Alta | Compatibilidad real de Android/WebView, detección de `navigator.gpu` y fallback seguro. [2] |
| 3 | glTF-Transform SDK/CLI | Candidato externo | Alta | Validar y optimizar GLB/glTF, Meshopt, Draco, KTX2/Basis, deduplicación y reducción de texturas. [3] |
| 4 | Poly Haven | Candidato externo | Media | Modelos, texturas PBR y HDRI CC0 para materiales genéricos del entorno. [4] |
| 5 | Blender: rigging, IK y glTF 2.0 | Candidato externo | Alta | Crear el rig cuadrúpedo del burrito, hornear animaciones y exportar GLB. [5] |
| 6 | Three.js GLTFLoader, AnimationMixer y CCDIKSolver | Candidato externo | Alta | Cargar modelos, mezclar locomoción y adaptar patas al terreno. [6] |
| 7 | Rokoko Studio/Create | Candidato externo | Baja | Captura o retargeting de movimiento como referencia; no sustituye el rig cuadrúpedo. [7] |
| 8 | Web Audio API | Candidato externo de plataforma | Alta | Mezcla local de música, voz y efectos sin latencia remota durante la partida. [8] |
| 9 | Tone.js | Candidato externo npm | Media | Secuenciar loops y ambientes, con cuidado del consumo móvil. [9] |
| 10 | Figma Skills para MCP | Candidato externo | Media | Prototipar HUD, menús y UI horizontal con componentes y variables. [10] |
| 11 | FLUX.2 multi-reference workflow | Candidato externo/modelo | Baja | Concept art, props y referencias; no debe ser la fuente canónica del gameplay. [11] |
| 12 | Blender para cinemáticas | Candidato externo | Media | Cámaras, composición, iluminación y trailers fuera del runtime móvil. [12] |
| 13 | OBS Studio | Candidato externo | Media | Capturar gameplay real para QA y trailers. [13] |
| 14 | Supabase Realtime Authorization + RLS | Candidato externo de documentación | Alta | Canales privados, Presence/Broadcast, perfiles y progreso protegidos. No es autoridad anti-trampas por sí solo. [14] |
| 15 | Cloudflare Durable Objects WebSockets + Hibernation | Candidato externo de documentación | Alta | Árbitro por `room_id`, autoridad, validación y snapshots para 10 jugadores. [15] |
| 16 | Vite static deployment y SPA/CDN | Candidato externo de documentación | Alta | Build web, rutas SPA y separación entre web y Android. [16] |
| 17 | Capacitor + Play Asset Delivery | Candidato externo de documentación | Alta | Separar APK base de paquetes HD `install-time`, `fast-follow` u `on-demand`. [17] |
| 18 | Android Studio Profiler | Candidato externo | Alta | Medir CPU, heap, red, renderizado y fugas en Android físico. [18] |
| 19 | Jetpack Macrobenchmark | Candidato externo | Alta | Medir arranque, frame timing y jank automáticamente. [19] |
| 20 | GitHub Skills: Test with Actions | Candidato externo | Alta | CI para instalación, pruebas, build y artefactos Capacitor. [20] |
| 21 | GitHub Skills: Review pull requests | Candidato externo | Media | Revisiones de TypeScript, shaders, migraciones, Android y workflows. [21] |
| 22 | ambientCG | Candidato externo | Media | Materiales PBR y HDRI CC0 para barro, ladrillo, madera y terreno. [22] |
| 23 | Kenney | Candidato externo | Media | Props/UI estilizados con licencia CC0; verificar el paquete concreto. [23] |
| 24 | Quaternius | Candidato externo | Media | Personajes, props y animaciones; revisar prohibición de redistribuir assets independientes. [24] |
| 25 | Mixamo | Candidato externo | Baja | Animaciones humanoides de referencia; no es solución directa para el burrito. [25] |

## Conectores y servicios recomendados

| # | Conector/servicio | Estado | Prioridad | Uso y advertencia |
|---|---|---|---|---|
| 1 | Supabase MCP | Disponible y autenticado | Alta | Proyectos, tablas, migraciones, RLS, Auth, tipos y Edge Functions. Separar dev/producción. [26] |
| 2 | Cloudflare MCP | Disponible y autenticado | Alta | Workers, Durable Objects, R2, DNS y configuración. Confirmar `account_id` antes de mutar. [27] |
| 3 | Vercel MCP | Disponible y autenticado | Alta | Previews, hosting Vite, CDN, variables y despliegues. [28] |
| 4 | Runway MCP/Dev | Disponible como servidor MCP | Media | Trailers y marketing; requiere workspace y créditos. No es fuente del gameplay. [29] |
| 5 | Agent Opus MCP | Servidor listado | Baja | Vídeos narrativos si se confirma que el formato y control sirven; revisar capacidades/costes antes. |
| 6 | Cloudflare Workers + R2 | Candidato apoyado por Cloudflare MCP | Alta | APIs ligeras y paquetes GLB, texturas, HDR, parches y audio. R2 tiene egress gratuito, pero cobra almacenamiento/operaciones. [30] |
| 7 | Cloudflare Durable Objects runtime | Candidato operable mediante Cloudflare MCP | Alta | Un objeto por sala, validación server-side, snapshots y persistencia mínima. [15] |
| 8 | Cloudflare R2 para audio | Candidato operable por Cloudflare | Media | OGG/MP3/WAV por idioma o escena con URLs firmadas. [31] |
| 9 | Cloudflare Workers AI | Candidato externo | Baja | Concept art y referencias; controlar prompts, imágenes, privacidad y gasto. [32] |
| 10 | Figma MCP remoto | Candidato externo | Media | Lectura/escritura de archivos Figma; requiere OAuth/seat y permisos. [10] |
| 11 | Sketchfab Download/Data API | Candidato externo | Baja | Modelos específicos cuando CC0 no cubra el asset; licencia por modelo y atribución. [33] |
| 12 | ambientCG catálogo/descarga | Candidato externo | Media | Descargas de materiales y HDRI CC0 sin depender de un conector Manus. [22] |
| 13 | ElevenLabs API | Candidato externo | Media | Voces, pregones, música y efectos prerenderizados; la clave debe vivir en backend. [34] |
| 14 | Firebase Crashlytics | Candidato externo | Media | Crashes y ANR de Android; requiere proyecto Firebase y política de privacidad. [35] |
| 15 | Sentry Android | Candidato externo | Media | Errores, ANR, trazas y profiling; sanitizar PII y proteger auth token. [36] |
| 16 | GitHub Repositories/Actions/Issues/PR | Candidato externo | Alta | Repositorio, CI, tareas y revisiones. El repo actual ya está en GitHub, pero no hay GitHub MCP confirmado en esta sesión. [20] |
| 17 | GitLab Repositories/CI/CD/Wiki | Candidato externo | Media | Alternativa integral a GitHub; no conviene duplicar el origen canónico. [37] |
| 18 | Google Play Asset Delivery | Candidato externo | Alta | Paquetes HD para Google Play sin meter 1 GB en el APK base. [17] |
| 19 | Cloudflare Stream | Candidato operable mediante Cloudflare | Media | Trailers/cinemáticas con HLS/DASH y signed URLs; no edita vídeo. [38] |
| 20 | Vercel hosting/CDN | Disponible mediante Vercel MCP | Alta | Hosting simple del build Vite, previews y CDN. [28] |
| 21 | Supabase Auth/Postgres/Storage | Disponible mediante Supabase MCP | Alta | Cuentas, perfiles, progreso, inventario y assets pequeños con RLS. [26] |
| 22 | Cloudflare Pages/Static Assets | Operable mediante Cloudflare MCP | Media | Frontend estático, manifest, cache e invalidación. [39] |
| 23 | Runway workflows | Disponible como servidor MCP | Media | Encadenar generación/edición/stitching/upscaling para piezas promocionales. [29] |
| 24 | GitHub App/OAuth para Manus | Candidato externo | Alta | Automatizar revisiones y CI con permisos mínimos; no habilitar PAT amplio. [20] |
| 25 | Android Studio/ADB en CI | Candidato local/CI | Alta | Instalar APK, ejecutar smoke tests y pruebas de orientación horizontal en dispositivos o emuladores. [18] |

## Qué activaría primero

1. Mantener **Supabase MCP**, **Cloudflare MCP**, **Vercel MCP** y **Runway MCP** como los conectores ya disponibles. No añadir operaciones destructivas sin revisar proyecto y entorno.
2. Añadir al pipeline local/CI **glTF-Transform**, **Khronos glTF Validator**, **KTX2/Basis** y **Meshopt**. Son las mejoras con mejor relación entre calidad, tamaño y control.
3. Incorporar **Blender** para el rig cuadrúpedo, las animaciones y la exportación GLB. La prioridad es un burrito canónico con locomoción estable antes de producir muchos modelos.
4. Crear perfiles gráficos y medición con **Android Studio Profiler** y **Macrobenchmark**. El objetivo de 1 GB debe convertirse en paquetes HD opcionales, no en un APK monolítico.
5. Usar **Google Play Asset Delivery** si la publicación será en Google Play; para web o sideload usar R2/CDN con manifest versionado, hashes, descarga temporal y activación atómica.
6. Añadir Crashlytics o Sentry solo después de definir consentimiento, minimización, retención y exclusión de PII.
7. Dejar Figma, ElevenLabs, Runway, Sketchfab y Workers AI para cuando exista una necesidad concreta de producción; no activarlos todos a la vez.

## Reglas de seguridad

Nunca incluir `service_role` de Supabase, tokens Cloudflare/R2, claves ElevenLabs/Runway, auth tokens de Sentry ni la keystore Android en el APK, GitHub, logs o variables `VITE_*`. Las claves cliente publishable/anon requieren RLS correcto.

No permitir que el cliente envíe posiciones, puntuaciones o resultados finales como autoridad. El cliente debe enviar comandos; el Durable Object valida reglas, velocidad, colisiones, inventario y transiciones.

Conservar para cada asset: autor, URL, licencia/version, fecha, resolución, transformaciones y hash. Priorizar Poly Haven, ambientCG y Kenney cuando el asset concreto sea CC0. Revisar individualmente Quaternius, Mixamo, Freesound, OpenGameArt y Sketchfab.

No copiar fotografías, domicilios, rostros, marcas ni modelos de Google Earth para representar La Legua. Usar una interpretación artística basada en patrones públicos y fuentes autorizadas.

## Referencias

[1]: https://threejs.org/docs/ "Three.js Documentation"
[2]: https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API "MDN WebGPU API"
[3]: https://gltf-transform.dev/cli "glTF-Transform CLI"
[4]: https://polyhaven.com/license "Poly Haven License"
[5]: https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html "Blender glTF 2.0 exporter"
[6]: https://threejs.org/docs/pages/GLTFLoader.html "Three.js GLTFLoader"
[7]: https://www.rokoko.com/pricing "Rokoko pricing"
[8]: https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode "MDN DynamicsCompressorNode"
[9]: https://tonejs.github.io/ "Tone.js"
[10]: https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server "Figma MCP server"
[11]: https://developers.cloudflare.com/workers-ai/models/ "Cloudflare Workers AI models"
[12]: https://www.blender.org/features/ "Blender features"
[13]: https://obsproject.com/kb/game-capture-setup-guide "OBS game capture"
[14]: https://supabase.com/docs/guides/realtime/authorization "Supabase Realtime Authorization"
[15]: https://developers.cloudflare.com/durable-objects/best-practices/websockets/ "Durable Objects WebSockets"
[16]: https://vite.dev/guide/static-deploy.html "Vite static deployment"
[17]: https://developer.android.com/guide/app-bundle/asset-delivery "Google Play Asset Delivery"
[18]: https://developer.android.com/studio/profile "Android Studio Profiler"
[19]: https://developer.android.com/topic/performance/benchmarking/macrobenchmark-overview "Jetpack Macrobenchmark"
[20]: https://github.com/skills/test-with-actions "GitHub Skills Test with Actions"
[21]: https://github.com/skills/review-pull-requests "GitHub Skills Review Pull Requests"
[22]: https://ambientcg.com/ "ambientCG"
[23]: https://kenney.nl/support "Kenney support and licensing"
[24]: https://quaternius.com/license.html "Quaternius license"
[25]: https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html "Adobe Mixamo FAQ"
[26]: https://supabase.com/pricing "Supabase pricing"
[27]: https://developers.cloudflare.com/ "Cloudflare Developers"
[28]: https://vercel.com/docs/frameworks/frontend/vite "Vercel Vite deployment"
[29]: https://dev.runwayml.com/ "Runway Developer"
[30]: https://developers.cloudflare.com/r2/pricing/ "Cloudflare R2 pricing"
[31]: https://developers.cloudflare.com/r2/api/s3/api/ "Cloudflare R2 S3 API"
[32]: https://developers.cloudflare.com/workers-ai/platform/pricing/ "Workers AI pricing"
[33]: https://sketchfab.com/developers/download-api/guidelines "Sketchfab Download API guidelines"
[34]: https://elevenlabs.io/pricing "ElevenLabs pricing"
[35]: https://firebase.google.com/docs/crashlytics "Firebase Crashlytics"
[36]: https://docs.sentry.io/platforms/android/ "Sentry Android"
[37]: https://about.gitlab.com/pricing/ "GitLab pricing"
[38]: https://developers.cloudflare.com/stream/pricing/ "Cloudflare Stream pricing"
[39]: https://developers.cloudflare.com/pages/ "Cloudflare Pages"
