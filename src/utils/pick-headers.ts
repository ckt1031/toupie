const pickHeaders = (
	headers: Record<string, string>,
	keys: (string | RegExp | undefined)[],
): Headers => {
	const picked = new Headers();
	const regexKeys: RegExp[] = [];
	const stringKeys: Set<string> = new Set();

	for (const key of keys) {
		if (!key) continue;

		if (typeof key === "string") {
			stringKeys.add(key);
		} else {
			regexKeys.push(key);
		}
	}

	for (const key of Object.keys(headers)) {
		if (stringKeys.has(key) || regexKeys.some((regex) => regex.test(key))) {
			const value = headers[key];
			if (typeof value === "string") {
				picked.set(key, value);
			}
		}
	}

	return picked;
};

export default pickHeaders;
