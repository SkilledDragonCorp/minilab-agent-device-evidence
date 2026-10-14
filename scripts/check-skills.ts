#!/usr/bin/env bun
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function parseFrontmatter(text: string): Record<string, string> | null {
  if (!text.startsWith("---\n") && !text.startsWith("---\r\n")) return null;
  const end = text.indexOf("\n---\n", 4);
  const endAlt = text.indexOf("\n---\r\n", 4);
  const endIdx = end === -1 ? endAlt : end;
  if (endIdx === -1) return null;
  const block = text.slice(text.startsWith("---\r\n") ? 5 : 4, endIdx);
  const out: Record<string, string> = {};
  const lines = block.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1]!;
    let value = (m[2] ?? "").trim();
    if (value === ">" || value === "|") {
      const parts: string[] = [];
      i++;
      while (i < lines.length && /^ {2}/.test(lines[i] ?? "")) {
        parts.push((lines[i] ?? "").replace(/^ {2}/, "").trim());
        i++;
      }
      i--;
      value = parts.join(" ").replace(/\s+/g, " ").trim();
    } else if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value) out[key] = value;
  }
  return out;
}

async function main(): Promise<void> {
  const errors: string[] = [];

  if (await exists(join(root, ".cursor", "skills"))) {
    errors.push(".cursor/skills must not exist");
  }
  if (await exists(join(root, ".agents", "skills"))) {
    errors.push(".agents/skills must not exist");
  }

  const skillsRoot = join(root, ".claude", "skills");
  if (!(await exists(skillsRoot))) {
    errors.push(".claude/skills is missing");
  } else {
    const dirs = (await readdir(skillsRoot, { withFileTypes: true })).filter((d) =>
      d.isDirectory(),
    );
    for (const d of dirs) {
      const skillPath = join(skillsRoot, d.name, "SKILL.md");
      if (!(await exists(skillPath))) {
        errors.push(`missing SKILL.md in ${d.name}`);
        continue;
      }
      const text = await readFile(skillPath, "utf8");
      const fm = parseFrontmatter(text);
      if (!fm) {
        errors.push(`${skillPath}: missing YAML frontmatter`);
        continue;
      }
      if (fm.name !== d.name) {
        errors.push(`${skillPath}: name "${fm.name}" != folder "${d.name}"`);
      }
      if (!fm.description || fm.description.trim() === "") {
        errors.push(`${skillPath}: empty description`);
      }
    }
  }

  if (errors.length > 0) {
    for (const e of errors) console.error(e);
    process.exit(1);
  }
  console.log("skills-layout ok");
}

await main();
