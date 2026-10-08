#!/usr/bin/env node
import { readFile, mkdir, open, rename, rm, stat } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { runFigmaImportPipeline } from "./FigmaImportPipeline";

const projectRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
function usage(): void {
    console.log("Usage: npm run import-level -- <level-folder|path/to/level.json> [--id level-id] [--overwrite]");
}
function parseArgs(args: string[]): { input: string; id: string; overwrite: boolean } {
    if (!args.length || args.includes("--help")) throw new Error("USAGE");
    const values = new Map<string, string>();
    let overwrite = false;
    const positionals: string[] = [];
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === "--overwrite") { overwrite = true; continue; }
        if (arg === "--id") {
            if (!args[i + 1] || args[i + 1].startsWith("--")) throw new Error("Missing value for --id");
            values.set(arg, args[++i]); continue;
        }
        if (arg.startsWith("--")) throw new Error(`Unknown option ${arg}`);
        positionals.push(arg);
    }
    if (positionals.length !== 1) throw new Error("Provide exactly one level folder or JSON path.");
    const requested = positionals[0];
    const explicitJson = extname(requested).toLowerCase() === ".json";
    const folder = explicitJson ? dirname(resolve(projectRoot, requested)) : resolve(projectRoot, "figma-exports", requested);
    const input = explicitJson ? resolve(projectRoot, requested) : join(folder, "level.json");
    const id = values.get("--id") ?? (explicitJson ? basename(folder) : requested);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error(`Invalid level ID '${id}'. Use lowercase letters, digits, and hyphens.`);
    return { input, id, overwrite };
}
async function main(): Promise<void> {
    let args: ReturnType<typeof parseArgs>;
    try { args = parseArgs(process.argv.slice(2)); }
    catch (error) {
        usage();
        if (error instanceof Error && error.message === "USAGE") { process.exitCode = process.argv.includes("--help") ? 0 : 2; return; }
        throw error;
    }
    const svgPath = join(dirname(args.input), "level.svg");
    const [jsonText, svg] = await Promise.all([readFile(args.input, "utf8"), readFile(svgPath, "utf8")]);
    let json: unknown;
    try { json = JSON.parse(jsonText) as unknown; }
    catch (error) { throw new Error(`Invalid JSON in ${args.input}: ${String(error)}`); }
    const result = runFigmaImportPipeline(json, svg, args.id);
    for (const d of result.validation.diagnostics) {
        const log = d.severity === "error" ? console.error : console.warn;
        log(`[${d.severity.toUpperCase()}] ${d.code} ${d.path.join("/")}: ${d.message}`);
    }
    if (!result.validation.valid || !result.generation.level) {
        throw new Error(`Import rejected (${result.matchedCount}/${result.generation.objectCount} SVG matches). No level file changed.`);
    }
    const output = join(projectRoot, "src", "core", "game", "levels", `${args.id}.json`);
    await mkdir(dirname(output), { recursive: true });
    if (!args.overwrite) {
        try { await stat(output); throw new Error(`Level already exists: ${output}. Pass --overwrite to replace it.`); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    }
    const temp = join(dirname(output), `.${args.id}.${randomUUID()}.tmp`);
    try {
        const handle = await open(temp, "wx");
        try { await handle.writeFile(`${JSON.stringify(result.generation.level, null, 2)}\n`, "utf8"); }
        finally { await handle.close(); }
        // Rename replaces the destination only after all conversion and validation succeeded.
        // On POSIX, rename is atomic; on Windows, replacement may be platform-dependent.
        if (!args.overwrite) {
            // Hard-link creation is exclusive, so another import cannot overwrite a level
            // between the existence check and the commit. Fall back to exclusive open
            // only if link is unavailable on the filesystem.
            const { link } = await import("node:fs/promises");
            await link(temp, output);
        } else {
            await rename(temp, output);
        }
    } finally { await rm(temp, { force: true }); }
    console.log(`Imported ${result.matchedCount} SVG-matched objects to ${output}`);
}
main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
