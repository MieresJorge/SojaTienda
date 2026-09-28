/**
 * Genera el valor de ADMIN_PASSWORD_HASH para el panel.
 *
 *   npm run admin:hash -- "mi contraseña"
 *
 * Guardá la línea que imprime en el .env del servidor y borrá ADMIN_PASSWORD.
 * Así la contraseña no queda en texto plano en ningún archivo.
 */
import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv.slice(2).join(" ").trim();

if (!password) {
  console.error('Uso: npm run admin:hash -- "tu contraseña"');
  process.exit(1);
}

if (password.length < 10) {
  console.error("Usá una contraseña de al menos 10 caracteres.");
  process.exit(1);
}

const salt = randomBytes(16);
const key = scryptSync(password.normalize("NFKC"), salt, 64);

console.log("");
console.log("Pegá esto en tu .env (y sacá ADMIN_PASSWORD):");
console.log("");
console.log(`ADMIN_PASSWORD_HASH="scrypt:${salt.toString("hex")}:${key.toString("hex")}"`);
console.log("");
