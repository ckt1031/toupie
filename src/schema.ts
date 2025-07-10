import { z } from "zod";

export const apiConfigSchema = z.object({
	/**
	 * Keys received from this project API server
	 */
	userKeys: z.array(z.object({ name: z.string(), key: z.string() })),
	providers: z.record(
		z.string(),
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
					}),
				]),
			),
			/**
			 * API Keys SENT to the providiers
			 */
			keys: z.array(z.string()),
			/**
			 * Is Microsoft Azure API
			 */
			azure: z.boolean().optional(),
			/**
			 * This is required if API is Azure mode
			 */
			azureAPIVersion: z.string().optional(),
		}),
	),
});

export type APIConfig = z.infer<typeof apiConfigSchema>;
