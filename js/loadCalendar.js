import {fetchScheduleByPeriod} from "./scheduleService.js";
import {
    addLesson, deleteLesson, getScheduleFromLocal, saveScheduleToLocal, updateLocalLesson,
    getGlobalBuffer, addLessonToBuffer, removeLessonFromBuffer, loadGroupId
} from './storage.js';
import {Lesson} from './lesson.js';
import {ModalManager} from './modalManager.js';
import {LessonFormManager} from './lessonFormManager.js';

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
let modalManager = null;
let formManager = null;

document.addEventListener('DOMContentLoaded', () => {
    buildCalendarGrid();
    
    formManager = new LessonFormManager();
    modalManager = new ModalManager((lesson) => {
        formManager.openForEdit(lesson, dayToIndex);
    });
    
    setupMobileDayPicker();
    setupNavigation();
    setupCellsDnD();
    setupLessonActions();
    displayWeekForDate(new Date());
    setupBufferDnD();
    syncBufferVisibility();
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
    document.getElementById('prevWeekBtn').addEventListener('click', () => {
        const prevWeek = new Date(currentMondayDate || new Date());
        prevWeek.setDate(prevWeek.getDate() - 7);
        displayWeekForDate(prevWeek);
    });

    document.getElementById('nextWeekBtn').addEventListener('click', () => {
        const nextWeek = new Date(currentMondayDate || new Date());
        nextWeek.setDate(nextWeek.getDate() + 7);
        displayWeekForDate(nextWeek);
    });

    document.getElementById('todayBtn').addEventListener('click', () => {
        displayWeekForDate(new Date());
    });

    window.addEventListener('groupChanged', (event) => {
        const { groupId } = event.detail;
        currentGroupId = groupId;
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

    addButton.addEventListener('click', () => {
        formManager.openForCreate();
    });

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
        syncDeleteButtonState();
    });

    modal.addEventListener('click', event => {
        if (event.target.dataset.closeModal === 'true') {
            formManager.close();
        }
    });

    form.addEventListener('submit', event => {
        event.preventDefault();

        const formData = formManager.getFormData();
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

        const editId = formManager.getEditId();

        if (editId) {
            currentLessons = updateLocalLesson(getWeekStorageKey(), editId, newLesson) || currentLessons;
        } else {
            newLesson.pairNumber = 0;
            currentLessons = addLesson(getWeekStorageKey(), newLesson) || [];
        }

        currentLessons = recalculatePairNumbers(currentLessons);
        persistAndRenderCurrentLessons();
        formManager.close();
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

    syncDeleteButtonState();

    updateCalendarHeader(weekDays, monthNames);
    updateDayOptions(weekDays);

    const grid = document.querySelector('.calendar-grid');
    grid.dataset.currentMonday = currentMondayStr;

    try {
        const storageKey = getWeekStorageKey();
        const cachedLessons = forceRefresh ? null : getScheduleFromLocal(storageKey);
        const localLessons = hasUsableLocalLessons(cachedLessons) ? cachedLessons : null;
        let lessons = localLessons;

        if (localLessons === null) {
            renderLoadingSkeletons();
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
    } finally {
        removeLoadingSkeletons();
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
    removeLoadingSkeletons();
    document.querySelectorAll('.event-card').forEach(card => card.remove());

    const bufferZone = document.getElementById('bufferDropZone');
    const emptyPlaceholder = bufferZone.querySelector('.empty-buffer-placeholder');
    let itemsInBuffer = 0;

    const bufferLessons = getGlobalBuffer(currentGroupId);
    const allLessonsToRender = [...lessons, ...bufferLessons];
    
    sortLessons(allLessonsToRender).forEach(lessonData => {
        const lesson = new Lesson(lessonData);
        const dayIdx = dayToIndex[lesson.dayOfWeek];
        const startDecimal = timeToDecimal(lesson.startTime);
        const endDecimal = timeToDecimal(lesson.endTime);
        const clippedStartDecimal = Math.max(startDecimal, START_HOUR);
        const clippedEndDecimal = Math.min(endDecimal, END_HOUR);

        if (!Number.isFinite(startDecimal) || !Number.isFinite(endDecimal) || clippedEndDecimal <= clippedStartDecimal) {
            return;
        }

        const startSlotIndex = getSlotIndex(clippedStartDecimal);
        const targetCell = document.querySelector(`.day-cell[data-day="${dayIdx}"][data-slot="${startSlotIndex}"]`);

        if (!targetCell) {
            return;
        }

        const duration = clippedEndDecimal - clippedStartDecimal;
        const slotStartDecimal = getSlotStartDecimal(startSlotIndex);
        const topOffset = ((clippedStartDecimal - slotStartDecimal) * 60 / SLOT_MINUTES) * SLOT_HEIGHT;
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
            const isRepeatClick = selectedLessonId === lesson.localId;
            selectedLessonId = lesson.localId;
            renderLessons(currentLessons);

            syncDeleteButtonState();
            
            if (isRepeatClick && modalManager) {
                modalManager.open(lesson);
            }
        });

        card.addEventListener('pointerdown', event => {
            const cardRect = card.getBoundingClientRect();
            draggedLessonOffsetY = event.clientY - cardRect.top;
        });

        card.addEventListener('dragstart', event => {
            draggedLessonId = lesson.localId;
            selectedLessonId = lesson.localId;

            setTimeout(() => card.classList.add('is-dragging-hidden'), 0);

            const bufferSection = document.querySelector('.mobile-buffer-section');
            if (bufferSection) {
                bufferSection.classList.add('is-active');
            }

            if (!Number.isFinite(draggedLessonOffsetY)) {
                const cardRect = card.getBoundingClientRect();
                // у touch-событий clientY может отсутствовать напрямую в event, полифилл это исправляет
                draggedLessonOffsetY = (event.clientY || event.touches?.[0].clientY) - cardRect.top;
            }
            
            syncDeleteButtonState();
        });

        card.addEventListener('dragend', () => {
            draggedLessonId = null;
            draggedLessonOffsetY = 0;

            card.classList.remove('is-dragging-hidden');

            document.querySelectorAll('.day-cell.drag-over').forEach(cell => cell.classList.remove('drag-over'));
            
            const bufferZone = document.getElementById('bufferDropZone');
            if (bufferZone) {
                bufferZone.classList.remove('drag-over');
            }

            const bufferSection = document.querySelector('.mobile-buffer-section');
            if (bufferSection) {
                const bufferLessons = getGlobalBuffer(currentGroupId);
                if (bufferLessons.length === 0) {
                    bufferSection.classList.remove('is-active');
                } else {
                    bufferSection.classList.add('is-active');
                }
            }
        });

        // поделил обработку для буфера и основы
        if (lesson.inBuffer) {
            card.classList.add('in-buffer');
            if (bufferZone) {
                bufferZone.appendChild(card);
                itemsInBuffer++;
            }
        } else {
            const dayIdx = dayToIndex[lesson.dayOfWeek];
            const startDecimal = timeToDecimal(lesson.startTime);
            const endDecimal = timeToDecimal(lesson.endTime);
            const clippedStartDecimal = Math.max(startDecimal, START_HOUR);
            const clippedEndDecimal = Math.min(endDecimal, END_HOUR);

            if (!Number.isFinite(startDecimal) || !Number.isFinite(endDecimal) || clippedEndDecimal <= clippedStartDecimal) {
                return;
            }

            const startSlotIndex = getSlotIndex(clippedStartDecimal);
            const targetCell = document.querySelector(`.day-cell[data-day="${dayIdx}"][data-slot="${startSlotIndex}"]`);

            if (targetCell) {
                const duration = clippedEndDecimal - clippedStartDecimal;
                const slotStartDecimal = getSlotStartDecimal(startSlotIndex);
                const topOffset = ((clippedStartDecimal - slotStartDecimal) * 60 / SLOT_MINUTES) * SLOT_HEIGHT;
                const cardHeight = (duration * 60 / SLOT_MINUTES) * SLOT_HEIGHT;

                card.style.top = `${topOffset}px`;
                card.style.height = `${cardHeight}px`;
                targetCell.appendChild(card);
            }
        }
    });
    syncBufferVisibility();

    if (emptyPlaceholder) {
        emptyPlaceholder.style.display = itemsInBuffer > 0 ? 'none' : 'block';
    }

    document.querySelectorAll('.day-cell').forEach(cell => {
        cell.onclick = () => {
            selectedLessonId = null;
            renderLessons(currentLessons);
            syncDeleteButtonState();
        };
    });
}

function moveLessonToCell(lessonId, cell, event) {
    if (!lessonId) {
        return;
    }

    const dayIndex = Number(cell.dataset.day);
    const targetStartDecimal = getDropStartDecimal(cell, event);

    let lesson = currentLessons.find(item => item.localId === lessonId);
    let wasInBuffer = false;

    if (!lesson) {
        const buffer = getGlobalBuffer(currentGroupId);
        lesson = buffer.find(item => item.localId === lessonId);
        if (lesson) {
            wasInBuffer = true;
        }
    }

    if (!lesson) {
        return;
    }

    const duration = timeToDecimal(lesson.endTime) - timeToDecimal(lesson.startTime);
    const newStartTime = decimalToTime(targetStartDecimal);
    const newEndTime = decimalToTime(targetStartDecimal + duration);
    const newDate = getDateForDayIndex(dayIndex);

    if (wasInBuffer) {
        removeLessonFromBuffer(currentGroupId, lessonId);
        lesson.date = formatDateTime(newDate);
        lesson.dayOfWeek = indexToEnglishDay[dayIndex];
        lesson.startTime = newStartTime;
        lesson.endTime = newEndTime;
        lesson.inBuffer = false;
        currentLessons = addLesson(getWeekStorageKey(), lesson) || [];
    } else {
        currentLessons = updateLocalLesson(getWeekStorageKey(), lessonId, {
            date: formatDateTime(newDate),
            dayOfWeek: indexToEnglishDay[dayIndex],
            startTime: newStartTime,
            endTime: newEndTime,
            inBuffer: false,
        }) || currentLessons;
    }

    currentLessons = recalculatePairNumbers(currentLessons);
    selectedLessonId = lessonId;
    persistAndRenderCurrentLessons();
}

function syncDeleteButtonState() {
    const deleteButton = document.getElementById('deleteEventBtn');
    deleteButton.classList.toggle('is-active', Boolean(selectedLessonId));
}

function getWeekStorageKey() {
    return `${currentGroupId}_${currentMondayStr}`;
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

function hasUsableLocalLessons(lessons) {
    return Array.isArray(lessons) && lessons.length > 0;
}

function renderLoadingSkeletons() {
    removeLoadingSkeletons();

    const skeletonSlots = [
        {day: 0, slot: 6},
        {day: 1, slot: 18},
        {day: 2, slot: 30}
    ];

    skeletonSlots.forEach(({day, slot}) => {
        const cell = document.querySelector(`.day-cell[data-day="${day}"][data-slot="${slot}"]`);
        if (!cell) {
            return;
        }

        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-card';
        skeleton.style.height = `${SLOT_HEIGHT * 9}px`;
        cell.appendChild(skeleton);
    });
}

function removeLoadingSkeletons() {
    document.querySelectorAll('.skeleton-card').forEach(card => card.remove());
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

//Для буфера
function setupBufferDnD() {
    const bufferZone = document.getElementById('bufferDropZone');

    bufferZone.addEventListener('dragover', event => {
        event.preventDefault();
        bufferZone.classList.add('drag-over');
    });

    bufferZone.addEventListener('dragleave', () => {
        bufferZone.classList.remove('drag-over');
    });

    bufferZone.addEventListener('drop', event => {
        event.preventDefault();
        bufferZone.classList.remove('drag-over');
        moveLessonToBuffer(draggedLessonId);
    });
}

function moveLessonToBuffer(lessonId) {
    if (!lessonId) return;

    const lessonIndex = currentLessons.findIndex(item => item.localId === lessonId);
    
    if (lessonIndex !== -1) {
        const lessonToMove = currentLessons[lessonIndex];
        addLessonToBuffer(currentGroupId, lessonToMove);
        currentLessons = deleteLesson(getWeekStorageKey(), lessonId) || [];
        selectedLessonId = lessonId;
        persistAndRenderCurrentLessons();
    }
}

//для фикса отображения буфера при перезагрузке
function syncBufferVisibility() {
    const bufferSection = document.querySelector('.mobile-buffer-section');
    if (!bufferSection) return;

    // Проверяем данные в глобальном хранилище
    const bufferItems = getGlobalBuffer(currentGroupId);

    // Условие показа: в буфере есть пары ИЛИ мы сейчас что-то перетаскиваем
    const shouldShow = bufferItems.length > 0 || !!draggedLessonId;

    if (shouldShow) {
        bufferSection.classList.add('is-active');
        document.body.classList.add('buffer-open');
    } else {
        bufferSection.classList.remove('is-active');
        document.body.classList.remove('buffer-open');
    }
}


