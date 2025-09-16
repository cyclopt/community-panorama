import { get, set, del } from "idb-keyval";
import { createWithEqualityFn } from "zustand/traditional";
import { createJSONStorage, persist } from "zustand/middleware";

export default createWithEqualityFn(persist((setState, getState) => ({
	defaultPageOptions: { page: 0, pageSize: 10 },
	setDefaultPageOptions: (defaultPageOptions) => setState({ defaultPageOptions }),
	showClosedTasks: false,
	toggleShowClosedTasks: () => setState({ showClosedTasks: !getState().showClosedTasks }),
	showClosedEpics: false,
	toggleShowClosedEpics: () => setState({ showClosedEpics: !getState().showClosedEpics }),
	kanbanTheme: "Default",
	setKanbanTheme: (kanbanTheme) => setState({ kanbanTheme }),
	currentSprint: null,
	setCurrentSprint: (currentSprint) => setState({ currentSprint }),
}), { name: "cyclopt", storage: createJSONStorage(() => ({ getItem: get, setItem: set, removeItem: del })) }));
