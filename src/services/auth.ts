import type { UserAccount } from '../types';

const USERS_KEY = 'motoconcho2-users';
const SESSION_KEY = 'motoconcho2-session';

function cleanUsername(name: string): string {
  return String(name || '').trim().toLowerCase();
}

function getUserList(): UserAccount[] {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) return [];
  const users = JSON.parse(raw);
  if (!Array.isArray(users)) {
    throw new Error('No se pueden leer los usuarios guardados.');
  }
  return users as UserAccount[];
}

function getUserKey(name: string, type: 'total' | 'record'): string {
  return `motoconcho2-user-${encodeURIComponent(name)}-${type}`;
}

function validateCredentials(name: string, password: string): void {
  if (!name || !password) {
    throw new Error('Completa usuario y clave.');
  }
  if (!/^[a-z0-9_.-]{1,32}$/.test(name)) {
    throw new Error('Usa de 1 a 32 letras sin acentos, números, punto, guion o guion bajo.');
  }
}

async function hashPassword(password: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}

export const Auth = {
  getCurrentUser(): string | null {
    try {
      const name = localStorage.getItem(SESSION_KEY);
      return name && getUserList().some(u => u.username === name) ? name : null;
    } catch {
      return null;
    }
  },

  async register(username: string, password: string): Promise<string> {
    const name = cleanUsername(username);
    validateCredentials(name, password);
    const users = getUserList();
    if (users.some(u => u.username === name)) {
      throw new Error('Ese usuario ya existe.');
    }
    const passwordHash = await hashPassword(password);

    // El primer registro hereda los valores globales anteriores en este navegador si existen
    if (users.length === 0) {
      const legacyKeys: [string, 'total' | 'record'][] = [
        ['motoconcho2-total-score', 'total'],
        ['motoconcho2-distance-record', 'record']
      ];
      for (const [oldKey, type] of legacyKeys) {
        const old = localStorage.getItem(oldKey);
        if (old !== null && localStorage.getItem(getUserKey(name, type)) === null) {
          localStorage.setItem(getUserKey(name, type), old);
        }
      }
    }

    users.push({
      username: name,
      passwordHash,
      createdAt: new Date().toISOString()
    });

    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.setItem(SESSION_KEY, name);
    return name;
  },

  async login(username: string, password: string): Promise<string> {
    const name = cleanUsername(username);
    validateCredentials(name, password);
    const user = getUserList().find(u => u.username === name);
    if (!user) {
      throw new Error('Usuario no encontrado.');
    }
    const enteredHash = await hashPassword(password);
    if (user.passwordHash !== enteredHash) {
      throw new Error('Clave incorrecta.');
    }
    localStorage.setItem(SESSION_KEY, name);
    return name;
  },

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
  },

  scoreKey(type: 'total' | 'record'): string {
    const user = Auth.getCurrentUser();
    if (!user) {
      throw new Error('Debes iniciar sesión.');
    }
    return getUserKey(user, type);
  }
};
