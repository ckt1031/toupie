import { apiConfigSchema } from "../src/schema";
import apiConfig from "../data/api.json";
import type { APIConfig } from "../src/schema";

const config = apiConfig as APIConfig;

apiConfigSchema.strict().parse(config);