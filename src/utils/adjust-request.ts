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
	let newBodyObject = bodyObject;

	if (channel.provider.model.includes("gemini")) {
		newBodyObject = removeFieldsFromBody(newBodyObject, ["frequency_penalty"]);
	}

	return newBodyObject;
}

/**
 * Only for reasoning models with thinking configuration like OpenAI o[x] models and Google's Gemini 2.5+
 */
function applyReasonignEffort(
	bodyObject: BodyType,
	channel: NonNullable<ReturnType<typeof pickModelChannel>>,
) {
	let newBodyObject = bodyObject;

	// Set reasoning_effort to none if it's not set
	if (
		typeof bodyObject === "object" &&
		!("reasoning_effort" in bodyObject) &&
		channel.provider.reasoning
	) {
		newBodyObject = modifyBodyWithStringValue(
			bodyObject,
			"reasoning_effort",
			"none",
		);
	}

	return newBodyObject;
}

/**
 * Remove thinkingConfig from body and set reasoning_effort to none if it's not set for Gemini models with "thinkingConfig" field
 * This is a temporary solution to solve some clients with mistaken comaptibility layer between OpenAI and Gemini.
 * Will be removed soon.
 */
function applyThinkingConfig(
	bodyObject: BodyType,
	channel: NonNullable<ReturnType<typeof pickModelChannel>>,
) {
	let newBodyObject = bodyObject;

	// For gemini models with "thinkingConfig" field, transform it to "reasoning_effort"
	if (
		typeof newBodyObject === "object" &&
		"thinkingConfig" in newBodyObject &&
		newBodyObject.thinkingConfig &&
		channel.provider.reasoning
	) {
		interface ThinkingConfig {
			includeThoughts: boolean;
			thinkingBudget: number;
		}

		// Gemini compatible layer
		const thinkingConfig =
			newBodyObject.thinkingConfig as unknown as ThinkingConfig;

		if (thinkingConfig.includeThoughts) {
			// reasoning_effort: none (=0), high (>10000), medium (>5000), low (>0)
			let reasoningEffort = "none";

			if (thinkingConfig.thinkingBudget > 10000) {
				reasoningEffort = "high";
			} else if (thinkingConfig.thinkingBudget > 5000) {
				reasoningEffort = "medium";
			} else if (thinkingConfig.thinkingBudget > 0) {
				reasoningEffort = "low";
			}

			newBodyObject = modifyBodyWithStringValue(
				newBodyObject,
				"reasoning_effort",
				reasoningEffort,
			);
		}

		// Remove thinkingConfig from body
		newBodyObject = removeFieldsFromBody(newBodyObject, ["thinkingConfig"]);
	}

	return newBodyObject;
}

export function adjustCompletionRequestBody(
	bodyObject: BodyType,
	channel: NonNullable<ReturnType<typeof pickModelChannel>>,
) {
	let newBodyObject = bodyObject;

	newBodyObject = removeFrequencyPenalty(newBodyObject, channel);
	newBodyObject = applyReasonignEffort(newBodyObject, channel);
	newBodyObject = applyThinkingConfig(newBodyObject, channel);

	return newBodyObject;
}
