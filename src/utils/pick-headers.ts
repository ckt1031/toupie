const pickHeaders = (headers: Headers, keys: (string | RegExp)[]): Headers => {
	const picked = new Headers();
	const regexKeys: RegExp[] = [];
	const stringKeys: Set<string> = new Set();

	for (const key of keys) {
		if (typeof key === "string") {
			stringKeys.add(key);
		} else {
			regexKeys.push(key);
		}
	}

	for (const key of headers.keys()) {
		if (stringKeys.has(key) || regexKeys.some((regex) => regex.test(key))) {
			const value = headers.get(key);
			if (typeof value === "string") {
				picked.set(key, value);
			}
		}
	}

	return picked;
};

export default pickHeaders;
