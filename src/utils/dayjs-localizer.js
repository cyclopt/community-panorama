import { DateLocalizer } from "react-big-calendar";
import * as dates from "react-big-calendar/lib/utils/dates";

import dayjs from "./dayjs.js";

const dateRangeFormat = ({ start, end }, culture, local) => `${local.format(start, "L", culture)} – ${local.format(end, "L", culture)}`;
const timeRangeFormat = ({ start, end }, culture, local) => `${local.format(start, "LT", culture)} – ${local.format(end, "LT", culture)}`;
const timeRangeStartFormat = ({ start }, culture, local) => `${local.format(start, "LT", culture)} – `;
const timeRangeEndFormat = ({ end }, culture, local) => ` – ${local.format(end, "LT", culture)}`;
const weekRangeFormat = ({ start, end }, culture, local) => `${local.format(start, "MMMM DD", culture)
} – ${local.format(end, dates.eq(start, end, "month") ? "DD" : "MMMM DD", culture)}`;

const formats = {
	dateFormat: "DD",
	dayFormat: "DD ddd",
	weekdayFormat: "dddd",
	selectRangeFormat: timeRangeFormat,
	eventTimeRangeFormat: timeRangeFormat,
	eventTimeRangeStartFormat: timeRangeStartFormat,
	eventTimeRangeEndFormat: timeRangeEndFormat,
	timeGutterFormat: "LT",
	monthHeaderFormat: "MMMM YYYY",
	dayHeaderFormat: "dddd MMM DD",
	dayRangeHeaderFormat: weekRangeFormat,
	agendaHeaderFormat: dateRangeFormat,
	agendaDateFormat: "ddd MMM DD",
	agendaTimeFormat: "LT",
	agendaTimeRangeFormat: timeRangeFormat,
};

const locale = (m, c) => (c ? m.locale(c) : m);

const dayjsLocalizer = () => new DateLocalizer({
	formats,
	firstOfWeek: () => dayjs.localeData()?.firstDayOfWeek() || 0,
	format: (value, format, culture) => locale(dayjs(value), culture).format(format),
});

export default dayjsLocalizer;
