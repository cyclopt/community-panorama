/**
 * formatNumber
 * -------------
 * Converts a Number or numeric String into a locale-aware, human-readable string.
 *
 * @param {string|number} input       The value to format (e.g. 12345.67 or "12345.67").
 * @param {Object}           [opts]   Optional settings:
 *   @param {string}         [opts.locale="en-US"]        BCP-47 locale identifier.
 *   @param {Object}         [opts.formatOptions]          Options to pass to Intl.NumberFormat.
 *     (e.g. { style: "currency", currency: "USD", minimumFractionDigits: 2 })
 *
 * @returns {string}  Formatted string (e.g. "12,345.67" or "€12.345,67", depending on locale/options).
 *
 * @throws {TypeError} If the input cannot be parsed into a valid number.
 *
 * @example
 *   formatNumber("1234567.89");
 *    → "1,234,567.89"                    (default en-US, no extra options)
 *
 *   formatNumber(1234567.89, {
 *     locale: "de-DE",
 *     formatOptions: { minimumFractionDigits: 2, maximumFractionDigits: 2 }
 *   });
 *   → "1.234.567,89"
 *
 *   formatNumber("5500000", {
 *     locale: "en-US",
 *     formatOptions: { notation: "compact", compactDisplay: "short", minimumFractionDigits: 1 }
 *   });
 *    → "5.5M"
 */

const formatLocalNumber = (input, opts = {}) => {
	const { locale = "en-US", formatOptions = {} } = opts;

	// 1️⃣  Parse the input into a Number
	let numericValue;
	if (typeof input === "number") {
		numericValue = input;
	} else if (typeof input === "string") {
		// Remove any common formatting characters (commas, spaces, currency symbols) before parsing:
		const cleaned = input.replaceAll(/[^\d+-Ee]/g, "");
		numericValue = Number(cleaned);
	} else {
		return "";
	}

	// 2️⃣  Validate that parsing produced a finite number
	if (!Number.isFinite(numericValue)) throw new TypeError(`formatLocalNumber: "${input}" cannot be parsed into a valid number.`);

	// 3️⃣  Delegate to Intl.NumberFormat
	//     This will insert correct group separators, decimals, etc., based on locale + options.
	const formatter = new Intl.NumberFormat(locale, formatOptions);
	return formatter.format(numericValue);
};

export default formatLocalNumber;
