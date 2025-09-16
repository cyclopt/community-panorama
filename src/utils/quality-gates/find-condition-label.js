import { dequal } from "dequal";

// Function to find a specific label from an array of objects based on given conditions.
const findConditionLabel = (objects, variableToCheck, valueToMatch, targetVariable) => {
	// Iterate over each object in the provided array of objects
	for (const obj of objects) {
		// Check if the specified variable in the object is an array
		if (Array.isArray(obj[variableToCheck])) {
			// Compare the sorted arrays to see if they are equal
			if (dequal([...obj[variableToCheck]].sort(), [...valueToMatch].sort())) {
				// If they match, return the value of the target variable from the object
				return obj[targetVariable];
			}
		// If the specified variable is not an array, compare it directly to the valueToMatch
		} else if (obj[variableToCheck] === valueToMatch) {
			// If they are equal, return the value of the target variable from the object
			return obj[targetVariable];
		}
	}

	// If no matches are found, return null
	return null;
};

export default findConditionLabel;
