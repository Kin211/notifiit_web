import { fetchScheduleByPeriod } from "./scheduleService.js";
import { getScheduleFromLocal, saveScheduleToLocal } from './storage.js';
import { ModalManager } from './modalManager.js';
import { LessonFormManager } from './lessonFormManager.js';
import {
    dayToIndex, getMonday, hasUsableLocalLessons, recalculatePairNumbers
} from './calendarHelpers.js';

import { appState } from './stateManager.js'
import { CalendarRenderer } from './CalendarRenderer.js';
import { UIManager } from './UIManager.js';
import { DragAndDropManager } from './DragAndDropManager.js';
import { LessonRenderer } from './LessonRenderer.js';

let modalManager = null;
let formManager = null;

document.addEventListener('DOMContentLoaded', () => {
    CalendarRenderer.buildGrid();

    formManager = new LessonFormManager();
    modalManager = new ModalManager((lesson) => {
        formManager.openForEdit(lesson, dayToIndex);
    });

    CalendarRenderer.setupMobileDayPicker();
    UIManager.setupNavigation(displayWeekForDate);
    UIManager.setupLessonActions(formManager, persistAndRenderCurrentLessons);
    displayWeekForDate(new Date());
    DragAndDropManager.setup(persistAndRenderCurrentLessons);
    CalendarRenderer.syncBufferVisibility(appState.groupId, !!appState.draggedLessonId);
});

async function displayWeekForDate(date, options = {}) {
    const { forceRefresh = false } = options;
    const monday = getMonday(date);

    // Обновляем состояние
    appState.setMonday(monday);
    appState.selectedLessonId = null;
    appState.draggedLessonId = null;

    const weekDays = Array.from({length: 7}, (_, index) => {
        const day = new Date(monday);
        day.setDate(monday.getDate() + index);
        return day;
    });
    const monthNames = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];

    UIManager.syncDeleteButtonState();
    CalendarRenderer.updateHeader(weekDays, monthNames);
    CalendarRenderer.updateDayOptions(weekDays);

    const grid = document.querySelector('.calendar-grid');
    grid.dataset.currentMonday = appState.mondayStr;

    try {
        const storageKey = appState.weekStorageKey;
        const cachedLessons = forceRefresh ? null : getScheduleFromLocal(storageKey);
        const localLessons = hasUsableLocalLessons(cachedLessons) ? cachedLessons : null;
        let lessons = localLessons;

        if (localLessons === null) {
            CalendarRenderer.showSkeletons();
            lessons = await fetchScheduleByPeriod(appState.groupId, 1, weekDays[0], weekDays[6]);
            lessons = saveScheduleToLocal(storageKey, lessons);
        }

        appState.lessons = recalculatePairNumbers(lessons || []);

        if (localLessons === null && appState.lessons.length === 0) {
            alert(`Для учебной группы ${appState.groupId} расписание не найдено.`);
        }

        persistAndRenderCurrentLessons();
    } catch (error) {
        console.error("Не удалось загрузить расписание:", error);
        appState.lessons = [];
        appState.selectedLessonId = null;
        appState.draggedLessonId = null;

        LessonRenderer.render(modalManager, persistAndRenderCurrentLessons);
        UIManager.syncDeleteButtonState();
        alert(`Не удалось загрузить расписание для учебной группы ${appState.groupId}.`);
    } finally {
        CalendarRenderer.hideSkeletons();
    }
}

function persistAndRenderCurrentLessons() {
    appState.lessons = saveScheduleToLocal(
        appState.weekStorageKey,
        recalculatePairNumbers(appState.lessons)
    );
    LessonRenderer.render(modalManager, persistAndRenderCurrentLessons);
    UIManager.syncDeleteButtonState();
}