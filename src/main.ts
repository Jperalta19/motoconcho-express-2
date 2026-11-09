import './styles/main.css';
import * as Phaser from 'phaser';
import { RideScene } from './scenes/RideScene';
import { sound } from './services/audio';
import { Auth } from './services/auth';
import { hud } from './ui/hud';

// Helper selector
const $ = <T extends HTMLElement = HTMLElement>(id: string): T | null =>
  document.getElementById(id) as T | null;

// Phaser Game configuration
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 420,
  height: 740,
  parent: 'game',
  backgroundColor: '#78d9cf',
  scene: [RideScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  audio: {
    noAudio: true
  }
};

const game = new Phaser.Game(config);

function getRideScene(): RideScene | null {
  return game.scene.getScene('Ride') as RideScene | null;
}

// Sound button setup
const muteBtn = $<HTMLButtonElement>('mute');
if (muteBtn) {
  muteBtn.onclick = () => {
    const isMuted = sound.toggleMute();
    hud.updateMuteButton(isMuted);
  };
}

// Game controls
const playBtn = $<HTMLButtonElement>('play');
if (playBtn) {
  playBtn.onclick = () => getRideScene()?.startRide();
}

const againBtn = $<HTMLButtonElement>('again');
if (againBtn) {
  againBtn.onclick = () => getRideScene()?.startRide();
}

const leftBtn = $<HTMLButtonElement>('left');
if (leftBtn) {
  leftBtn.onclick = () => getRideScene()?.move(-1);
}

const rightBtn = $<HTMLButtonElement>('right');
if (rightBtn) {
  rightBtn.onclick = () => getRideScene()?.move(1);
}

// Authentication & Session Manager
const authOverlay = $('auth');
const authError = $('auth-error');
const authUser = $<HTMLInputElement>('auth-user');
const authPassword = $<HTMLInputElement>('auth-password');
const registerBtn = $<HTMLButtonElement>('register');
const loginBtn = $<HTMLButtonElement>('login');
const logoutBtn = $<HTMLButtonElement>('logout');

function readNumber(key: string): number {
  try {
    const n = Number(localStorage.getItem(key));
    return Number.isSafeInteger(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function displaySession(): void {
  const currentUser = Auth.getCurrentUser();
  if (currentUser) {
    const best = readNumber(Auth.scoreKey('record'));
    const totalScore = readNumber(Auth.scoreKey('total'));

    const scene = getRideScene();
    if (scene && scene.rider) {
      scene.score = totalScore;
      scene.totalScore = totalScore;
      scene.bestDistance = best;
      scene.distance = 0;
      scene.level = 1;
      scene.refresh();
    }

    const scoreEl = $('score');
    if (scoreEl) scoreEl.textContent = totalScore.toString();

    const bestEl = $('best-distance');
    if (bestEl) bestEl.textContent = `${best} m`;

    if (authOverlay) authOverlay.hidden = true;
    if (logoutBtn) logoutBtn.hidden = false;
  } else {
    if (authOverlay) authOverlay.hidden = false;
    if (logoutBtn) logoutBtn.hidden = true;
  }
}

async function handleAuth(method: 'login' | 'register'): Promise<void> {
  if (!authError || !registerBtn || !loginBtn || !authUser || !authPassword) return;

  authError.textContent = '';
  registerBtn.disabled = true;
  loginBtn.disabled = true;

  try {
    await Auth[method](authUser.value, authPassword.value);
    authPassword.value = '';
    displaySession();
  } catch (err: unknown) {
    if (err instanceof Error) {
      authError.textContent = err.message || 'No se pudo guardar la sesión en este navegador.';
    } else {
      authError.textContent = 'Error al autenticar usuario.';
    }
  } finally {
    registerBtn.disabled = false;
    loginBtn.disabled = false;
  }
}

if (registerBtn) {
  registerBtn.onclick = () => void handleAuth('register');
}

if (loginBtn) {
  loginBtn.onclick = () => void handleAuth('login');
}

if (authPassword) {
  authPassword.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      void handleAuth('login');
    }
  });
}

if (logoutBtn) {
  logoutBtn.onclick = () => {
    const scene = getRideScene();
    if (scene && scene.rider) {
      scene.alive = false;
      scene.rider.setVisible(false);
      scene.objects.forEach(o => o.destroy());
      scene.objects = [];
      scene.score = 0;
      scene.totalScore = 0;
      scene.bestDistance = 0;
      scene.distance = 0;
      scene.level = 1;
    }

    Auth.logout();

    const scoreEl = $('score');
    if (scoreEl) scoreEl.textContent = '0';

    const distEl = $('distance');
    if (distEl) distEl.textContent = '0 m';

    const bestEl = $('best-distance');
    if (bestEl) bestEl.textContent = '0 m';

    const levelEl = $('level');
    if (levelEl) levelEl.textContent = '1';

    const powersEl = $('powers');
    if (powersEl) powersEl.textContent = '';

    const noticeEl = $('notice');
    if (noticeEl) noticeEl.textContent = '';

    const overEl = $('over');
    if (overEl) overEl.hidden = true;

    const startEl = $('start');
    if (startEl) startEl.hidden = false;

    if (authError) authError.textContent = '';
    if (authPassword) authPassword.value = '';

    displaySession();
    authUser?.focus();
  };
}

// Initial session check once DOM and Scene are ready
window.addEventListener('load', () => {
  try {
    displaySession();
  } catch {
    if (authError) {
      authError.textContent = 'No se pudo acceder al almacenamiento local de este navegador.';
    }
  }
});

// Also expose game scene getter on window for dev debugging if needed
(window as unknown as { game: Phaser.Game }).game = game;
