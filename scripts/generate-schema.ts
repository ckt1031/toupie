import { apiConfigSchema } from "../src/schema";
import * as z from "zod";
import fs from "fs";

const schema = z.toJSONSchema(apiConfigSchema, { target: "draft-7" });

fs.writeFileSync("./data/schema.json", JSON.stringify(schema, null, 2));