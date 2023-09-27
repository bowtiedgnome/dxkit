import { env } from "../deps.ts";

export const isGenericCI = env.getOrDefault("CI", "false") === "true";
export const isTfBuild = env.getOrDefault("TF_BUILD", "false") === "true";
export const isGithub = env.getOrDefault("GITHUB_ACTIONS", "false") === "true";
export const isGitlab = env.getOrDefault("GITLAB_CI", "false") === "true";
export const isJenkins = env.getOrDefault("JENKINS_URL", "") !== "";
export const isCi = isGenericCI || isTfBuild || isGithub || isGitlab || isJenkins;