export function generateKey() {
	const keyChars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let key = "";
	for (let i = 0; i < 16; i++) {
		key += keyChars[Math.floor(Math.random() * keyChars.length)];
	}

	// Cryptographically secure UUID
	const uuid = crypto.randomUUID();

	// Without -
	const uuidWithoutDash = uuid.replace(/-/g, "");

	// Combine
	return key + uuidWithoutDash;
}
