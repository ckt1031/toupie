import worker from "../src/index";

export default worker.fetch;

export const config = {
	runtime: "edge",
	regions: [
		// Stockholm, Sweden
		"arn1",
		// Mumbai, India
		"bom1",
		// Paris, France
		"cdg1",
		// Cleveland, USA
		"cle1",
		// Cape Town, South Africa
		"cpt1",
		// Dublin, Ireland
		"dub1",
		// Frankfurt, Germany
		"fra1",
		// Tokyo, Japan
		"hnd1",
		// Washington, D.C., USA
		"iad1",
		// Seoul, South Korea
		"icn1",
		// Osaka, Japan
		"kix1",
		// Portland, USA
		"pdx1",
		// San Francisco, USA
		"sfo1",
		// Singapore
		"sin1",
		// Sydney, Australia
		"syd1",
	],
};
