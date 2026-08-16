import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, verifyPassword } from "./password";

test("hashPassword verifies the original password", async () => {
  const hash = await hashPassword("correct-password");

  assert.equal(await verifyPassword("correct-password", hash), true);
  assert.equal(await verifyPassword("wrong-password", hash), false);
  assert.notEqual(hash, "correct-password");
});
