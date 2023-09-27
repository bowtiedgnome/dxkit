import { exec } from "https://deno.land/x/quasar@0.0.4/process/mod.ts";
import { load } from "./config.ts";

export async function createNetwork() {
    const hasAftNetwork = await testNetwork();
    if (hasAftNetwork) {
        return;
    }

    const settings = await load();
    const name = settings.network.name

    const r = await exec("docker", [
        "network", 
        "create", 
        "--driver=bridge",
        `--subnet=${settings.network.subnet}`,
        `--gateway=${settings.network.gateway}`,
        name]);

    r.throwOrContinue();
}

export async function testNetwork() {
    const settings = await load();
    const name = settings.defaults.networks.default.name;
    const r = await exec("docker", ["network", "ls", "--filter", `name=${name}`, "--format", "{{.Name}}"], {
        stdout: "piped",
        stderr: "piped"
    });

    r.throwOrContinue();
    const lines = r.stderrAsLines;

    return lines?.length !== 0;
}

export async function removeNetwork() {
    const settings = await load();
    const name = settings.defaults.networks.default.name;
    const r = await exec("docker", [
        "network", 
        "rm", 
        name]);

    r.throwOrContinue();
}