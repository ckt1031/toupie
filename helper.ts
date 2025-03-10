import { loadApiConfig } from "./src/helpers/api-config";
import { displayMenu } from "./src/helpers/cli-utils";

const initialConfig = await loadApiConfig();
displayMenu(initialConfig);
