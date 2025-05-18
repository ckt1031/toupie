import { z } from "zod";

export const apiConfigSchema = z.object({
	userKeys: z.array(z.object({ name: z.string(), key: z.string() })),
	providers: z.record(
		z.object({
			name: z.string(),
			baseURL: z.string(),
			models: z.array(
				z.union([
					z.string(),
					z.object({
						/**
						 * The model ID to be RECEIVED from the API server (this project)
						 * This is optional, if not provided, the destination will be used for receiving.
						 */
						request: z.optional(z.string()),
						/**
						 * The model ID to be SENT to the provider.
						 */
						destination: z.string(),
						/**
						 * If the model is a reasoning model with thinking configuration,
						 * this field will be true.
						 * For some embedded thinking models with their thinking content in text generation with <think> tags,
						 * like DeepSeek R1, Qwen3/Qwen-QwQ, without thinking configuration, this field will be false.
						 * Otherwise, it will be false.
						 */
						reasoning: z.optional(z.boolean()),
					}),
				]),
			),
			keys: z.array(z.string()),
			azure: z.boolean().optional(),
			azureAPIVersion: z.string().optional(),
		}),
	),
});

export type APIConfig = z.infer<typeof apiConfigSchema>;
