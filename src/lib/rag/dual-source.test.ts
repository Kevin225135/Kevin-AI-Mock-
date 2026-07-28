import assert from "node:assert/strict";
import test from "node:test";
import { shouldSearchWeb } from "./dual-source";

test("routes time-sensitive and market queries to web search", () => {
  assert.equal(shouldSearchWeb("最近港股IPO市场情况"), true);
  assert.equal(shouldSearchWeb("latest AI model news"), true);
  assert.equal(shouldSearchWeb("DCF的基本公式是什么"), false);
});
