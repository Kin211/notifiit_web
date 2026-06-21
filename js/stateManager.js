import { loadGroupId, saveGroupId } from "./storage.js";
import { toYMD } from "./calendarHelpers.js";

class StateManager {
    constructor() {
        this.lessons = [];
        this.mondayDate = null;
        this.mondayStr = null;
        this.groupId = loadGroupId();

        this.selectedLessonId = null;
        this.draggedLessonId = null;
        this.draggedLessonOffsetY = 0;
    }

    setMonday(date) {
        this.mondayDate = date;
        this.mondayStr = toYMD(date);
    }

    setGroupId(id) {
        this.groupId = id;
        saveGroupId(id);
    }

    get weekStorageKey() {
        return `${this.groupId}_${this.mondayStr}`;
    }
}

export const appState = new StateManager();