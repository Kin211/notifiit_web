import {fetchScheduleByPeriod} from "./scheduleService.js";
import {API_CONFIG} from './config.js';
import {addLesson, deleteLesson, getScheduleFromLocal, saveScheduleToLocal, updateLocalLesson} from './storage.js';
import {Lesson} from './lesson.js';

const SLOT_MINUTES = 10;
const SLOT_HEIGHT = 14;
const START_HOUR = 8;
const END_HOUR = 23;
const TOTAL_SLOTS = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;
const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const dayToIndex = {
    Monday: 0,
    Tuesday: 1,
    Wednesday: 2,
    Thursday: 3,
    Friday: 4,
    Saturday: 5,
    Sunday: 6
};
const indexToEnglishDay = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

let currentLessons = [];
let currentMondayDate = null;
let currentMondayStr = null;
let currentGroupId = loadGroupId();
let selectedLessonId = null;
let draggedLessonId = null;
let draggedLessonOffsetY = 0;

document.addEventListener('DOMContentLoaded', () => {
    buildCalendarGrid();
    setupMobileDayPicker();
    setupNavigation();
    setupCellsDnD();
    setupLessonActions();
    displayWeekForDate(new Date());
});

function setupMobileDayPicker() {
    const dayButtons = document.querySelectorAll('.day-btn');
    const grid = document.getElementById('calendarGrid');
    grid.classList.add('show-day-0');

    dayButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            dayButtons.forEach(button => button.classList.remove('active'));
            btn.classList.add('active');

            const dayIndex = Number(btn.dataset.day);
            for (let i = 0; i <= 6; i++) {
                grid.classList.remove(`show-day-${i}`);
            }
            grid.classList.add(`show-day-${dayIndex}`);
        });
    });
}

function setupNavigation() {
    document.querySelector('.date-nav button:first-child').addEventListener('click', () => {
        const prevWeek = new Date(currentMondayDate || new Date());
        prevWeek.setDate(prevWeek.getDate() - 7);
        displayWeekForDate(prevWeek);
    });

    document.querySelector('.date-nav button:last-child').addEventListener('click', () => {
        const nextWeek = new Date(currentMondayDate || new Date());
        nextWeek.setDate(nextWeek.getDate() + 7);
        displayWeekForDate(nextWeek);
    });

    document.querySelector('.btn-today').addEventListener('click', () => {
        displayWeekForDate(new Date());
    });

    document.getElementById('profileBtn').addEventListener('click', () => {
        const inputValue = window.prompt('Введите учебную группу', String(currentGroupId));
        if (inputValue === null) {
            return;
        }

        const nextGroupId = Number(inputValue.trim());
        if (!Number.isInteger(nextGroupId) || nextGroupId <= 0) {
            alert('Учебная группа должна быть положительным целым числом.');
            return;
        }

        if (nextGroupId === currentGroupId) {
            return;
        }

        currentGroupId = nextGroupId;
        saveGroupId(currentGroupId);
        displayWeekForDate(currentMondayDate || new Date(), {forceRefresh: true});
    });
}

function setupCellsDnD() {
    document.querySelectorAll('.day-cell').forEach(cell => {
        cell.addEventListener('dragover', event => {
            event.preventDefault();
            cell.classList.add('drag-over');
        });

        cell.addEventListener('dragleave', () => {
            cell.classList.remove('drag-over');
        });

        cell.addEventListener('drop', event => {
            event.preventDefault();
            cell.classList.remove('drag-over');
            moveLessonToCell(draggedLessonId, cell, event);
        });
    });
}

function buildCalendarGrid() {
    const grid = document.getElementById('calendarGrid');
    const fragments = ['<div class="corner-placeholder"></div>'];

    DAY_NAMES.forEach(dayName => {
        fragments.push(`<div class="day-header"><span class="day-number"></span> ${dayName}</div>`);
    });

    for (let slotIndex = 0; slotIndex < TOTAL_SLOTS; slotIndex++) {
        const slotStartDecimal = START_HOUR + ((slotIndex * SLOT_MINUTES) / 60);
        const timeLabel = slotIndex % (60 / SLOT_MINUTES) === 0 ? decimalToTime(slotStartDecimal) : '';
        const boundaryClass = (slotIndex + 1) % (60 / SLOT_MINUTES) === 0 ? 'hour-boundary' : '';
        fragments.push(`<div class="time-label ${boundaryClass}">${timeLabel}</div>`);

        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
            fragments.push(`
                <div
                    class="day-cell ${boundaryClass}"
                    data-day="${dayIndex}"
                    data-slot="${slotIndex}"
                    data-slot-start="${slotStartDecimal}"
                ></div>
            `);
        }
    }

    grid.innerHTML = fragments.join('');
}

function setupLessonActions() {
    const addButton = document.getElementById('addEventBtn');
    const deleteButton = document.getElementById('deleteEventBtn');
    const modal = document.getElementById('lessonModal');
    const form = document.getElementById('lessonForm');

    addButton.addEventListener('click', openLessonModal);

    deleteButton.addEventListener('click', () => {
        if (!selectedLessonId) {
            alert('Сначала выберите занятие для удаления.');
            return;
        }

        const selectedLesson = currentLessons.find(lesson => lesson.localId === selectedLessonId);
        if (!selectedLesson) {
            return;
        }

        const shouldDelete = window.confirm(`Удалить занятие "${selectedLesson.subjectName || 'Без названия'}"?`);
        if (!shouldDelete) {
            return;
        }

        currentLessons = recalculatePairNumbers(deleteLesson(getWeekStorageKey(), selectedLessonId) || []);
        selectedLessonId = null;
        persistAndRenderCurrentLessons();
    });

    modal.addEventListener('click', event => {
        if (event.target.dataset.closeModal === 'true') {
            closeLessonModal();
        }
    });

    form.addEventListener('submit', event => {
        event.preventDefault();

        const formData = new FormData(form);
        const dayIndex = Number(formData.get('dayIndex'));
        const startTime = formData.get('startTime');
        const endTime = formData.get('endTime');

        if (!startTime || !endTime || timeToDecimal(endTime) <= timeToDecimal(startTime)) {
            alert('Время окончания должно быть позже времени начала.');
            return;
        }

        const lessonDate = getDateForDayIndex(dayIndex);
        const newLesson = {
            date: formatDateTime(lessonDate),
            dayOfWeek: indexToEnglishDay[dayIndex],
            pairNumber: 0,
            startTime,
            endTime,
            subjectName: String(formData.get('subjectName') || '').trim(),
            teacherName: String(formData.get('teacherName') || '').trim() || null,
            classroomNumber: String(formData.get('classroomNumber') || '').trim() || null,
            auditoryLocation: String(formData.get('auditoryLocation') || '').trim() || null,
            evenness: 'Always'
        };

        currentLessons = addLesson(getWeekStorageKey(), newLesson) || [];
        currentLessons = recalculatePairNumbers(currentLessons);
        persistAndRenderCurrentLessons();
        closeLessonModal();
    });
}

async function displayWeekForDate(date, options = {}) {
    const {forceRefresh = false} = options;
    const monday = getMonday(date);
    const weekDays = Array.from({length: 7}, (_, index) => {
        const day = new Date(monday);
        day.setDate(monday.getDate() + index);
        return day;
    });
    const monthNames = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];

    currentMondayDate = monday;
    currentMondayStr = toYMD(monday);
    selectedLessonId = null;
    draggedLessonId = null;

    updateCalendarHeader(weekDays, monthNames);
    updateDayOptions(weekDays);

    const grid = document.querySelector('.calendar-grid');
    grid.dataset.currentMonday = currentMondayStr;

    try {
        const storageKey = getWeekStorageKey();
        const localLessons = forceRefresh ? null : getScheduleFromLocal(storageKey);
        let lessons = localLessons;

        if (localLessons === null) {
            lessons = await fetchScheduleByPeriod(currentGroupId, 1, weekDays[0], weekDays[6]);
            lessons = saveScheduleToLocal(storageKey, lessons);
        }

        currentLessons = recalculatePairNumbers(lessons || []);
        if (localLessons === null && currentLessons.length === 0) {
            alert(`Для учебной группы ${currentGroupId} расписание не найдено.`);
        }
        persistAndRenderCurrentLessons();
    } catch (error) {
        console.error("Не удалось загрузить расписание:", error);
        currentLessons = [];
        selectedLessonId = null;
        draggedLessonId = null;
        renderLessons(currentLessons);
        syncDeleteButtonState();
        alert(`Не удалось загрузить расписание для учебной группы ${currentGroupId}.`);
    }
}

function updateCalendarHeader(weekDays, monthNames) {
    const dayHeaders = document.querySelectorAll('.day-header');
    dayHeaders.forEach((header, index) => {
        const dayNumberSpan = header.querySelector('.day-number');
        if (dayNumberSpan) {
            dayNumberSpan.textContent = weekDays[index].getDate();
        }
    });

    const mobileDayBtns = document.querySelectorAll('.day-btn span');
    mobileDayBtns.forEach((span, index) => {
        span.textContent = weekDays[index].getDate();
    });

    const startDate = weekDays[0];
    const endDate = weekDays[6];
    const startMonth = monthNames[startDate.getMonth()];
    const endMonth = monthNames[endDate.getMonth()];
    const dateText = startDate.getMonth() === endDate.getMonth()
        ? `${startMonth} ${startDate.getDate()} - ${endDate.getDate()}`
        : `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}`;
    const titleText = startDate.getMonth() === endDate.getMonth()
        ? `${startDate.getDate()} - ${endDate.getDate()} ${startMonth}`
        : `${startDate.getDate()} ${startMonth} - ${endDate.getDate()} ${endMonth}`;

    const dateNavSpan = document.querySelector('.date-nav span');
    if (dateNavSpan) {
        dateNavSpan.textContent = dateText;
    }

    const calendarTitle = document.querySelector('.calendar-controls h2');
    if (calendarTitle) {
        calendarTitle.textContent = titleText;
    }
}

function updateDayOptions(weekDays) {
    const daySelect = document.getElementById('lessonDay');
    daySelect.innerHTML = weekDays
        .map((day, index) => `<option value="${index}">${DAY_NAMES[index]} ${day.getDate()}</option>`)
        .join('');
}

function persistAndRenderCurrentLessons() {
    currentLessons = saveScheduleToLocal(getWeekStorageKey(), recalculatePairNumbers(currentLessons));
    renderLessons(currentLessons);
    syncDeleteButtonState();
}

function renderLessons(lessons) {
    document.querySelectorAll('.event-card').forEach(card => card.remove());

    sortLessons(lessons).forEach(lessonData => {
        const lesson = new Lesson(lessonData);
        const dayIdx = dayToIndex[lesson.dayOfWeek];
        const startDecimal = timeToDecimal(lesson.startTime);
        const endDecimal = timeToDecimal(lesson.endTime);
        const startSlotIndex = getSlotIndex(startDecimal);
        const targetCell = document.querySelector(`.day-cell[data-day="${dayIdx}"][data-slot="${startSlotIndex}"]`);

        if (!targetCell) {
            return;
        }

        const duration = endDecimal - startDecimal;
        const slotStartDecimal = getSlotStartDecimal(startSlotIndex);
        const topOffset = ((startDecimal - slotStartDecimal) * 60 / SLOT_MINUTES) * SLOT_HEIGHT;
        const cardHeight = (duration * 60 / SLOT_MINUTES) * SLOT_HEIGHT;

        const card = document.createElement('div');
        card.className = `event-card ${getEventColor(lesson.subjectName || '')}`;
        card.draggable = true;
        card.dataset.lessonId = lesson.localId;
        card.style.top = `${topOffset}px`;
        card.style.height = `${cardHeight}px`;

        if (lesson.localId === selectedLessonId) {
            card.classList.add('is-selected');
        }

        const locationText = lesson.classroomNumber === 'Онлайн'
            ? 'Онлайн'
            : `Ауд. ${lesson.classroomNumber || '-'} ${lesson.auditoryLocation || '-'}`;

        card.innerHTML = `
            <span class="time">${lesson.getTimeRange()}</span>
            <span class="title">${lesson.subjectName || '-'}</span>
            <span class="location">${locationText}</span>
            <span class="teacher">${lesson.teacherName || '-'}</span>
        `;

        card.addEventListener('click', event => {
            event.stopPropagation();
            selectedLessonId = lesson.localId;
            renderLessons(currentLessons);
        });

        card.addEventListener('pointerdown', event => {
            const cardRect = card.getBoundingClientRect();
            draggedLessonOffsetY = event.clientY - cardRect.top;
        });

        card.addEventListener('dragstart', event => {
            draggedLessonId = lesson.localId;
            selectedLessonId = lesson.localId;
            if (!Number.isFinite(draggedLessonOffsetY)) {
                const cardRect = card.getBoundingClientRect();
                draggedLessonOffsetY = event.clientY - cardRect.top;
            }
            syncDeleteButtonState();
        });

        card.addEventListener('dragend', () => {
            draggedLessonId = null;
            draggedLessonOffsetY = 0;
            document.querySelectorAll('.day-cell.drag-over').forEach(cell => cell.classList.remove('drag-over'));
        });

        targetCell.appendChild(card);
    });

    document.querySelectorAll('.day-cell').forEach(cell => {
        cell.onclick = () => {
            selectedLessonId = null;
            syncDeleteButtonState();
            renderLessons(currentLessons);
        };
    });
}

function moveLessonToCell(lessonId, cell, event) {
    if (!lessonId) {
        return;
    }

    const dayIndex = Number(cell.dataset.day);
    const targetStartDecimal = getDropStartDecimal(cell, event);
    const lesson = currentLessons.find(item => item.localId === lessonId);

    if (!lesson) {
        return;
    }

    const duration = timeToDecimal(lesson.endTime) - timeToDecimal(lesson.startTime);
    const newStartTime = decimalToTime(targetStartDecimal);
    const newEndTime = decimalToTime(targetStartDecimal + duration);
    const newDate = getDateForDayIndex(dayIndex);

    currentLessons = updateLocalLesson(getWeekStorageKey(), lessonId, {
        date: formatDateTime(newDate),
        dayOfWeek: indexToEnglishDay[dayIndex],
        startTime: newStartTime,
        endTime: newEndTime
    }) || currentLessons;

    currentLessons = recalculatePairNumbers(currentLessons);
    selectedLessonId = lessonId;
    persistAndRenderCurrentLessons();
}

function openLessonModal() {
    const modal = document.getElementById('lessonModal');
    const form = document.getElementById('lessonForm');
    form.reset();
    document.getElementById('lessonDay').value = '0';
    modal.classList.remove('hidden');
}

function closeLessonModal() {
    document.getElementById('lessonModal').classList.add('hidden');
}

function syncDeleteButtonState() {
    const deleteButton = document.getElementById('deleteEventBtn');
    deleteButton.classList.toggle('is-active', Boolean(selectedLessonId));
}

function getWeekStorageKey() {
    return `${currentGroupId}_${currentMondayStr}`;
}

function loadGroupId() {
    const savedValue = localStorage.getItem('active_group_id');
    const parsedValue = Number(savedValue);
    if (Number.isInteger(parsedValue) && parsedValue > 0) {
        return parsedValue;
    }
    return API_CONFIG.GROUP_ID;
}

function saveGroupId(groupId) {
    localStorage.setItem('active_group_id', String(groupId));
}

function getMonday(date) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const currentDay = targetDate.getDay();
    const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
    targetDate.setDate(targetDate.getDate() - diffToMonday);
    return targetDate;
}

function getDateForDayIndex(dayIndex) {
    const date = new Date(currentMondayDate);
    date.setDate(currentMondayDate.getDate() + dayIndex);
    return date;
}

function toYMD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateTime(date) {
    return `${toYMD(date)}T00:00:00`;
}

function timeToDecimal(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + (minutes / 60);
}

function decimalToTime(decimal) {
    const normalizedDecimal = Math.max(0, decimal);
    const hours = Math.floor(normalizedDecimal);
    const minutes = Math.round((normalizedDecimal - hours) * 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function getDropStartDecimal(cell, event) {
    const cellRect = cell.getBoundingClientRect();
    const targetSlotIndex = Number(cell.dataset.slot);
    const topEdgeY = event.clientY - draggedLessonOffsetY;
    const slotOffset = Math.round((topEdgeY - cellRect.top) / SLOT_HEIGHT);
    const slotIndex = Math.min(Math.max(targetSlotIndex + slotOffset, 0), TOTAL_SLOTS - 1);
    return getSlotStartDecimal(slotIndex);
}

function getEventColor(subjectName) {
    const name = subjectName.toLowerCase();
    if (name.includes('мат') || name.includes('маш')) return 'blue';
    if (name.includes('физ') || name.includes('ист') || name.includes('пуб')) return 'orange';
    return 'green';
}

function sortLessons(lessons) {
    return [...lessons].sort((left, right) => {
        const leftDay = dayToIndex[left.dayOfWeek] ?? 0;
        const rightDay = dayToIndex[right.dayOfWeek] ?? 0;
        if (leftDay !== rightDay) {
            return leftDay - rightDay;
        }
        return timeToDecimal(left.startTime) - timeToDecimal(right.startTime);
    });
}

function recalculatePairNumbers(lessons) {
    const counters = new Map();

    return sortLessons(lessons).map(lesson => {
        const dayKey = lesson.dayOfWeek;
        const nextPairNumber = (counters.get(dayKey) || 0) + 1;
        counters.set(dayKey, nextPairNumber);

        return {
            ...lesson,
            pairNumber: nextPairNumber
        };
    });
}

function getSlotIndex(decimalTime) {
    const minutesFromStart = (decimalTime - START_HOUR) * 60;
    const slotIndex = Math.floor(minutesFromStart / SLOT_MINUTES);
    return Math.min(Math.max(slotIndex, 0), TOTAL_SLOTS - 1);
}

function getSlotStartDecimal(slotIndex) {
    return START_HOUR + ((slotIndex * SLOT_MINUTES) / 60);
}
