import { IHostWriter } from "https://deno.land/x/quasar@0.0.3/fmt/host_writer.ts";
import { HostWriter, blue, cyan, env, gray, magenta, red, sprintf, yellow } from "../deps.ts";
import { isGithub, isTfBuild } from "./constants.ts";

function handleStack(stack?: string) {
    stack = stack ?? "";
    const index = stack.indexOf("\n");
    if (index === -1) {
        return stack;
    }

    return stack.substring(index + 1);
}

export function handleArguments(args : IArguments) {
    let msg : string | undefined = undefined;
    let stack: string | undefined = undefined;
    
    switch (args.length) {
        case 0:
            return { msg, stack };
        case 1: 
            {
                if (arguments[0] instanceof Error) {
                    const e = arguments[0] as Error;
                    msg = e.message;
                    stack = handleStack(e.stack);
                } else {
                    msg = arguments[0] as string;
                }
            }
        break;

        case 2: 
            {
                if (arguments[0] instanceof Error) {
                    const e = arguments[0] as Error;
                    const message = arguments[1] as string;
                    msg = message;
                    stack = handleStack(e.stack);
                } else {
                    const message = arguments[0] as string;
                    const args = Array.from(arguments).slice(1);
                    msg = sprintf(message, ...args);
                }
            }
            break;

        default: {
            if (arguments[0] instanceof Error) {
                const e = arguments[0] as Error;
                const message = arguments[1] as string;
                const args = Array.from(arguments).slice(2);
                msg = sprintf(message, ...args);
                stack = handleStack(e.stack);
            } else {
                const message = arguments[0] as string;
                const args = Array.from(arguments).slice(1);
                msg = sprintf(message, ...args);
            }
        }

        break;
    }
    
    return { msg, stack };
}

export class CIHostWriter extends HostWriter {
    constructor() {
        super();
    }

    startGroup(name: string): IHostWriter {
        
        if (isTfBuild) {
            this.writeLine(`##[group]${name}`);
        } else if(isGithub) {
            this.writeLine(`::group::${name}`);
        } else {
            if (this.supportsColor.stdout.level) {
                this.writeLine(magenta(`> ${name}`));
            } else {
                this.writeLine(`> ${name}`);
            }    
        }

        return this;
    }

    endGroup(): IHostWriter {
        if (isTfBuild) {
            this.writeLine(`##[endgroup]`);
        } else if (isGithub) {
            this.writeLine(`::endgroup::`);
        } else {
            this.writeLine();
        }

        return this;
    }

    exportVariable(name: string,value: string,secret?: boolean): IHostWriter {
        env.set(name, value);
        if (isTfBuild) {
            if (secret) {
                this.writeLine(`##vso[task.setvariable variable=${name};issecret=true]${value}`)
                return this;
            }
            this.writeLine(`##vso[task.setvariable variable=${name}]${value}`)
            return this;
        }

        if (isGithub) {
            if (secret) {
                this.writeLine(`::add-mask::${value}`);
            }
            const file = env.get("GITHUB_ENV");
            if (file)
                Deno.writeTextFileSync(file, `${name}=${value}\n`, { append: true });
            return this;
        }

        return this;
    }

    warn(e: Error, message?: string | undefined, ...args: unknown[]): IHostWriter;
    warn(message: string, ...args: unknown[]): IHostWriter;
    warn(): IHostWriter {
        const  { msg, stack } = handleArguments(arguments);
        if (!msg) {
            return this;
        }
        if (isTfBuild) {
            this.writeLine(`##[warning]${msg}`);
            if (stack) {
                this.writeLine(`##[warning]${stack}`);
            }

            return this;
        } else if (isGithub) {
            this.writeLine(`::warning::${msg}`);
            if (stack) {
                this.writeLine(`::warning::${stack}`);
            }

            return this;
        } else {
            const fmt = `WRN: ${msg}`;

            if (this.supportsColor.stdout.level) {
                this.writeLine(yellow(fmt));
                if (stack) {
                    this.writeLine(yellow(stack));
                }
                return this;
            }

            this.writeLine(fmt);
            if (stack) {
                this.writeLine(stack);
            }

            return this;
        }
    }

    info(message: string,...args: unknown[]): IHostWriter {
        if (args.length > 0) {
            message = sprintf(message, ...args);
        }

        if (isGithub) {
            this.writeLine(`::notice::${message}`);
            return this;
        } else {
            const fmt = `INF: ${message}`;

            if (this.supportsColor.stdout.level) {
                this.writeLine(blue(fmt));
                return this;
            }

            this.writeLine(fmt);
            return this;
        }
    }

    debug(message: string, ...args: unknown[]): IHostWriter {
        if (args.length > 0) {
            message = sprintf(message, ...args);
        }

        if (isTfBuild) {
            this.writeLine(`##[debug]${message}`);
            return this;
        } else if(isGithub) {
            this.writeLine(`::debug::${message}`);
            return this;
        } else {
            const fmt = `DBG: ${message}`;

            if (this.supportsColor.stdout.level) {
                this.writeLine(gray(fmt));
                return this;
            }

            this.writeLine(fmt);
            return this;
        }
    }

    error(e: Error,message?: string|undefined,...args: unknown[]): IHostWriter;
    error(message: string,...args: unknown[]): IHostWriter;
    error(): IHostWriter {
        const  { msg, stack } = handleArguments(arguments);
        if (!msg) {
            return this;
        }
        if (isTfBuild) {
            this.writeLine(`##[error]${msg}`);
            if (stack) {
                this.writeLine(`##[error]${stack}`);
            }

            return this;
        } else if (isGithub) {
            this.writeLine(`::error::${msg}`);
            if (stack) {
                this.writeLine(`::error::${stack}`);
            }

            return this;
        } else {
            const fmt = `ERR: ${msg}`;

            if (this.supportsColor.stdout.level) {
                this.writeLine(red(fmt));
                if (stack) {
                    this.writeLine(red(stack));
                }
                return this;
            }

            this.writeLine(fmt);
            if (stack) {
                this.writeLine(stack);
            }

            return this;
        }
    }

    command(message: string, args?: unknown[]): IHostWriter {
        if (isTfBuild) {
            this.writeLine(`##[command]${message} ${args?.join(" ")}`);
            return this;
        } else {
            const fmt = `$ ${message} ${args?.join(" ")}`;

            if (this.supportsColor.stdout.level) {
                this.writeLine(cyan(fmt));
                return this;
            }

            this.writeLine(fmt);
            return this;
        }
    }
}

export const host = new CIHostWriter();