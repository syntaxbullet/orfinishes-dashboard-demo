#!/usr/bin/env bun
import { existsSync } from "fs";
import { rm } from "fs/promises";
import path from "path";

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  
  process.exit(0);
}

const toCamelCase = (str: string): string => str.replace(/-([a-z])/g, g => g[1]!.toUpperCase());

const parseValue = (value: string): unknown => {
  if (value === "true") { return true; }
  if (value === "false") { return false; }

  if (/^\d+$/.test(value)) { return parseInt(value, 10); }
  if (/^\d*\.\d+$/.test(value)) { return parseFloat(value); }

  if (value.includes(",")) { return value.split(",").map(v => v.trim()); }

  return value; 
}

type CliConfig = Partial<Bun.BuildConfig> & Record<string, unknown>;

const ensureNestedObject = (target: CliConfig, key: string): Record<string, unknown> => {
  const existing = target[key];

  if (typeof existing === "object" && existing !== null && !Array.isArray(existing)) {
    return existing as Record<string, unknown>;
  }

  const next: Record<string, unknown> = {};
  target[key] = next;
  return next;
};

function parseArgs(): CliConfig {
  const config: CliConfig = {};
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) { continue; }
    if (!arg.startsWith("--")) { continue; }

    if (arg.startsWith("--no-")) {
      const key = toCamelCase(arg.slice(5));
      config[key] = false;
      continue;
    }

    if (!arg.includes("=") && (i === args.length - 1 || args[i + 1]?.startsWith("--"))) {
      const key = toCamelCase(arg.slice(2));
      config[key] = true;
      continue;
    }

    let key: string;
    let value: string;

    if (arg.includes("=")) {
      [key, value] = arg.slice(2).split("=", 2) as [string, string];
    } else {
      key = arg.slice(2);
      value = args[++i] ?? "";
    }

    key = toCamelCase(key);

    if (key.includes(".")) {
      const [parentKey, childKey] = key.split(".", 2);
      if (!childKey) {
        config[parentKey!] = parseValue(value);
        continue;
      }

      const parent = ensureNestedObject(config, parentKey!);
      parent[childKey] = parseValue(value);
    } else {
      config[key] = parseValue(value);
    }
  }

  return config;
}




const cliConfig = parseArgs();
const outdir = cliConfig.outdir || path.join(process.cwd(), "dist");

if (existsSync(outdir)) {
  
  await rm(outdir, { recursive: true, force: true });
}










