import { dirname, join } from "../deps.ts";
import { test, assert } from "../dev_deps.ts";
import { fromFileUrl } from "../stack/keepass/deps.ts";
import { stage } from "./mod.ts";
import { setupLocalCerts } from "./certs.ts";

const dir = dirname(fromFileUrl(import.meta.url));
const resources = join(dir, "resources", "traefik");

test("stage", async () => {
    await setupLocalCerts();
    await stage(resources);

    assert.truthy("test");
});
