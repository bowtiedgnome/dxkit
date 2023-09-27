import { parse } from "https://deno.land/std@0.200.0/yaml/mod.ts";
import {  SecretGenerator, dirname, env, join, secretGenerator } from "../deps.ts";
import { paths } from "./paths.ts";
import { ensureDirectory, exists, readFile, writeFile } from "https://deno.land/x/quasar@0.0.3/fs/mod.ts";
import { host } from "../ci/host_writer.ts";
import { createCredentials, KpDatabase, kdbx } from "../stack/keepass/mod.ts";

async function getOrCreateKey() {
    const envKey = env.get("AFT_KEEPASS_KEY");

    if (envKey) {
        return new TextEncoder().encode(envKey);
    }

    const keyFile = env.get("AFT_KEEPASS_KEYFILE") ?? join(paths.userDataDir, "etc", "key.bin");
    const dir = dirname(keyFile);
    if (!await exists(dir)) {
        await ensureDirectory(dir);
    }

    if (await exists(keyFile)) {
        return await readFile(keyFile)
    }

    const key = secretGenerator.generateAsUint8Array(33);
    await writeFile(keyFile, key);
    host.warn(`Backup your new key file at ${keyFile}}`)
    return key;
}

async function getOrCreateAftKdbx() {
    const dir = env.get("AFT_KEEPASS") || join(paths.userDataDir, "etc");
    if (!await exists(dir)) {
        await ensureDirectory(dir);
    }
    const kdbxFile = join(dir, "aft.kdbx");
    const secret = await getOrCreateKey();
    const credentials = createCredentials(secret);
    if (await exists(kdbxFile))
    {
        return await KpDatabase.open(kdbxFile, credentials)
    }

    return await KpDatabase.create(kdbxFile, credentials)
}

export let secretStore : ISecretStore | undefined = undefined;

export async function getDefaultSecretStore() {
    if (secretStore !== undefined) {
        return secretStore;
    }

    const db = await getOrCreateAftKdbx();
    secretStore = {
        async get(path: string) {
            const entry = await db.findEntry(path, true);
            if (!entry) {
                return "";
            }
            
            const v = entry.fields.get("Password");
            if (v instanceof kdbx.ProtectedValue)
                return v.getText();

            return v as string;
        },
        async set(path: string, value: string) {
            const entry = await db.getEntry(path);
            entry.fields.set("Password", kdbx.ProtectedValue.fromString(value));

            await db.save();
        },
        async remove(_path: string) {
            return await Promise.resolve();
        },
        async list() {
            return await Promise.resolve([]);
        }
    };

    return secretStore;
}

export interface ISecretStore {
    get(path: string): Promise<string | undefined>;
    set(path: string, value: string): Promise<void>;
    remove(name: string): Promise<void>;
    list(): Promise<string[]>;
}

export interface ISecretsSection {
    name: string;
    path: string;
    length?: number;
    create?: boolean;
    digits?: boolean;
    symbols?: boolean;
    uppercase?: boolean;
    lowercase?: boolean;
}


export async function loadSecrets(file: string, store: ISecretStore) {
    const sections = await parse(await Deno.readTextFile(file)) as ISecretsSection[];
    let text = "";
    for(let i = 0; i < sections.length; i++) {
        const s = sections[i];
        let secret = await store.get(s.path);
        if (secret) {
            env.set(s.name, secret);
            if (secret.includes('"'))
                text += `${s.name}='${secret}'\n`;
            else 
                text += `${s.name}="${secret}"\n`;
            continue;
        }

        if (s.create) {
            const sg = new SecretGenerator();
            sg.addDefaults();
            secret = sg.generate(s.length ?? 16);
            await store.set(s.path, secret);

            env.set(s.name, secret);
            if (secret.includes('"'))
                text += `${s.name}='${secret}'\n`;
            else 
                text += `${s.name}="${secret}"\n`;

            continue;
        }
    }

    return text;
}