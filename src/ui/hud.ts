export interface GameStats {
  score: number;
  distance: number;
  bestDistance: number;
  level: number;
  shield: boolean;
  nitroRemaining: number;
  magnetRemaining: number;
}

export class HUD {
  private elScore = document.getElementById('score');
  private elDistance = document.getElementById('distance');
  private elBestDistance = document.getElementById('best-distance');
  private elLevel = document.getElementById('level');
  private elPowers = document.getElementById('powers');
  private elNotice = document.getElementById('notice');
  private elMute = document.getElementById('mute');

  public updateStats(stats: GameStats): void {
    if (this.elScore) this.elScore.textContent = Math.floor(stats.score).toString();
    if (this.elDistance) this.elDistance.textContent = `${Math.floor(stats.distance)} m`;
    if (this.elBestDistance) this.elBestDistance.textContent = `${stats.bestDistance} m`;
    if (this.elLevel) this.elLevel.textContent = stats.level.toString();

    const powers: string[] = [];
    if (stats.shield) powers.push('🪖 Casco');
    if (stats.nitroRemaining > 0) powers.push(`⚡ Nitro ${Math.ceil(stats.nitroRemaining)}s`);
    if (stats.magnetRemaining > 0) powers.push(`🧲 Imán ${Math.ceil(stats.magnetRemaining)}s`);

    if (this.elPowers) {
      this.elPowers.textContent = powers.join('  ·  ');
    }
  }

  public showNotice(text: string): void {
    if (this.elNotice) this.elNotice.textContent = text;
  }

  public clearNotice(): void {
    if (this.elNotice) this.elNotice.textContent = '';
  }

  public updateMuteButton(muted: boolean): void {
    if (this.elMute) {
      this.elMute.textContent = muted ? '♪×' : '♪';
      this.elMute.setAttribute('aria-label', muted ? 'Activar sonido' : 'Silenciar sonido');
    }
  }
}

export const hud = new HUD();
