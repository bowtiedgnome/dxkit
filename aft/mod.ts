import * as yaml from "https://deno.land/std@0.200.0/yaml/mod.ts";
import { deepMerge } from "https://deno.land/std@0.200.0/collections/deep_merge.ts";
import { env, join } from "../deps.ts";
import { IS_DARWIN, OS_RELEASE, IS_WINDOWS, OS_FAMILY  } from "../os/mod.ts";
import { handlebars, registerDefault } from '../stack/handlebars/mod.ts';
import { exists, makeDirectory, readTextFile, writeTextFile, copy, } from "https://deno.land/x/quasar@0.0.3/fs/fs.ts";
import { paths } from "./paths.ts";
import { getDefaultSecretStore, ISecretStore, loadSecrets } from "./secrets.ts";
import { load } from "./config.ts";

export interface IAftConfig {
    secrets: ISecretStore;
    dataDir: string;
    valueFiles?: string[];
}

async function normalizeConfig(config?: Partial<IAftConfig>) {
    const store = await getDefaultSecretStore() as ISecretStore;
    console.log(store);
    const o : IAftConfig = {
        dataDir: paths.userDataDir,
        secrets: store,
        valueFiles: [],
    };

    if (config) {
        Object.assign(o, config);
    }

    return o
}



export async function stage(dir: string, config?: Partial<IAftConfig>) {
    const composeFile = join(dir, "compose.yaml.hbs");
    const secretsFile = join(dir, "secrets.yaml");
    const valuesFile = join(dir, "values.yaml");
    const aftFile = join(dir, "aft.yaml");
    const aft = yaml.parse(await readTextFile(aftFile)) as Record<string, unknown>;
    const name = aft.name as string;
    const service : string = aft.service as string ?? name;
    const o = await normalizeConfig(config);

    const settings = await load();

    let locals : Record<string, unknown> = {
        ...settings.defaults,
        name: name,
        service: service,
        image: aft.image,
        os: {
            family: OS_FAMILY,
            release: OS_RELEASE,
            windows: IS_WINDOWS,
            darwin: IS_DARWIN
        },
        volumes: {
            run: `${o.dataDir}/run/${service}`,
            etc: `${o.dataDir}/etc/${service}`,
            certs: `${o.dataDir}/etc/certs`,
            data: `${o.dataDir}/data/${service}`,
            log: `${o.dataDir}/var/log/${service}`,
            cache: `${o.dataDir}/var/cache/${service}`,
        }
    }

    const values = mergeValues([valuesFile, ...o.valueFiles ?? []]);
    locals = deepMerge(locals, values);

    console.log(locals)

    const composeFolder = join(o.dataDir, "etc", "compose", service);

    if (! await exists(composeFolder)) {
        await makeDirectory(composeFolder, { recursive: true });
    }

    if (await exists(secretsFile)) {
        const secrets = await loadSecrets(secretsFile, o.secrets as ISecretStore);
        writeTextFile(join(composeFolder, ".env"), secrets);
    }

    env.set("AFT_DIR,", o.dataDir);
    const hbs = handlebars.create();
    registerDefault(hbs);
    const tplContent = await readTextFile(composeFile);
    const tpl = hbs.compile(tplContent);
    const composeContent = tpl(locals);
    await writeTextFile(join(composeFolder, "compose.yaml"), composeContent);

    if(locals.volumes) {
        const volumes = locals.volumes as Record<string, unknown>;
        for(const key in volumes) {
            let value = volumes[key] as string;
            value = env.expand(value);
            volumes[key] = value;

            if (!value || value.length === 0)
                continue;

            const childDir = join(dir, key);
            if (await exists(childDir)) {
                await walk(childDir, value, handlebars, locals)   
            }
        }
    }
}

async function walk(src: string, dest: string, hb: typeof handlebars, locals: Record<string, unknown>) {
    for await (const entry of Deno.readDir(src)) {
        const path = join(src, entry.name);
        if (entry.isDirectory) {
            await walk(path, join(dest, entry.name), hb, locals);
        } else {
            if (!await exists(dest)) {
                await makeDirectory(dest, { recursive: true });
            }

            let destPath = join(dest, entry.name);
            if (path.endsWith(".hbs")) { 
                destPath = destPath.substring(0, destPath.length - 4);
                if (await exists(destPath)) {
                    continue;
                }

                const tplContent = await readTextFile(path);
                const tpl = hb.compile(tplContent);
                const content = tpl(locals);
                
                await writeTextFile(destPath, content);
                continue;
            }

            if (await exists(destPath)) {
                continue;
            }

            await copy(path, destPath, { overwrite: true });
        }
    }
}

function mergeValues(valueFiles: string[]) {
    let values : Record<string, unknown> = {};
    for(let i = 0; i < valueFiles.length; i++) {
        const file = valueFiles[i];
        const data = yaml.parse(Deno.readTextFileSync(file)) as Record<string, unknown>;
        values = deepMerge(values, data);
    }

    return values;
}