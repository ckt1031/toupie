import worker from "../src/index";

export default worker.fetch;

export const config = {
	runtime: "edge",
	regions: [
		// Some AI providers only allow USA regions.
		"cle1", // Cleveland, USA
		"iad1", // Washington, D.C., USA
		"pdx1", // Portland, USA
		"sfo1", // San Francisco, USA
	],
};
