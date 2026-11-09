import * as Phaser from 'phaser';
import type { GameItem, ObstacleKind } from '../types';
import { sound } from '../services/audio';
import { Auth } from '../services/auth';
import { hud } from '../ui/hud';

export class RideScene extends Phaser.Scene {
  private background!: Phaser.GameObjects.Graphics;
  public objects: GameItem[] = [];
  public lanes = [117, 210, 303];
  public lane = 1;
  public score = 0;
  public totalScore = 0;
  public bestDistance = 0;
  public runStartScore = 0;
  public distance = 0;
  public level = 1;
  public speed = 220;
  public nextSpawn = 0;
  public clock = 0;
  public shield = false;
  public nitroUntil = 0;
  public magnetUntil = 0;
  public alive = false;
  public roadOffset = 0;
  public cloudOffset = 0;
  public rider!: Phaser.GameObjects.Image;
  private keys?: Phaser.Types.Input.Keyboard.CursorKeys;
  private noticeUntil = 0;

  constructor() {
    super('Ride');
  }

  create(): void {
    this.makeArt();
    this.background = this.add.graphics();
    this.objects = [];
    this.lanes = [117, 210, 303];
    this.lane = 1;
    this.loadScores();
    this.score = this.totalScore;
    this.distance = 0;
    this.level = 1;
    this.speed = 220;
    this.nextSpawn = 0;
    this.clock = 0;
    this.shield = false;
    this.nitroUntil = 0;
    this.magnetUntil = 0;
    this.alive = false;
    this.roadOffset = 0;
    this.cloudOffset = 0;

    this.rider = this.add.image(210, 570, 'rider').setDepth(5);
    this.rider.setVisible(false);

    if (this.input.keyboard) {
      this.keys = this.input.keyboard.createCursorKeys();
      this.keys.left.on('down', () => this.move(-1));
      this.keys.right.on('down', () => this.move(1));
    }

    this.paint();
    this.refresh();
  }

  public loadScores(): void {
    try {
      const key = Auth.scoreKey('record');
      this.bestDistance = Number(localStorage.getItem(key)) || 0;
    } catch {
      this.bestDistance = 0;
    }

    try {
      const savedScore = Number(localStorage.getItem(Auth.scoreKey('total')));
      if (Number.isSafeInteger(savedScore) && savedScore >= 0) {
        this.totalScore = savedScore;
      } else {
        this.totalScore = 0;
      }
    } catch {
      this.totalScore = 0;
    }
  }

  private makeArt(): void {
    if (this.textures.exists('rider')) return;
    const g = this.make.graphics({ x: 0, y: 0 });

    // Motoconcho visto desde arriba: colores y silueta del juego original.
    g.fillStyle(0x152c36, 0.44);
    g.fillEllipse(38, 62, 48, 20);
    g.fillStyle(0x182e3a);
    g.fillRoundedRect(28, 15, 14, 27, 6);
    g.fillRoundedRect(28, 60, 14, 27, 6);
    g.fillStyle(0xff833c);
    g.lineStyle(2, 0x173a48);
    g.fillRoundedRect(20, 23, 30, 48, 10);
    g.strokeRoundedRect(20, 23, 30, 48, 10);
    g.fillStyle(0xffe15f);
    g.fillRoundedRect(25, 53, 20, 17, 6);
    g.strokeRoundedRect(25, 53, 20, 17, 6);
    g.fillStyle(0xfff1a7);
    g.fillRoundedRect(25, 15, 20, 16, 5);
    g.strokeRoundedRect(25, 15, 20, 16, 5);
    g.lineStyle(4, 0x173a48);
    g.lineBetween(10, 29, 60, 29);
    g.fillStyle(0xf2b57a);
    g.fillCircle(13, 30, 4);
    g.fillCircle(57, 30, 4);
    g.fillStyle(0x18b1a3);
    g.lineStyle(2, 0x173a48);
    g.fillRoundedRect(17, 34, 36, 28, 12);
    g.strokeRoundedRect(17, 34, 36, 28, 12);
    g.fillStyle(0x173a48);
    g.fillRoundedRect(25, 61, 20, 9, 4);
    g.fillStyle(0xd78b54);
    g.fillEllipse(35, 29, 26, 24);
    g.strokeEllipse(35, 29, 26, 24);
    g.fillStyle(0xffe25a);
    g.fillEllipse(35, 22, 30, 24);
    g.strokeEllipse(35, 22, 30, 24);
    g.fillStyle(0xfff2c6);
    g.fillRoundedRect(22, 21, 26, 6, 2);
    g.generateTexture('rider', 70, 90);
    g.clear();

    // Huaca con borde de tierra y grietas.
    g.fillStyle(0xcf9e5f);
    g.fillEllipse(40, 22, 58, 32);
    g.fillStyle(0x182d38);
    g.fillEllipse(40, 19, 54, 28);
    g.fillStyle(0x36444a);
    g.fillEllipse(38, 22, 36, 16);
    g.lineStyle(3, 0xc2a36b);
    g.lineBetween(9, 12, 2, 7);
    g.lineBetween(66, 28, 75, 32);
    g.generateTexture('hole', 80, 42);
    g.clear();

    // Moneda
    g.fillStyle(0xb17b2e);
    g.fillEllipse(17, 20, 24, 30);
    g.fillStyle(0xffdb4b);
    g.lineStyle(2, 0xba7e27);
    g.fillEllipse(17, 17, 24, 30);
    g.strokeEllipse(17, 17, 24, 30);
    g.fillStyle(0xffe783);
    g.fillEllipse(17, 17, 14, 20);
    g.lineStyle(2, 0xa77528);
    g.lineBetween(17, 9, 17, 25);
    g.lineBetween(13, 12, 20, 12);
    g.lineBetween(14, 20, 21, 20);
    g.generateTexture('coin', 34, 36);
    g.clear();

    // Pote de gasolina rojo, con asa y etiqueta crema.
    g.lineStyle(3, 0x173a48);
    g.strokeRoundedRect(9, 2, 14, 9, 3);
    g.lineStyle(2, 0xe95a3e);
    g.strokeRoundedRect(10, 3, 12, 7, 2);
    g.fillStyle(0x173a48);
    g.fillRoundedRect(24, 1, 7, 6, 1);
    g.fillStyle(0xe95a3e);
    g.lineStyle(2, 0x173a48);
    g.fillRoundedRect(6, 8, 26, 22, 4);
    g.strokeRoundedRect(6, 8, 26, 22, 4);
    g.fillStyle(0xfff1c6);
    g.fillRoundedRect(12, 13, 14, 12, 2);
    g.lineStyle(2, 0xba4635);
    g.lineBetween(15, 16, 23, 22);
    g.lineBetween(23, 16, 15, 22);
    g.generateTexture('gasolina', 38, 32);
    g.clear();

    // Casco
    g.fillStyle(0xf8c63e);
    g.fillCircle(18, 18, 18);
    g.fillStyle(0xf3f7ff);
    g.fillRoundedRect(6, 10, 24, 13, 8);
    g.fillStyle(0x174f91);
    g.fillRect(6, 20, 24, 4);
    g.generateTexture('helmet', 36, 36);
    g.clear();

    // Nitro
    g.fillStyle(0xf06627);
    g.fillRoundedRect(6, 5, 25, 29, 6);
    g.fillStyle(0xffe458);
    g.fillTriangle(21, 6, 12, 21, 19, 20);
    g.fillTriangle(19, 18, 26, 16, 15, 31);
    g.generateTexture('nitro', 38, 38);
    g.clear();

    // Imán
    g.fillStyle(0xe84343);
    g.fillRoundedRect(7, 5, 24, 28, 8);
    g.fillStyle(0x92dffa);
    g.fillRect(13, 5, 12, 18);
    g.fillStyle(0xf2f6fc);
    g.fillRect(7, 4, 6, 9);
    g.fillRect(25, 4, 6, 9);
    g.generateTexture('magnet', 38, 38);
    g.destroy();
  }

  public startRide(): void {
    if (!Auth.getCurrentUser()) return;
    this.loadScores();
    this.objects.forEach(o => o.destroy());
    this.objects = [];
    this.lane = 1;
    this.score = this.totalScore;
    this.runStartScore = this.totalScore;
    this.distance = 0;
    this.level = 1;
    this.speed = 220;
    this.clock = 0;
    this.nextSpawn = 0.7;
    this.shield = false;
    this.nitroUntil = 0;
    this.magnetUntil = 0;
    this.alive = true;

    this.rider.setPosition(210, 570).setVisible(true).setAlpha(1);

    const startEl = document.getElementById('start');
    if (startEl) startEl.hidden = true;
    const overEl = document.getElementById('over');
    if (overEl) overEl.hidden = true;

    this.announce('¡Dale!');
    this.refresh();
  }

  public move(direction: number): void {
    if (!this.alive) return;
    this.lane = Phaser.Math.Clamp(this.lane + direction, 0, 2);
  }

  public announce(text: string): void {
    hud.showNotice(text);
    this.noticeUntil = this.clock + 1.5;
  }

  public spawn(type: ObstacleKind, lane: number, y = 225): GameItem {
    y = Math.max(225, y);
    const depth = Phaser.Math.Clamp((y - 225) / 345, 0, 1);
    const roadX = 210 + (this.lanes[lane] - 210) * (0.5 + 0.5 * depth);
    const obj = this.add.image(roadX, y, type) as GameItem;
    obj.setDepth(4)
      .setScale(0.45 + 0.55 * depth)
      .setAlpha(Phaser.Math.Clamp((y - 225) / 55, 0, 1));
    obj.kind = type;
    obj.lane = lane;
    obj.roadX = roadX;
    this.objects.push(obj);
    return obj;
  }

  public collect(obj: GameItem): void {
    const t = obj.kind;
    if (t === 'coin') {
      this.score += 10;
      sound.play('coin');
    } else if (t === 'gasolina') {
      this.score += 15;
      sound.play('gasolina');
    } else if (t === 'helmet') {
      this.shield = true;
      sound.play('power');
      this.announce('¡Casco!');
    } else if (t === 'nitro') {
      this.nitroUntil = this.clock + 4;
      sound.play('power');
      this.announce('¡Nitro!');
    } else if (t === 'magnet') {
      this.magnetUntil = this.clock + 7;
      sound.play('power');
      this.announce('¡Imán!');
    }

    if (t === 'coin' || t === 'gasolina') {
      this.totalScore = this.score;
      try {
        localStorage.setItem(Auth.scoreKey('total'), String(this.totalScore));
      } catch {
        // ignore storage errors
      }
    }

    obj.destroy();
    obj.dead = true;
    this.refresh();
  }

  public hit(obj: GameItem): void {
    if (this.clock < this.nitroUntil) {
      obj.destroy();
      obj.dead = true;
      return;
    }

    if (this.shield) {
      this.shield = false;
      obj.destroy();
      obj.dead = true;
      sound.play('shield');
      this.announce('¡Casco salvador!');
      this.refresh();
      return;
    }

    this.alive = false;
    sound.play('hit');
    this.refresh();

    const finalEl = document.getElementById('final');
    if (finalEl) finalEl.textContent = `Puntaje: ${Math.floor(this.score)}`;

    const finalDistEl = document.getElementById('final-distance');
    if (finalDistEl) finalDistEl.textContent = `Distancia: ${Math.floor(this.distance)} m`;

    const recordEl = document.getElementById('record');
    if (recordEl) recordEl.textContent = `Récord: ${this.bestDistance} m`;

    const overEl = document.getElementById('over');
    if (overEl) overEl.hidden = false;
  }

  public refresh(): void {
    const travelled = Math.floor(this.distance);
    if (travelled > this.bestDistance) {
      this.bestDistance = travelled;
      try {
        localStorage.setItem(Auth.scoreKey('record'), String(this.bestDistance));
      } catch {
        // ignore storage errors
      }
    }

    hud.updateStats({
      score: this.score,
      distance: this.distance,
      bestDistance: this.bestDistance,
      level: this.level,
      shield: this.shield,
      nitroRemaining: Math.max(0, this.nitroUntil - this.clock),
      magnetRemaining: Math.max(0, this.magnetUntil - this.clock)
    });
  }

  public paint(): void {
    const g = this.background;
    g.clear();

    // Cielo
    g.fillStyle(0x78d9cf);
    g.fillRect(0, 0, 420, 740);

    // Sol
    g.fillStyle(0xffe784);
    g.fillCircle(353, 141, 31);

    // Edificios del fondo
    const colors = [0xed825b, 0xf4ca77, 0x6cb6ac, 0xb4a2ce];
    for (let k = 0; k < 7; k++) {
      const x = k * 63 - 8;
      const y = 148 + (k % 3) * 10;
      g.fillStyle(colors[k % 4]);
      g.lineStyle(2, 0x4c7472);
      g.fillRoundedRect(x, y, 55, 89, 4);
      g.strokeRoundedRect(x, y, 55, 89, 4);
      g.fillStyle(0xfff0c4);
      for (let j = 0; j < 2; j++) {
        for (let a = 0; a < 2; a++) {
          g.fillRect(x + 8 + j * 23, y + 9 + a * 14, 7, 7);
        }
      }
    }

    // Suelo verde y acera
    g.fillStyle(0x9ebc73);
    g.fillRect(0, 215, 420, 525);
    g.fillStyle(0xd8b371);
    g.fillRect(27, 215, 366, 525);

    // Asfalto
    g.fillStyle(0x344950);
    g.fillRect(38, 215, 344, 525);

    // Bordillos amarillos
    g.fillStyle(0xf6de96);
    g.fillRect(41, 215, 3, 525);
    g.fillRect(376, 215, 3, 525);

    // Líneas divisorias de carriles con desplazamiento
    g.fillStyle(0xf1e5bf);
    for (const x of [154, 266]) {
      for (let y = 215 + (this.roadOffset % 82) - 82; y < 740; y += 82) {
        if (y + 41 > 215) {
          g.fillRect(x, Math.max(215, y), 3, Math.min(y + 41, 740) - Math.max(215, y));
        }
      }
    }

    // Palmitas estilizadas en los extremos
    for (const [x, y] of [
      [15, 215],
      [407, 348]
    ]) {
      g.lineStyle(7, 0x855b3d);
      g.lineBetween(x, y + 49, x + 4, y);
      g.lineStyle(6, 0x1b866c);
      g.lineBetween(x + 4, y, x - 20, y - 12);
      g.lineBetween(x + 4, y, x - 12, y - 22);
      g.lineBetween(x + 4, y, x + 7, y - 24);
      g.lineBetween(x + 4, y, x + 25, y - 16);
      g.lineBetween(x + 4, y, x + 27, y + 4);
    }
  }

  override update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05);

    if (!this.alive) {
      this.cloudOffset += dt * 5;
      this.paint();
      return;
    }

    this.clock += dt;
    const speed = this.speed * (this.clock < this.nitroUntil ? 1.55 : 1);
    this.distance += speed * dt * 0.1;

    const newLevel = 1 + Math.floor((this.score - this.runStartScore) / 100);
    if (newLevel > this.level) {
      this.level = newLevel;
      this.speed = 220 + (this.level - 1) * 25;
      this.announce(`Nivel ${this.level}`);
    }

    this.roadOffset += speed * dt;
    this.cloudOffset += dt * 8;
    this.paint();

    this.rider.x = Phaser.Math.Linear(this.rider.x, this.lanes[this.lane], Math.min(1, dt * 15));
    this.rider.setAlpha(this.clock < this.nitroUntil ? 0.65 : 1);

    this.nextSpawn -= dt;
    if (this.nextSpawn <= 0) {
      const r = Math.random();
      const type: ObstacleKind =
        r < 0.43
          ? 'hole'
          : r < 0.67
          ? 'coin'
          : r < 0.82
          ? 'gasolina'
          : r < 0.88
          ? 'helmet'
          : r < 0.94
          ? 'nitro'
          : 'magnet';
      this.spawn(type, Phaser.Math.Between(0, 2));
      this.nextSpawn = Math.max(0.48, 1.15 - (this.level - 1) * 0.055);
    }

    for (const o of this.objects) {
      if (o.dead) continue;
      o.y += speed * dt;
      const depth = Phaser.Math.Clamp((o.y - 225) / 345, 0, 1);
      const roadX = 210 + (this.lanes[o.lane] - 210) * (0.5 + 0.5 * depth);
      o.x += roadX - o.roadX;
      o.roadX = roadX;
      o.setScale(0.45 + 0.55 * depth).setAlpha(Phaser.Math.Clamp((o.y - 225) / 55, 0, 1));

      if (o.kind === 'coin' && this.clock < this.magnetUntil && o.y > 340 && o.y < 620) {
        o.x = Phaser.Math.Linear(o.x, this.rider.x, Math.min(1, dt * 5));
      }

      if (Math.abs(o.y - this.rider.y) < 30 && Math.abs(o.x - this.rider.x) < 38) {
        if (o.kind === 'hole') {
          this.hit(o);
        } else {
          this.collect(o);
        }
        if (!this.alive) break;
      }

      if (o.y > 780) {
        o.destroy();
        o.dead = true;
      }
    }

    this.objects = this.objects.filter(o => !o.dead);

    if (this.noticeUntil && this.clock > this.noticeUntil) {
      hud.clearNotice();
      this.noticeUntil = 0;
    }

    this.refresh();
  }
}
