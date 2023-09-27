import { paths } from "./paths.ts";
import { exec, exists, makeDirectory, readTextFile } from "https://deno.land/x/quasar@0.0.4/mod.ts";
import { load } from "./config.ts";
import { dirname, join } from "../deps.ts";

export async function setupLocalCerts() {
    
    const cert = join(paths.userDataDir, "etc", "certs", "aft.pem");
    const key = join(paths.userDataDir, "etc", "certs", "aft.key.pem");
    const chained = join(paths.userDataDir, "etc", "certs", "aft.chained.pem");
    if (await exists(chained)) 
    {
        return { cert, chained }
    }

    const parent = dirname(cert);
    if (! await exists(parent)) {
        makeDirectory(parent, { recursive: true });
    }

    const settings = await load();
    const rootResult = await exec("mkcert", ["-CAROOT"], {
        stdout: "piped",
        stderr: "piped"
    });

    const dir = rootResult.throwOrContinue().stdoutAsLines[0];
    const rootCert = join(dir, "rootCA.pem");
    if (! await exists(rootCert)) {
        const r = await exec("mkcert", ["-install"]);
        r.throwOrContinue();
    }

    await exec("mkcert", ["-cert-file", cert, "-key-file", key, ...settings.mkcert]);

    let chainedContents = await readTextFile(cert);
    chainedContents += await readTextFile(rootCert);
    await Deno.writeTextFile(chained, chainedContents);
}