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

## Integración propuesta

1. Crear un Worker de Cloudflare con un Durable Object `GameRoom`.
2. Implementar handshake `join`, `profile`, `input`, `snapshot`, `mission_event` y `leave`.
3. Validar el máximo de 10 en el Durable Object; nunca confiar en un contador HTML.
4. Configurar `ALLOWED_ORIGINS` con el dominio final del cliente.
5. Añadir una variable pública de configuración con la URL `wss://.../room` solo después de probarla.
6. Añadir un pequeño adaptador de Supabase en el Worker para guardar perfiles/progreso después de autenticar la petición.
7. Probar con 2, 5 y 10 navegadores, reconexión, pérdida de paquetes y entrada durante una misión.
8. Solo después de esas pruebas cambiar el estado del HUD de `MODO LOCAL` a `ONLINE`.

## Criterio de aceptación

La conexión se considerará real únicamente cuando exista un `wss://` publicado, dos clientes distintos vean al mismo burrito remoto, una sala rechace al participante número 11, la misión tenga un resultado coherente en todos los clientes y los datos de perfil puedan recuperarse sin exponer claves privadas.
