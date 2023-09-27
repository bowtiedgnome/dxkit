import { env, join } from "../deps.ts";
import { homeDataDir, homeConfigDir, etcDir, IS_WINDOWS } from "../os/mod.ts";

export let configDir = etcDir();
if (IS_WINDOWS) {
    configDir = join(configDir, "aft", "etc")
} else {
    configDir = join(configDir, "aft")
}

export const paths = {
    userConfigDir: env.getOrDefault("AFT_CONFIG_DIR", join(homeConfigDir(), "aft")),
    userDataDir: env.getOrDefault("AFT_DATA_DIR", join(homeDataDir(), "aft")),
    configDir: configDir,
}