'use strict';
// Adaptador local: se puede reemplazar por Firebase conservando esta interfaz.
// DEMOSTRACIÓN: un hash en localStorage no protege contraseñas ni datos reales.
const Auth = (() => {
  const USERS = 'motoconcho2-users';
  const SESSION = 'motoconcho2-session';
  const clean = name => String(name || '').trim().toLowerCase();
  const list = () => {
    const raw = localStorage.getItem(USERS);
    if (!raw) return [];
    const users = JSON.parse(raw);
    if (!Array.isArray(users)) throw new Error('No se pueden leer los usuarios guardados.');
    return users;
  };
  const key = (name, type) => `motoconcho2-user-${encodeURIComponent(name)}-${type}`;
  const validate = (name, password) => {
    if (!name || !password) throw new Error('Completa usuario y clave.');
    if (!/^[a-z0-9_.-]{1,32}$/.test(name)) throw new Error('Usa de 1 a 32 letras sin acentos, números, punto, guion o guion bajo.');
  };
  const hash = async password => {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
  };
  const getCurrentUser = () => {
    const name = localStorage.getItem(SESSION);
    return name && list().some(u => u.username === name) ? name : null;
  };
  return {
    async register(username, password) {
      const name = clean(username); validate(name, password);
      const users = list();
      if (users.some(u => u.username === name)) throw new Error('Ese usuario ya existe.');
      const passwordHash = await hash(password);
      // El primer registro hereda los valores globales anteriores en este navegador.
      if (users.length === 0) {
        for (const [oldKey, type] of [['motoconcho2-total-score', 'total'], ['motoconcho2-distance-record', 'record']]) {
          const old = localStorage.getItem(oldKey);
          if (old !== null && localStorage.getItem(key(name, type)) === null) localStorage.setItem(key(name, type), old);
        }
      }
      users.push({username: name, passwordHash, createdAt: new Date().toISOString()});
      localStorage.setItem(USERS, JSON.stringify(users));
      localStorage.setItem(SESSION, name);
      return name;
    },
    async login(username, password) {
      const name = clean(username); validate(name, password);
      const user = list().find(u => u.username === name);
      if (!user) throw new Error('Usuario no encontrado.');
      if (user.passwordHash !== await hash(password)) throw new Error('Clave incorrecta.');
      localStorage.setItem(SESSION, name);
      return name;
    },
    logout() { localStorage.removeItem(SESSION); },
    getCurrentUser,
    scoreKey(type) {
      const user = getCurrentUser();
      if (!user) throw new Error('Debes iniciar sesión.');
      return key(user, type);
    }
  };
})();
