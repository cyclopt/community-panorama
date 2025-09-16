import dayjs from "./dayjs.js";

const formatDateByHour = (date, hour, tz) => dayjs(date).tz(tz).hour(hour).minute(0)
	.second(0)
	.millisecond(0);

const formatWorkDay = (date, startHour, endHour, tz) => {
	const localDate = dayjs(date).tz(tz);
	if (localDate.isBefore(formatDateByHour(date, startHour, tz))) return formatDateByHour(date, startHour, tz);
	if (localDate.isAfter(formatDateByHour(date, endHour, tz))) return formatDateByHour(date, endHour, tz);
	return localDate;
};

const getWorkTime = (startDate, endDate, { workHoursStart = 8, workHoursEnd = 20, includeWeekends = false }) => {
	if (workHoursEnd < workHoursStart) return null;

	const tz = dayjs.tz.guess();
	const formatedStartDate = formatWorkDay(startDate, workHoursStart, workHoursEnd, tz);
	const formatedEndDate = formatWorkDay((endDate || dayjs()), workHoursStart, workHoursEnd, tz);

	if (formatedStartDate.isAfter(formatedEndDate)) return 0;
	if (formatedStartDate.isSame(formatedEndDate, "day")) return formatedEndDate.diff(formatedStartDate);

	let curDay = formatedStartDate;
	let ms = 0;
	while (curDay.isSameOrBefore(formatedEndDate, "day")) {
		if (includeWeekends || (curDay.day() !== 0 && curDay.day() !== 6)) {
			if (curDay.isSame(formatedEndDate, "day")) ms += formatedEndDate.diff(curDay);
			else if (curDay.isSame(formatedStartDate, "day")) ms += formatDateByHour(curDay, workHoursEnd, tz).diff(curDay);
			else ms += formatDateByHour(curDay, workHoursEnd, tz).diff(formatDateByHour(curDay, workHoursStart, tz));
		}

		curDay = formatDateByHour(curDay.add(1, "day"), workHoursStart, tz);
	}

	return ms;
};

export default getWorkTime;
