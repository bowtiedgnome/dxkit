import { join } from "../deps.ts";
import { paths } from "./paths.ts";
import { exists, makeDirectory, readTextFile, writeTextFile,
 } from "https://deno.land/x/quasar@0.0.4/fs/fs.ts";


export interface IAftDnsSection {
    domain: string;
}

export interface IAftDefaultNetwork {
    cidr: [number, number, number, number];
    name: string;
}

export interface IAftDefaultsSection extends Record<string, unknown> {
    dns: IAftDnsSection
    networks: Record<string, IAftDefaultNetwork>;
}

export interface IAftSettings extends Record<string, unknown> {
    defaults: IAftDefaultsSection
    mkcert: string[];
    network: IAftNetwork;
}

export interface IAftNetwork extends Record<string, unknown> {
    name: string;
    subnet: string;
    gateway: string;
}

export async function load() {
    const dir = paths.userConfigDir;
    const file = join(dir, "aft.config");
    if (!await exists(file)) {
        await makeDirectory(paths.userConfigDir, { recursive: true });

        const settings : IAftSettings = {
            defaults: {
                dns: {
                    domain: "aft.bearz.casa"
                },
                tz: "UTC",
                puid: 0,
                guid: 0,
                networks: {
                    default: {
                        cidr: [172, 19, 0, 0],
                        name: "aft",
                    }
                },
            },
            network: {
                name: "aft",
                subnet: "172.19.0.0/20",
                gateway: "172.19.0.1"
            },
            mkcert: [
                "*.aft.bearz.casa",
                "aft.bearz.casa",
                "localhost",
            ]
        };

        const json = JSON.stringify(settings, null, 4);
        await writeTextFile(file, json);

        return settings;
    }

    const json = await readTextFile(file);
    const settings = JSON.parse(json) as IAftSettings;
    return settings;
}

export async function save(settings: IAftSettings) {
    const dir = paths.userConfigDir;
    const file = join(dir, "aft.config");
    const json = JSON.stringify(settings, null, 4);
    await writeTextFile(file, json);
}