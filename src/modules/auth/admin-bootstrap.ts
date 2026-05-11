import { env } from "../../config/env";
import { logInfo, logWarn } from "../../lib/logger";
import { hashPassword } from "../../lib/crypto";
import {
  adminUpdateUser,
  createUser,
  getUserByEmail
} from "./user-repository";

/**
 * Idempotent admin bootstrap, run once on server startup.
 *
 *  - If the env-configured admin user does NOT exist → create with the env
 *    password and is_admin=1.
 *  - If they DO exist but is_admin=0 → promote (but never reset password).
 *  - If they exist and are admin → no-op.
 *
 * Password is set on first creation only. Later password changes through the
 * UI must persist across reboots; if we re-read env on every boot the operator
 * could never change the admin password without also editing .env. The
 * trade-off is that lost passwords require an env update + manual DB delete,
 * which is the right friction for an account this privileged.
 */
export async function bootstrapAdmin(): Promise<void> {
  const email = env.ADMIN_EMAIL.trim().toLowerCase();
  const password = env.ADMIN_PASSWORD;

  try {
    const existing = await getUserByEmail(email);
    if (!existing) {
      const passwordHash = await hashPassword(password);
      const created = await createUser({ email, name: "Admin", passwordHash });
      await adminUpdateUser(created.id, { isAdmin: true });
      logInfo("admin-bootstrap", "Admin account created", { email, id: created.id });
      return;
    }

    if (!existing.is_admin) {
      await adminUpdateUser(existing.id, { isAdmin: true });
      logInfo("admin-bootstrap", "Existing user promoted to admin", {
        email,
        id: existing.id
      });
      return;
    }

    // Already admin — nothing to do.
    logInfo("admin-bootstrap", "Admin account verified", { email, id: existing.id });
  } catch (error) {
    // Don't crash the server — log loudly. If MySQL is briefly unreachable
    // during a deploy, the next start will retry. If the migration hasn't
    // run yet, the operator will see this in logs and know to run migrate.
    logWarn(
      "admin-bootstrap",
      "Failed to bootstrap admin account — admin endpoints may be unreachable until this is fixed",
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}
