# Guía de auditoría para Claude

## Proyecto

`Burrito Chichero Simulator` es una beta de juego 3D para Android y navegador. Usa Three.js, TypeScript, Vite y Capacitor. Está inspirado en La Legua, Piura, Perú, sin copiar viviendas privadas exactas.

## Puntos principales a revisar

1. **Rendering y PBR:** revisar `src/game/arena.ts` y `src/engine/renderer.ts`. La arena usa geometría 3D, mapas de color, roughness y normal, `MeshStandardMaterial`, `MeshPhysicalMaterial`, sombras direccionales, tone mapping ACES y bloom.
2. **Rendimiento móvil:** revisar subdivisiones del terreno, cantidad de materiales/texturas, shadow maps, pixel ratio, memory lifetime y posibilidad de LOD o instancing.
3. **Cámara y controles:** revisar `src/game/camera.ts` y `src/ui/touch.ts`. El joystick debe permanecer fijo y la cámara debe interpolar el heading sin mareo.
4. **Red:** revisar `src/net/room.ts`, `src/net/protocol.ts` y `src/net/connection.ts`. El endpoint de sala es configurable mediante `VITE_ROOM_URL`; el cliente debe degradar a modo local si no hay conexión.
5. **Supabase:** revisar `src/net/supabase.ts`. Solo debe usarse una clave publishable en el cliente; nunca incluir `service_role` ni credenciales privadas.
6. **Android:** revisar `capacitor.config.ts` y `android/app/src/main/AndroidManifest.xml`. El juego debe permanecer en orientación horizontal.
7. **Seguridad y privacidad:** revisar `.gitignore`, variables Vite, RLS y cualquier endpoint. No exponer secretos en el APK ni en GitHub.
8. **Pruebas:** ejecutar `pnpm install --frozen-lockfile`, `pnpm test` y `pnpm build`.

## Limitaciones conocidas

La beta todavía no es un juego AAA. Los props PBR se generan localmente para conservar un APK móvil ligero. Faltan GLB de alta poligonización, HDRI, LOD, streaming por zonas e interpolación completa de jugadores remotos.

## Comandos

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm android:sync
```

No subir `.env`, `node_modules`, `dist`, `outputs` ni carpetas de build Android.
