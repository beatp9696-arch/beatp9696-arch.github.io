// Unit test สำหรับ merge logic ของ sync (pure — ไม่แตะ storage/เน็ต)
// รัน: node pp-os/test/merge.test.mjs
import { mergeState } from "../js/core/sync.js";

let pass = 0, fail = 0;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function check(name, cond) {
  if (cond) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗ FAIL:", name); }
}

// 1. remote key newer → pulled and adopted with remote ts
{
  const local = { data: { "notes.text": "old" }, meta: { "notes.text": 100 } };
  const remote = { data: { "notes.text": "new" }, meta: { "notes.text": 200 } };
  const m = mergeState(local, remote);
  check("newer remote wins the key", m.data["notes.text"] === "new");
  check("adopts remote timestamp", m.meta["notes.text"] === 200);
  check("marked as pulled", eq(m.pulled, ["notes.text"]));
  check("not localAhead", m.localAhead === false);
}

// 2. local key newer → kept, localAhead true (must push)
{
  const local = { data: { "notes.text": "mine" }, meta: { "notes.text": 300 } };
  const remote = { data: { "notes.text": "theirs" }, meta: { "notes.text": 200 } };
  const m = mergeState(local, remote);
  check("newer local kept", m.data["notes.text"] === "mine");
  check("nothing pulled", m.pulled.length === 0);
  check("localAhead → will push", m.localAhead === true);
}

// 3. different keys on each side → union, no loss
{
  const local = { data: { "todo.items": [1] }, meta: { "todo.items": 300 } };
  const remote = { data: { "notes.text": "hi" }, meta: { "notes.text": 200 } };
  const m = mergeState(local, remote);
  check("keeps local-only key", eq(m.data["todo.items"], [1]));
  check("adds remote-only key", m.data["notes.text"] === "hi");
  check("remote-only counted as pulled", eq(m.pulled, ["notes.text"]));
  check("local-only makes localAhead", m.localAhead === true);
}

// 4. equal timestamps (tie) → keep local, no push, no pull (idempotent, no ping-pong)
{
  const local = { data: { "os.name": "PP" }, meta: { "os.name": 500 } };
  const remote = { data: { "os.name": "XX" }, meta: { "os.name": 500 } };
  const m = mergeState(local, remote);
  check("tie keeps local", m.data["os.name"] === "PP");
  check("tie pulls nothing", m.pulled.length === 0);
  check("tie no push", m.localAhead === false);
}

// 5. non-allowlisted key in remote is ignored (defense against junk/secret injection)
{
  const local = { data: { "notes.text": "a" }, meta: { "notes.text": 100 } };
  const remote = { data: { "sync.token": "SECRET", "evil": 1, "notes.text": "b" }, meta: { "sync.token": 999, "evil": 999, "notes.text": 200 } };
  const m = mergeState(local, remote);
  check("token never adopted", !("sync.token" in m.data));
  check("unknown key never adopted", !("evil" in m.data));
  check("known key still merges", m.data["notes.text"] === "b");
}

// 6. first device: remote empty → push everything, pull nothing
{
  const local = { data: { "health.days": { "2026-07-15": { steps: 100 } } }, meta: { "health.days": 1 } };
  const remote = { data: {}, meta: {} };
  const m = mergeState(local, remote);
  check("empty remote pulls nothing", m.pulled.length === 0);
  check("empty remote → localAhead push", m.localAhead === true);
  check("data preserved", m.data["health.days"]["2026-07-15"].steps === 100);
}

// 7. second device fresh (local empty) → pull everything
{
  const local = { data: {}, meta: {} };
  const remote = { data: { "money.entries": [{ id: 1 }] }, meta: { "money.entries": 400 } };
  const m = mergeState(local, remote);
  check("fresh device pulls all", eq(m.pulled, ["money.entries"]));
  check("no push needed", m.localAhead === false);
  check("data received", eq(m.data["money.entries"], [{ id: 1 }]));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
