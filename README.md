# Motoconcho Express 2 🛵🇩🇴

Secuela de Motoconcho Express: conduce un motoconcho por tres carriles en Santo Domingo, esquiva las huacas y consigue el mayor puntaje.

## Cómo jugar

Pulsa **¡Arrancamos!**. Usa las flechas izquierda y derecha del teclado o los botones ◀ y ▶ de la pantalla táctil para cambiar de carril. Esquiva los hoyos y recoge:

- 🪙 Monedas: +10 puntos.
- ⛽ Gasolina: +15 puntos.
- 🪖 Casco: absorbe un choque.
- ⚡ Nitro: aumenta la velocidad y te hace invulnerable durante 4 segundos.
- 🧲 Imán: atrae monedas durante 7 segundos.

También ganas puntos por avanzar. Cada 100 puntos subes de nivel: la velocidad y la frecuencia de aparición aumentan, y se anuncia el nuevo nivel. El récord y el usuario se guardan en el almacenamiento local del navegador (`localStorage`). Usa el botón de sonido para silenciar o activar los efectos.

## Tecnologías y Arquitectura

* **Lenguaje:** [TypeScript](https://www.typescriptlang.org/) con tipado estricto e interfaces para todas las entidades y servicios.
* **Motor 2D:** [Phaser 3](https://phaser.io/) (gráficos procedurales con `Phaser.Graphics`).
* **Audio:** Web Audio API (`AudioContext`) sintetizado en tiempo real.
* **Bundler & Dev Server:** [Vite](https://vitejs.dev/) con HMR (Hot Module Replacement).

### Estructura del Proyecto

```text
├── src/
│   ├── main.ts              # Punto de entrada, configuración de Phaser y UI
│   ├── types/
│   │   └── index.ts         # Tipos e interfaces (GameItem, ObstacleKind, UserAccount)
│   ├── services/
│   │   ├── auth.ts          # Servicio de autenticación y persistencia local (SHA-256)
│   │   └── audio.ts         # Servicio de síntesis de audio (Web Audio API)
│   ├── scenes/
│   │   └── RideScene.ts     # Escena principal del juego (Phaser Scene)
│   ├── ui/
│   │   └── hud.ts           # Controlador del HUD y notificaciones
│   └── styles/
│       └── main.css         # Estilos visuales del juego y UI
├── index.html               # Plantilla HTML
├── vite.config.ts           # Configuración de compilación de Vite
├── tsconfig.json            # Configuración de TypeScript
└── package.json
```

## Desarrollo y Ejecución Local

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Iniciar servidor de desarrollo con recarga en vivo:
   ```bash
   npm run dev
   ```

3. Compilar para producción (genera la carpeta `dist/` optimizada):
   ```bash
   npm run build
   ```

4. Previsualizar la compilación de producción:
   ```bash
   npm run preview
   ```

## Jugar en línea

[¡Jugar Motoconcho Express 2!](https://jperalta19.github.io/motoconcho-express-2/)
