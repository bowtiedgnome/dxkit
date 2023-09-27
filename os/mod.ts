import { homeDir, IS_WINDOWS } from "https://deno.land/x/quasar@0.0.3/os/mod.ts";
import { join, env } from "../deps.ts";
export * from "https://deno.land/x/quasar@0.0.3/os/mod.ts";

let configDir : string | undefined = undefined;
let dataDir : string | undefined = undefined;
let globalEtcDir : string | undefined = undefined;

export function etcDir() {
    if (globalEtcDir) {
        return globalEtcDir;
    }

    if (IS_WINDOWS) {
        globalEtcDir = join(env.get("ALLUSERSDATA") || "c:/ProgramData");
    } else {
        globalEtcDir = "/etc";
    }

    return globalEtcDir;
}

export function homeConfigDir(ignoreSudo = true, force = false) {
    if (configDir && !force) {
        return configDir;
    }

    const home = homeDir();

    if (IS_WINDOWS) {
        configDir = env.get("APPDATA");
        if (configDir)
            return configDir;

        if (!home)
            throw new Error("Could not find home directory");

        configDir = join(home, "AppData", "Roaming");
        return configDir;
    }

    const sudoUser = env.get("SUDO_USER")
    if (!ignoreSudo && sudoUser) {
        configDir = join("/home", sudoUser, ".config");
    } else {
        configDir = env.get("XDG_CONFIG_HOME");
        if (configDir)
            return configDir;

        if (!home)
            throw new Error("Could not find home directory");

        configDir = join(home, ".config");
    }

    return configDir;
}

export function homeDataDir(ignoreSudo = true, force = false) {
    if (dataDir && !force) {
        return dataDir;
    }

    const home = homeDir();

    if (IS_WINDOWS) {
        dataDir = env.get("LOCALAPPDATA");
        if (dataDir)
            return dataDir;

        if (!home)
            throw new Error("Could not find home directory");

        dataDir = join(home, "AppData", "Local");
        return dataDir;
    }

    const sudoUser = env.get("SUDO_USER")
    if (!ignoreSudo && sudoUser) {
        dataDir = join("/home", sudoUser, ".local", "share");
    } else {
        dataDir = env.get("XDG_DATA_HOME");
        if (dataDir)
            return dataDir;

        if (!home)
            throw new Error("Could not find home directory");

        dataDir = join(home, ".local", "share");
    }

    return dataDir;
}
    