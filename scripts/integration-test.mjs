const BASE = "http://localhost:8080/api";

async function check(label, fn) {
  try {
    const ok = await fn();
    if (ok === false) { console.error("FAIL", label); return false; }
    console.log("PASS", label);
    return true;
  } catch (e) { console.error("FAIL", label, e.message); return false; }
}

let passed = 0, total = 0;
async function run(label, fn) { total++; if (await check(label, fn)) passed++; }

await run("health", async () => { const r = await fetch(BASE + "/healthz"); return r.ok; });
await run("kb list (non-empty)", async () => { const r = await fetch(BASE + "/knowledge-base?page=1&limit=5"); const d = await r.json(); return Array.isArray(d) && d.length > 0; });
await run("kb categories", async () => { const r = await fetch(BASE + "/knowledge-base/categories"); const d = await r.json(); return Array.isArray(d); });
await run("memory list", async () => { const r = await fetch(BASE + "/memory"); const d = await r.json(); return Array.isArray(d); });
await run("plans list", async () => { const r = await fetch(BASE + "/plans"); const d = await r.json(); return Array.isArray(d); });
await run("chat sessions", async () => { const r = await fetch(BASE + "/chat/sessions"); const d = await r.json(); return Array.isArray(d); });
await run("tool evaluations", async () => { const r = await fetch(BASE + "/tool-evaluations"); const d = await r.json(); return Array.isArray(d); });
await run("system instructions chat", async () => { const r = await fetch(BASE + "/system-instructions/chat"); const d = await r.json(); return d && d.mode === "chat"; });
await run("web search multi-strategy", async () => { const r = await fetch(BASE + "/search?q=LangChain"); const d = await r.json(); return d && typeof d.total === "number" && d.results.length > 0; });

await run("plan upload-document (json)", async () => {
  const plansR = await fetch(BASE + "/plans");
  const plans = await plansR.json();
  if (!plans.length) return true;
  const planId = plans[0].id;
  const r = await fetch(BASE + "/plans/" + planId + "/upload-document", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: "test.txt", content: "This is a test document about AI agents and RAG systems." })
  });
  if (!r.ok) { console.error("  upload HTTP", r.status, await r.text()); return false; }
  const d = await r.json();
  return d && typeof d.planId === "number" && d.characterCount > 0;
});

await run("chat SSE contract (delta+done)", async () => {
  const sessR = await fetch(BASE + "/chat/sessions", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "SSE contract test", language: "en" })
  });
  if (!sessR.ok) { console.error("  create session HTTP", sessR.status); return false; }
  const sess = await sessR.json();

  const r = await fetch(BASE + "/chat/sessions/" + sess.id + "/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "Reply with just OK.", language: "en" })
  });
  if (!r.ok) { console.error("  send message HTTP", r.status); return false; }
  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("text/event-stream")) { console.error("  bad Content-Type:", ct); return false; }

  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "", gotDelta = false, gotDone = false;
  const deadline = Date.now() + 30000;
  while (!gotDone && Date.now() < deadline) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    for (const line of buf.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      try {
        const p = JSON.parse(line.slice(6));
        if (p.type === "delta") gotDelta = true;
        if (p.type === "done") gotDone = true;
      } catch {}
    }
  }
  if (!gotDelta || !gotDone) { console.error("  delta:", gotDelta, "done:", gotDone); return false; }
  await fetch(BASE + "/chat/sessions/" + sess.id, { method: "DELETE" });
  return true;
});

console.log("\n" + passed + "/" + total + " checks passed");
if (passed < total) process.exit(1);
