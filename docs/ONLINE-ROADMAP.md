# Plan online de Burrito Chichero Simulator

## Estado actual

La beta 0.1 funciona localmente con WebGL y no abre sockets. Esto es intencional: no hay una URL `wss://` pública, un Worker desplegado ni credenciales de Supabase autorizadas. La interfaz muestra `MODO LOCAL · 1 / 10` y el botón de sala informa que Cloudflare está pendiente; no se simula sincronización.

## Opción de bajo coste

Para una primera prueba barata, la opción recomendada es Cloudflare Workers + Durable Objects + WebSockets. Un Durable Object representa una sala, mantiene hasta 10 conexiones y valida el estado autoritativo de cada jugador. El cliente debe recibir una URL pública `wss://` y el Worker debe configurar los orígenes permitidos.

Supabase no reemplaza el transporte en tiempo real de la sala. Su función propuesta es persistir:

- perfiles: nombre, color, accesorio y fecha de última conexión;
- progreso de campaña y coleccionables;
- preferencias de jugador;
- métricas agregadas, nunca secretos del socket.

La beta no contiene una `SUPABASE_URL`, `SUPABASE_ANON_KEY`, token de Cloudflare ni endpoint firmado. No agregar secretos al repositorio ni al cliente.

## Contrato de sala

- `roomCode`: 4–8 caracteres, normalizado a mayúsculas.
- `capacity`: exactamente `10` participantes activos.
- `spectators`: opcional y separado del aforo jugable.
- `playerId`: identidad temporal de la conexión, no el nombre visible.
- `profile`: nombre limitado a 18 caracteres, color de una paleta permitida y accesorio enumerado.
- `transform`: posición, velocidad, dirección, estado de salto y secuencia monotónica.
- `mission`: estado autoritativo de campaña; el cliente solo presenta la vista.
- `serverTick`: reloj del servidor para reconciliación y snapshots.

El servidor debe aceptar inputs o snapshots dentro de límites, rechazar secuencias antiguas, cerrar conexiones lentas y enviar snapshots a todos los participantes a una frecuencia limitada. El cliente puede interpolar actores remotos, pero no decide recompensas, final de misión ni resultados.

## Handshake de autenticación implementado en la rama de desarrollo

El Worker ahora exige un primer mensaje `{ type: "auth", accessToken }` antes de admitir a un jugador. Valida el token contra `/auth/v1/user` de Supabase usando la clave pública configurada solo en el entorno del Worker. Las conexiones pendientes tienen un timeout de 5 segundos, cuentan para el límite de 10 y no reciben estado de sala antes de autenticarse. El Worker también exige un `Origin` incluido exactamente en `ALLOWED_ORIGINS`.

Para configurar un despliegue futuro, sin guardar credenciales en Git:

```bash
cd cloudflare
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put ALLOWED_ORIGINS
npx wrangler deploy
```

Los valores esperados son la URL del proyecto Supabase, su publishable/anon key y el origen HTTPS exacto desde el que se servirá el juego. No ejecutar el despliegue hasta que el proyecto Supabase esté activo y el dominio final del cliente esté decidido. El endpoint no está desplegado ni verificado por este cambio.

El cliente obtiene el access token de la sesión Supabase y lo envía como primer mensaje WebSocket. Si no hay sesión, endpoint o configuración, permanece en modo local. Esta autenticación protege el acceso a la sala, pero todavía no convierte el Worker en simulador autoritativo de movimiento o misiones.

## Prototipo de snapshots y actores remotos

En la rama `feat/remote-burrito-rendering`, cada cliente envía su transformada (posición, velocidad y salto) a un máximo de 20 snapshots por segundo. El Durable Object limita los valores al área jugable, asigna una posición inicial distinta por orden de entrada y retransmite el estado junto con el perfil. El cliente excluye su propio `playerId`, crea un `BurritoView` para cada participante remoto, aplica su accesorio/color y suaviza el desplazamiento entre snapshots.

**Límite importante:** esta fase es cliente-autoritativa. El Worker limita formato, frecuencia y rangos, pero no simula física ni puede demostrar que la posición reportada sea legítima. No usar todavía para competición, recompensas, colisiones o progreso compartido. La próxima fase debe mover la simulación a servidor y añadir secuencias monotónicas, reconciliación y validación de saltos/velocidad.

## Integración propuesta

1. Desplegar el Worker de Cloudflare con un Durable Object `GameRoom` después de configurar y activar Supabase.
2. Implementar handshake `join`, `profile`, `input`, `snapshot`, `mission_event` y `leave`.
3. Validar el máximo de 10 en el Durable Object; nunca confiar en un contador HTML.
4. Configurar `ALLOWED_ORIGINS` con el dominio final del cliente.
5. Añadir una variable pública de configuración con la URL `wss://.../room` solo después de probarla.
6. Añadir un pequeño adaptador de Supabase en el Worker para guardar perfiles/progreso después de autenticar la petición.
7. Probar con 2, 5 y 10 navegadores, reconexión, pérdida de paquetes y entrada durante una misión.
8. Solo después de esas pruebas cambiar el estado del HUD de `MODO LOCAL` a `ONLINE`.

## Criterio de aceptación

La conexión se considerará real únicamente cuando exista un `wss://` publicado, dos clientes distintos vean al mismo burrito remoto, una sala rechace al participante número 11, la misión tenga un resultado coherente en todos los clientes y los datos de perfil puedan recuperarse sin exponer claves privadas.
