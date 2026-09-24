import { test } from "node:test";
import assert from "node:assert/strict";
import { isMatch, answerKey } from "./matching";

const ILC = ["Invasive lobular carcinoma", "Lobular carcinoma, invasive"];

test("accepts exact and reordered diagnoses", () => {
  assert.ok(isMatch("invasive lobular carcinoma", ILC));
  assert.ok(isMatch("Lobular carcinoma — invasive, classic type", ILC));
  assert.ok(isMatch("ILC", ILC));
  assert.ok(isMatch("  INVASIVE   LOBULAR  CARCINOMA. ", ILC));
});

test("rejects a different entity", () => {
  assert.equal(isMatch("invasive ductal carcinoma", ILC), false);
  assert.equal(isMatch("lobular carcinoma in situ", ILC), false);
  assert.equal(isMatch("carcinoma", ILC), false);
  assert.equal(isMatch("", ILC), false);
});

test("spelling variants and abbreviations", () => {
  assert.ok(isMatch("GIST", ["Gastrointestinal stromal tumour"]));
  assert.ok(isMatch("gastrointestinal stromal tumor, spindle cell type", ["GIST"]));
  assert.ok(isMatch("DLBCL", ["Diffuse large B-cell lymphoma, NOS"]));
  assert.ok(isMatch("well differentiated SCC", ["Squamous cell carcinoma, well differentiated"]));
  assert.equal(isMatch("BCC", ["Squamous cell carcinoma"]), false);
});

test("Persian answers against Persian aliases", () => {
  assert.ok(isMatch("کارسینوم لوبولار مهاجم", ["کارسينوم لوبولار مهاجم"])); // ي عربی
});

test("answer key groups equivalent answers", () => {
  assert.equal(answerKey("Invasive lobular carcinoma"), answerKey("ILC"));
  assert.equal(answerKey("lobular carcinoma, invasive"), answerKey("Invasive Lobular Carcinoma"));
});
