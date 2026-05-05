import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const token = process.env.GITHUB_TOKEN;
if (!token) { console.error("GITHUB_TOKEN not set"); process.exit(1); }

const owner = "waheed11";
const repo  = "ai-agent-design";
const baseDir = "/home/runner/workspace";

async function ghFetch(endpoint, method, body) {
  const res = await fetch(`https://api.github.com${endpoint}`, {
    method,
    headers: {
      Authorization: `token ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

// Step 1: Initialize repo with a README via Contents API (works on empty repos)
console.log("Step 1: Initializing repository with README...");
const readmeContent = Buffer.from(
  "# AI Agent Design — منصة تصميم الوكلاء\n\nBilingual Arabic RTL / English LTR AI agent design platform.\n"
).toString("base64");

const initRes = await ghFetch(`/repos/${owner}/${repo}/contents/README.md`, "PUT", {
  message: "chore: initialize repository",
  content: readmeContent,
});
const initData = await initRes.json();
if (!initData.commit?.sha) {
  console.error("Failed to initialize repo:", JSON.stringify(initData).slice(0, 200));
  process.exit(1);
}
const baseSha = initData.commit.sha;
const baseTreeSha = initData.commit.tree?.sha;
console.log("Initialized. Base commit:", baseSha, "Tree:", baseTreeSha);

// Step 2: Get all tracked files (excluding README.md we just created)
const files = execSync("git ls-files", { cwd: baseDir })
  .toString().trim().split("\n")
  .filter(f =>
    !f.startsWith(".local/") &&
    f !== "pnpm-lock.yaml" &&
    f !== "README.md"
  );
console.log(`Step 2: Creating blobs for ${files.length} files...`);

async function createBlob(filePath) {
  const abs = path.join(baseDir, filePath);
  const buf = fs.readFileSync(abs);
  const res = await ghFetch(`/repos/${owner}/${repo}/git/blobs`, "POST", {
    content: buf.toString("base64"),
    encoding: "base64",
  });
  const data = await res.json();
  if (!data.sha) {
    console.error("Blob error:", filePath, JSON.stringify(data).slice(0, 120));
    return null;
  }
  return { path: filePath, mode: "100644", type: "blob", sha: data.sha };
}

const BATCH = 15;
const treeItems = [];
for (let i = 0; i < files.length; i += BATCH) {
  const batch = files.slice(i, i + BATCH);
  const results = await Promise.all(batch.map(createBlob));
  results.forEach(r => r && treeItems.push(r));
  process.stdout.write(`\r  Uploaded ${Math.min(i + BATCH, files.length)}/${files.length} files...`);
}
console.log(`\nBlobs created: ${treeItems.length}/${files.length}`);

// Step 3: Create tree on top of the base tree
console.log("Step 3: Creating git tree...");
const treeRes = await ghFetch(`/repos/${owner}/${repo}/git/trees`, "POST", {
  base_tree: baseTreeSha,
  tree: treeItems,
});
const tree = await treeRes.json();
if (!tree.sha) { console.error("Tree error:", JSON.stringify(tree)); process.exit(1); }
console.log("Tree SHA:", tree.sha);

// Step 4: Create commit on top of the init commit
console.log("Step 4: Creating commit...");
const commitRes = await ghFetch(`/repos/${owner}/${repo}/git/commits`, "POST", {
  message: "feat: initial project — AI Agent Design platform (منصة تصميم الوكلاء)",
  tree: tree.sha,
  parents: [baseSha],
  author: { name: "Abdulwahid Al-Zaydi", email: "waheed11@users.noreply.github.com" },
});
const commit = await commitRes.json();
if (!commit.sha) { console.error("Commit error:", JSON.stringify(commit)); process.exit(1); }
console.log("Commit SHA:", commit.sha);

// Step 5: Update main branch
console.log("Step 5: Updating main branch...");
const refRes = await ghFetch(`/repos/${owner}/${repo}/git/refs/heads/main`, "PATCH", {
  sha: commit.sha,
  force: true,
});
const refData = await refRes.json();
if (refData.ref) {
  console.log("\nDone! https://github.com/" + owner + "/" + repo);
} else {
  console.error("Ref update error:", JSON.stringify(refData).slice(0, 200));
}
