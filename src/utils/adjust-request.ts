import {
	type BodyType,
	modifyBodyWithStringValue,
	removeFieldsFromBody,
} from "../utils/api-utils";
import type { pickModelChannel } from "./pick-model";

/**
 * Remove frequency_penalty from body for Gemini models
 */
function removeFrequencyPenalty(
	bodyObject: BodyType,
	channel: NonNullable<ReturnType<typeof pickModelChannel>>,
) {
	if (!channel.provider.model.includes("gemini")) {
		return bodyObject;
	}

	return removeFieldsFromBody(bodyObject, ["frequency_penalty"]);
}

export function adjustCompletionRequestBody(
	bodyObject: BodyType,
	channel: NonNullable<ReturnType<typeof pickModelChannel>>,
) {
	return removeFrequencyPenalty(bodyObject, channel);
}
