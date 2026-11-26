const assert = require("node:assert/strict");
const path = require("node:path");
const { createRequire } = require("node:module");
const { test } = require("node:test");

// Lowest patched releases for every package in the reported advisories.
// Keep the older brace-expansion/minimatch lines where upstream still uses them.
const minimumVersions = {
  "proxy-addr": () => "2.0.8",
  "body-parser": (major) => major === 1 ? "1.20.9" : "2.4.0",
  vite: () => "8.2.4",
  "source-map-js": () => "1.2.2",
  "brace-expansion": (major) => ({
    1: "1.1.21", 2: "2.1.7",
  })[major] || "5.0.12",
  "follow-redirects": () => "1.16.2",
  zod: () => "4.6.6",
  glob: () => "14.0.2",
  qs: () => "6.16.1",
  minimatch: (major) => major < 7 ? "3.1.5" : "11.0.1",
};

function atLeast(version, minimum) {
  const actual = version.split(".").map(Number);
  const expected = minimum.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (actual[i] !== expected[i]) return actual[i] > expected[i];
  }
  return true;
}

for (const app of ["frontend", "backend"]) {
  test(`${app} lockfile excludes all reported vulnerable versions`, () => {
    const lock = require(`../${app}/package-lock.json`);
    for (const [location, entry] of Object.entries(lock.packages)) {
      const name = location.split("node_modules/").pop();
      if (!minimumVersions[name]) continue;
      const major = Number(entry.version.split(".")[0]);
      const minimum = minimumVersions[name](major);
      assert.ok(
        atLeast(entry.version, minimum),
        `${app}: ${location}@${entry.version} must be >= ${minimum}`,
      );
    }
  });
}

test("nodemon's patched minimatch preserves watch, ignore, and extension matching", () => {
  const backendRequire = createRequire(path.resolve(__dirname, "../backend/package.json"));
  const nodemonRequire = createRequire(backendRequire.resolve("nodemon"));
  const { minimatch } = nodemonRequire("minimatch");
  assert.equal(typeof minimatch, "function");

  const match = backendRequire("nodemon/lib/monitor/match");
  const root = path.resolve(__dirname, "../backend");
  const server = path.join(root, "server.js");
  const route = path.join(root, "routes/payments.js");
  const ignored = path.join(root, "node_modules/example/index.js");
  const image = path.join(root, "Images/example.png");
  const rules = [`${root}/**/*`, `!${root}/node_modules/**`];
  const result = match([server, route, ignored, image], rules, "js,json");
  assert.deepEqual(result.result.sort(), [server, route].sort());
});
