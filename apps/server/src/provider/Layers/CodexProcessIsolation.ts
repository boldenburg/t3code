// @effect-diagnostics nodeBuiltinImport:off
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import type { ResolvedSpawnCommand } from "@t3tools/shared/shell";

const GIBIBYTE = 1024 ** 3;
const MAX_MEMORY_BYTES = 8 * GIBIBYTE;
const MIN_MEMORY_BYTES = GIBIBYTE;
const MAX_SWAP_BYTES = 2 * GIBIBYTE;
const TASKS_MAX = 512;
const CGROUP_CONTROLLERS_PATH = "/sys/fs/cgroup/cgroup.controllers";

export interface CodexProcessIsolationLimits {
  readonly memoryHighBytes: number;
  readonly memoryMaxBytes: number;
  readonly memorySwapMaxBytes: number;
  readonly tasksMax: number;
}

export type CodexProcessIsolationSupport =
  | {
      readonly enabled: true;
      readonly systemdRunPath: string;
      readonly limits: CodexProcessIsolationLimits;
    }
  | {
      readonly enabled: false;
      readonly reason:
        | "unsupported-platform"
        | "systemd-run-not-found"
        | "systemd-user-manager-unavailable"
        | "cgroup-v2-controllers-unavailable";
    };

interface DetectCodexProcessIsolationOptions {
  readonly platform: NodeJS.Platform;
  readonly environment: NodeJS.ProcessEnv;
  readonly systemdRunPath: string | undefined;
  readonly totalMemoryBytes?: number;
}

export function computeCodexProcessIsolationLimits(
  totalMemoryBytes: number,
): CodexProcessIsolationLimits {
  // ponytail: keep limits host-relative and configuration-free until real workloads need tuning.
  const memoryMaxBytes = Math.max(
    MIN_MEMORY_BYTES,
    Math.min(MAX_MEMORY_BYTES, Math.floor(totalMemoryBytes / 2)),
  );

  return {
    memoryHighBytes: Math.floor(memoryMaxBytes * 0.75),
    memoryMaxBytes,
    memorySwapMaxBytes: Math.min(MAX_SWAP_BYTES, Math.floor(totalMemoryBytes / 8)),
    tasksMax: TASKS_MAX,
  };
}

function systemdUserRuntimeDirectory(environment: NodeJS.ProcessEnv): string | undefined {
  const configuredRuntimeDirectory = environment.XDG_RUNTIME_DIR?.trim();
  if (configuredRuntimeDirectory) return configuredRuntimeDirectory;
  return typeof process.getuid === "function" ? `/run/user/${process.getuid()}` : undefined;
}

function hasSystemdUserManager(environment: NodeJS.ProcessEnv): boolean {
  const runtimeDirectory = systemdUserRuntimeDirectory(environment);
  return (
    runtimeDirectory !== undefined &&
    NodeFS.existsSync(NodePath.join(runtimeDirectory, "systemd", "private"))
  );
}

function hasRequiredCgroupV2Controllers(): boolean {
  try {
    const controllers = new Set(
      NodeFS.readFileSync(CGROUP_CONTROLLERS_PATH, "utf8").trim().split(/\s+/),
    );
    return controllers.has("memory") && controllers.has("pids");
  } catch {
    return false;
  }
}

export function detectCodexProcessIsolation(
  options: DetectCodexProcessIsolationOptions,
): CodexProcessIsolationSupport {
  if (options.platform !== "linux") {
    return { enabled: false, reason: "unsupported-platform" };
  }
  if (!options.systemdRunPath) {
    return { enabled: false, reason: "systemd-run-not-found" };
  }
  if (!hasSystemdUserManager(options.environment)) {
    return { enabled: false, reason: "systemd-user-manager-unavailable" };
  }
  if (!hasRequiredCgroupV2Controllers()) {
    return { enabled: false, reason: "cgroup-v2-controllers-unavailable" };
  }

  return {
    enabled: true,
    systemdRunPath: options.systemdRunPath,
    limits: computeCodexProcessIsolationLimits(options.totalMemoryBytes ?? NodeOS.totalmem()),
  };
}

export function isolateCodexProcess(
  command: ResolvedSpawnCommand,
  support: Extract<CodexProcessIsolationSupport, { readonly enabled: true }>,
): ResolvedSpawnCommand {
  const { limits } = support;
  return {
    command: support.systemdRunPath,
    args: [
      "--user",
      "--scope",
      "--quiet",
      "--collect",
      `--property=MemoryHigh=${limits.memoryHighBytes}`,
      `--property=MemoryMax=${limits.memoryMaxBytes}`,
      `--property=MemorySwapMax=${limits.memorySwapMaxBytes}`,
      `--property=TasksMax=${limits.tasksMax}`,
      "--property=OOMPolicy=kill",
      "--property=KillMode=control-group",
      "--",
      command.command,
      ...command.args,
    ],
    shell: false,
  };
}
