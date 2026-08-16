import assert from "node:assert/strict";
import test from "node:test";
import { registerSchema } from "./auth";
import { deleteAccountSchema } from "./users";

test("registration requires explicit privacy acceptance", () => {
  const base = { email: "user@example.com", password: "valid-password" };
  assert.equal(registerSchema.safeParse(base).success, false);
  assert.equal(
    registerSchema.safeParse({ ...base, privacyAccepted: false }).success,
    false
  );
  assert.equal(
    registerSchema.safeParse({ ...base, privacyAccepted: true }).success,
    true
  );
});

test("account deletion requires password and exact confirmation phrase", () => {
  assert.equal(
    deleteAccountSchema.safeParse({
      password: "valid-password",
      confirmation: "delete"
    }).success,
    false
  );
  assert.equal(
    deleteAccountSchema.safeParse({
      password: "valid-password",
      confirmation: "DELETE"
    }).success,
    true
  );
});
