import * as Phaser from 'phaser';

export type HazardKind = 'hole' | 'officer' | 'police_car' | 'truck' | 'tank';
export type PickupKind = 'coin' | 'gasolina' | 'helmet' | 'nitro' | 'magnet';
export type ObstacleKind = HazardKind | PickupKind;

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
