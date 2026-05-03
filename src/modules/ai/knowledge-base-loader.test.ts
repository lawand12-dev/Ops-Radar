import { afterEach, describe, expect, it } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildKnowledgeBasePromptBlock,
  buildKnowledgeBaseSelectionLogMeta,
  clearKnowledgeBaseCacheForTests,
  loadKnowledgeBaseResources,
  selectKnowledgeForRequest
} from "./knowledge-base-loader";

function createTempKnowledgeBaseRoot(testName: string): string {
  const root = resolve(
    process.cwd(),
    "tmp-kb-tests",
    `${testName}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  );
  mkdirSync(root, { recursive: true });
  return root;
}

function writeFile(root: string, relativePath: string, content: string | Buffer): void {
  const target = resolve(root, relativePath);
  const dir = resolve(target, "..");
  mkdirSync(dir, { recursive: true });
  writeFileSync(target, content);
}

function baseConfig(baseDir: string) {
  return {
    enabled: true,
    baseDir,
    maxChars: 20_000,
    fileMaxChars: 6_000,
    topK: 8
  };
}

const cleanupDirs: string[] = [];

afterEach(() => {
  clearKnowledgeBaseCacheForTests();
  for (const dir of cleanupDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("knowledge-base loader", () => {
  it("loads CLAUDE.md and index.md from root", () => {
    const root = createTempKnowledgeBaseRoot("core");
    cleanupDirs.push(root);
    writeFile(root, "CLAUDE.md", "# Core Rules\nAlways output JSON.");
    writeFile(root, "index.md", "# Index\nRouting hints.");

    const resources = loadKnowledgeBaseResources({ config: baseConfig(root) });
    const loadedPaths = resources.map((item) => item.path);

    expect(loadedPaths.some((path) => path.endsWith("/CLAUDE.md") || path.endsWith("\\CLAUDE.md"))).toBe(true);
    expect(loadedPaths.some((path) => path.endsWith("/index.md") || path.endsWith("\\index.md"))).toBe(true);
  });

  it("recursively loads subfolders and ignores .gitkeep/binary files", () => {
    const root = createTempKnowledgeBaseRoot("recursive");
    cleanupDirs.push(root);
    writeFile(root, "CLAUDE.md", "# Core");
    writeFile(root, "index.md", "# Index");
    writeFile(root, "patterns/workflow-example.md", "# Workflow Pattern\nUseful steps.");
    writeFile(root, "tools/n8n-node-gmail.md", "# Gmail Node\nHow to configure.");
    writeFile(root, "patterns/.gitkeep", "");
    writeFile(root, "tools/binary.md", Buffer.from([0x00, 0x01, 0x02, 0x03]));

    const resources = loadKnowledgeBaseResources({ config: baseConfig(root) });
    const paths = resources.map((item) => item.path);

    expect(paths.some((path) => path.includes("workflow-example.md"))).toBe(true);
    expect(paths.some((path) => path.includes("n8n-node-gmail.md"))).toBe(true);
    expect(paths.some((path) => path.endsWith(".gitkeep"))).toBe(false);
    expect(paths.some((path) => path.includes("binary.md"))).toBe(false);
  });

  it("selects relevant files for user query and keeps core files first", () => {
    const root = createTempKnowledgeBaseRoot("select");
    cleanupDirs.push(root);
    writeFile(root, "CLAUDE.md", "# Core\nReturn JSON only.");
    writeFile(root, "index.md", "# Index\nUse routing hints.");
    writeFile(root, "tools/n8n-node-gmail.md", "# Gmail\nGmail node setup.");
    writeFile(root, "tools/n8n-node-telegram.md", "# Telegram\nTelegram node setup.");
    writeFile(root, "patterns/workflow-lead-routing.md", "# Lead Routing\nAutomation design.");
    writeFile(root, "failures/oauth-refresh-failures.md", "# OAuth Failure\nCredential refresh issues.");

    const selection = selectKnowledgeForRequest(
      "Build workflow that sends from Gmail to Telegram and routes leads",
      { config: { ...baseConfig(root), topK: 3 } }
    );

    const selectedPaths = selection.selected.map((item) => item.path.toLowerCase());
    expect((selectedPaths.at(0) ?? "").includes("claude.md")).toBe(true);
    expect((selectedPaths.at(1) ?? "").includes("index.md")).toBe(true);
    expect(selectedPaths.some((path) => path.includes("gmail"))).toBe(true);
    expect(selectedPaths.some((path) => path.includes("telegram"))).toBe(true);
  });

  it("respects max chars budget", () => {
    const root = createTempKnowledgeBaseRoot("budget");
    cleanupDirs.push(root);
    writeFile(root, "CLAUDE.md", `# Core\n${"A".repeat(6000)}`);
    writeFile(root, "index.md", `# Index\n${"B".repeat(6000)}`);
    writeFile(root, "patterns/long.md", `# Long\n${"C".repeat(6000)}`);

    const selection = selectKnowledgeForRequest("build automation", {
      config: { ...baseConfig(root), maxChars: 500, fileMaxChars: 1000, topK: 2 }
    });

    expect(selection.total_chars).toBeLessThanOrEqual(500);
    expect(selection.selected.length).toBeGreaterThan(0);
  });

  it("builds prompt block and does not expose content in safe log metadata", () => {
    const root = createTempKnowledgeBaseRoot("logging");
    cleanupDirs.push(root);
    writeFile(root, "CLAUDE.md", "# Core\nSECRET_SENTENCE_SHOULD_NOT_APPEAR_IN_LOG_META");
    writeFile(root, "index.md", "# Index");

    const selection = selectKnowledgeForRequest("create automation", { config: baseConfig(root) });
    const promptBlock = buildKnowledgeBasePromptBlock(selection);
    const logMeta = buildKnowledgeBaseSelectionLogMeta(selection);
    const serializedMeta = JSON.stringify(logMeta);

    expect(promptBlock.includes("<OPS_RADAR_KNOWLEDGE_BASE>")).toBe(true);
    expect(promptBlock.includes("[FILE:")).toBe(true);
    expect(serializedMeta.includes("SECRET_SENTENCE_SHOULD_NOT_APPEAR_IN_LOG_META")).toBe(false);
    expect("selected_paths" in logMeta).toBe(true);
  });

  it("works when knowledge-base directory is missing", () => {
    const missingDir = resolve(process.cwd(), "tmp-kb-tests", "missing-folder");
    rmSync(missingDir, { recursive: true, force: true });

    const resources = loadKnowledgeBaseResources({
      config: { ...baseConfig(missingDir), enabled: true }
    });
    const selection = selectKnowledgeForRequest("build automation", {
      config: { ...baseConfig(missingDir), enabled: true }
    });

    expect(resources).toHaveLength(0);
    expect(selection.selected).toHaveLength(0);
    expect(selection.total_chars).toBe(0);
  });
});
