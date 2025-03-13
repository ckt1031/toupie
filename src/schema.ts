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
					z.object({ request: z.string(), destination: z.string() }),
				]),
			),
			keys: z.array(z.string()),
			azure: z.boolean().optional(),
			azureAPIVersion: z.string().optional(),
		}),
	),
});

export type APIConfig = z.infer<typeof apiConfigSchema>;
