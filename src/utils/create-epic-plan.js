import { dateNewToOld, dateOldToNew } from "@iamnapo/sort";

import dayjs from "./dayjs.js";

const createEpicPlan = (epic) => {
	const calculatedEvents = [];
	while (calculatedEvents.length < epic.tasks.length) {
		let addedSomething = false;
		for (const task of epic.tasks) {
			if (!calculatedEvents.some((e) => e.resource._id === task._id)) {
				const blockedBy = epic.tasksBlockedBy?.[task._id] || [];
				if (blockedBy.filter((e) => !calculatedEvents.some((el) => el.resource._id === e._id)).length === 0) {
					let start = dayjs(epic.startDate);
					for (const b of blockedBy.filter((e) => calculatedEvents.some((el) => el.resource._id === e._id))) {
						const { end: prevEnd } = calculatedEvents.find((e) => e.resource._id === b._id) || {};

						if (prevEnd && start.isSameOrBefore(dayjs(prevEnd))) {
							start = dayjs(prevEnd).add(1, "day");
						}
					}

					let end = start.add(task.points.total - 1, "day");
					if (end.isBefore(dayjs(), "day")) end = dayjs();
					if (task.closed) end = dayjs(task.closedAt);
					calculatedEvents.push({
						title: task.title,
						start,
						end,
						resource: {
							closed: task.closed,
							_id: task._id,
							type: "task",
							blockedBy,
						},
					});
					addedSomething = true;
				}
			}
		}

		if (!addedSomething) {
			return null;
		}
	}

	return (calculatedEvents.length < epic.tasks.length ? [] : [{
		title: "Critical Path",
		start: calculatedEvents.sort(dateOldToNew((v) => v.start.toDate()))[0]?.start,
		end: calculatedEvents.sort(dateNewToOld((v) => v.end.toDate()))[0]?.end,
		resource: {
			type: "critical",
		},
	}, ...calculatedEvents]);
};

export default createEpicPlan;
