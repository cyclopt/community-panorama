import { numberSmallToLarge } from "@iamnapo/sort";

const filterOutliers = (array) => {
	const values = [...array].sort(numberSmallToLarge());

	if (array.length < 4) {
		return { array, min: values[0], max: values.at(-1) };
	}

	let q1;
	let q3;
	if ((values.length % 4) === 0) {
		q1 = (1 / 2) * (values[(values.length / 4) - 1] + values[values.length / 4]);
		q3 = (1 / 2) * (values[(values.length * (3 / 4)) - 1] + values[values.length * (3 / 4)]);
	} else {
		q1 = values[Math.floor((values.length - 1) / 4)];
		q3 = values[Math.ceil((values.length - 1) * (3 / 4))];
	}

	const iqr = q3 - q1;
	const max = q3 + iqr * 1.5;
	const min = q1 - iqr * 1.5;

	return { array: array.filter((x) => (x >= min) && (x <= max)), min, max };
};

export default filterOutliers;
