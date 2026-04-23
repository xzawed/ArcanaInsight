import { z } from "zod";

export const VARIANT_PROMPT_MAX_LEN = 10_000;

export const DeploymentConfigSchema = z.object({
  deployment_id: z.string().min(1).max(128),
  status: z.union([z.enum(["active", "paused", "draft", "stopped"]), z.string().max(32)]),
  traffic_split: z.number().min(0).max(1),
  variant_prompt: z.string().max(VARIANT_PROMPT_MAX_LEN).nullable(),
});

export const TraceResponseSchema = z.object({
  trace_id: z.string().min(1).max(128),
});

export type DeploymentConfig = z.infer<typeof DeploymentConfigSchema>;
export type TraceResponse = z.infer<typeof TraceResponseSchema>;
