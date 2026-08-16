import assert from "node:assert/strict";
import test from "node:test";
import { signAccessToken, verifyAccessToken } from "./jwt";

test("signAccessToken creates a verifiable token", () => {
  process.env.AUTH_JWT_SECRET = "test-secret-with-at-least-thirty-two-characters";
  process.env.AUTH_ACCESS_TOKEN_TTL_MINUTES = "15";

  const token = signAccessToken({
    sub: "user_1",
    sid: "session_1",
    email: "user@example.com",
    role: "USER",
    permissions: ["mock:create"],
    tokenVersion: 0
  });
  const payload = verifyAccessToken(token);

  assert.equal(payload.sub, "user_1");
  assert.equal(payload.sid, "session_1");
  assert.equal(payload.role, "USER");
  assert.deepEqual(payload.permissions, ["mock:create"]);
  assert.equal(typeof payload.exp, "number");
});
