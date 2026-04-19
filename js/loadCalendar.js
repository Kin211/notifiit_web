import {fetchScheduleByPeriod} from "./scheduleService.js";
import {API_CONFIG} from './config.js';
import {getScheduleFromLocal, saveScheduleToLocal} from './storage.js';
import {Lesson} from './lesson.js';
import { ModalManager } from './modalManager.js';

const modalManager = new ModalManager();
let selectedLessonIndex = null;
const HOUR_HEIGHT = 80;

const dayToIndex = {
    'Monday': 0, 'Tuesday': 1, 'Wednesday': 2,
    'Thursday': 3, 'Friday': 4, 'Saturday': 5, 'Sunday': 6
};

document.addEventListener('DOMContentLoaded', () => {
    const dayButtons = document.querySelectorAll('.day-btn');
    const grid = document.getElementById('calendarGrid');

    // По умолчанию показываем понедельник в мобилке
    grid.classList.add('show-day-0');

    dayButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            dayButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const dayIndex = btn.getAttribute('data-day');

            for (let i = 0; i <= 6; i++) {
                grid.classList.remove(`show-day-${i}`);
            }

            grid.classList.add(`show-day-${dayIndex}`);
        });
    });
});


// отображает неделю для переданной даты
async function displayWeekForDate(date) {
    // 0 - воскресенье
    const targetDate = new Date(date);
    const currentDay = targetDate.getDay();

    const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(targetDate);
    monday.setDate(targetDate.getDate() - diffToMonday);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
        const day = new Date(monday);
        day.setDate(monday.getDate() + i);
        weekDays.push(day);
    }


    const monthNames = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];

    const dayHeaders = document.querySelectorAll('.day-header');
    dayHeaders.forEach((header, index) => {
        if (index < 7) {
            const dayNumberSpan = header.querySelector('.day-number');
            if (dayNumberSpan) {
                dayNumberSpan.textContent = weekDays[index].getDate();
            }
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

    const dateNavSpan = document.querySelector('.date-nav span');
    if (dateNavSpan) {
        if (startDate.getMonth() === endDate.getMonth()) {
            dateNavSpan.textContent = `${startMonth} ${startDate.getDate()} – ${endDate.getDate()}`;
        } else {
            dateNavSpan.textContent = `${startMonth} ${startDate.getDate()} – ${endMonth} ${endDate.getDate()}`;
        }
    }

    const calendarTitle = document.querySelector('.calendar-controls h2');
    if (calendarTitle) {
        if (startDate.getMonth() === endDate.getMonth()) {
            calendarTitle.textContent = `${startDate.getDate()} – ${endDate.getDate()} ${startMonth}`;
        } else {
            calendarTitle.textContent = `${startDate.getDate()} ${startMonth} – ${endDate.getDate()} ${endMonth}`;
        }
    }

    const grid = document.querySelector('.calendar-grid');
    grid.dataset.currentMonday = monday.toISOString();
    const mondayStr = monday.toISOString().split('T')[0];

    try {
        document.querySelectorAll('.event-card').forEach(card => card.remove());
        
        // скелет расписания(пустые ячейки), пока данные подгружаются
        const skeletonHTML = '<div class="skeleton-card" style="top: 0; height: 80px;"></div>';
        document.querySelector('.day-cell[data-day="0"][data-hour="8"]')?.insertAdjacentHTML('beforeend', skeletonHTML);
        document.querySelector('.day-cell[data-day="1"][data-hour="10"]')?.insertAdjacentHTML('beforeend', skeletonHTML);
        document.querySelector('.day-cell[data-day="2"][data-hour="12"]')?.insertAdjacentHTML('beforeend', skeletonHTML);

        let lessons = getScheduleFromLocal(mondayStr);

        if (!lessons || lessons.length === 0) {
            console.log("Загрузка с сервера...");
            // удалить потом строчку ниже
            await new Promise(resolve => setTimeout(resolve, 500)); 
            
            lessons = await fetchScheduleByPeriod(API_CONFIG.GROUP_ID, 1, weekDays[0], weekDays[6]);
            saveScheduleToLocal(mondayStr, lessons);
        } else {
            console.log("Загрузка из локального хранилища");
        }

        document.querySelectorAll('.skeleton-card').forEach(card => card.remove());

        renderLessons(lessons);
    } catch (error) {
        console.error("Не удалось загрузить расписание:", error);
        document.querySelectorAll('.skeleton-card').forEach(card => card.remove());
    }
}

document.querySelector('.date-nav button:first-child').addEventListener('click', () => {
    const grid = document.querySelector('.calendar-grid');
    const currentMonday = new Date(grid.dataset.currentMonday || new Date());
    currentMonday.setDate(currentMonday.getDate() - 7);
    displayWeekForDate(currentMonday);
});

document.querySelector('.date-nav button:last-child').addEventListener('click', () => {
    const grid = document.querySelector('.calendar-grid');
    const currentMonday = new Date(grid.dataset.currentMonday || new Date());
    currentMonday.setDate(currentMonday.getDate() + 7);
    displayWeekForDate(currentMonday);
});

document.querySelector('.btn-today').addEventListener('click', () => {
    displayWeekForDate(new Date());
});

function timeToDecimal(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + (minutes / 60);
}

function getEventColor(subjectName) {
    const name = subjectName.toLowerCase();
    if (name.includes('мат') || name.includes('маш')) return 'blue';
    if (name.includes('физ') || name.includes('ист') || name.includes('пуб')) return 'orange';
    return 'green';
}

function renderLessons(lessons) {
    document.querySelectorAll('.event-card').forEach(card => card.remove());

    lessons.forEach((lessonData, index) => {
        const lesson = new Lesson(lessonData);
        const dayIdx = dayToIndex[lesson.dayOfWeek];
        const startDecimal = timeToDecimal(lesson.startTime);
        const endDecimal = timeToDecimal(lesson.endTime);

        const startHour = Math.floor(startDecimal);
        const targetCell = document.querySelector(`.day-cell[data-day="${dayIdx}"][data-hour="${startHour}"]`);

        if (targetCell) {
            const duration = endDecimal - startDecimal;
            const topOffset = (startDecimal - startHour) * HOUR_HEIGHT;
            const cardHeight = duration * HOUR_HEIGHT;

            const card = document.createElement('div');
            card.className = `event-card ${getEventColor(lesson.subjectName)}`;
            card.draggable = true;
            card.dataset.index = index;

            card.style.top = `${topOffset}px`;
            card.style.height = `${cardHeight}px`;

            let locationText = lesson.classroomNumber || "-";
            if (lesson.classroomNumber === "Онлайн") {
                lesson.auditoryLocation = null;
            }
            card.innerHTML = `
                <span class="time">${lesson.getTimeRange()}</span>
                <span class="title">${lesson.subjectName || '-'}</span>
                <span class="location">Ауд. ${lesson.classroomNumber || "-"} ${lesson.auditoryLocation || '-'}</span>
                <span class="teacher">${lesson.teacherName || '-'}</span>
            `;

            card.addEventListener('click', () => {
                modalManager.open(lesson);
            });

            targetCell.appendChild(card);
        }
    });
}

displayWeekForDate(new Date());