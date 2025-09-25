#!/usr/bin/env bun

import { apiConfigSchema } from "../src/schema";
import { z } from "zod/mini";
import { writeFileSync } from "node:fs";

/**
 * Generate JSON schema from the API config schema
 */
function generateSchema(): void {
	const schema = z.toJSONSchema(apiConfigSchema, { target: "draft-7" });
	writeFileSync("./data/schema.json", JSON.stringify(schema, null, 2));
	console.log("Schema generated successfully");
}

generateSchema();