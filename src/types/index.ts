import * as Phaser from 'phaser';

export type ObstacleKind = 'hole' | 'coin' | 'gasolina' | 'helmet' | 'nitro' | 'magnet';

export interface GameItem extends Phaser.GameObjects.Image {
  kind: ObstacleKind;
  lane: number;
  roadX: number;
  dead?: boolean;
}

export type SoundKind = 'coin' | 'gasolina' | 'power' | 'hit' | 'shield';

export interface UserAccount {
  username: string;
  passwordHash: string;
  createdAt: string;
}
