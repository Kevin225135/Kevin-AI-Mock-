import assert from "node:assert/strict";
import test from "node:test";
import { analyticsEvents } from "@/lib/analytics/events";
import { eventSchema } from "./mock";

test("accepts every fixed analytics event name", () => {
  for (const name of Object.values(analyticsEvents)) {
    assert.equal(eventSchema.safeParse({ name }).success, true, name);
  }
});

test("rejects arbitrary client event names", () => {
  assert.equal(
    eventSchema.safeParse({
      name: "admin_override",
      payload: { token: "secret" }
    }).success,
    false
  );
  assert.equal(
    eventSchema.safeParse({
      name: "mock_start",
      payload: { note: "x".repeat(5000) }
    }).success,
    false
  );
});
