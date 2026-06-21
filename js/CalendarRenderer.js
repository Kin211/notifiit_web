import {
    TOTAL_SLOTS, SLOT_MINUTES, START_HOUR, DAY_NAMES, decimalToTime, SLOT_HEIGHT
} from './calendarHelpers.js';
import { getGlobalBuffer } from './storage.js';

export class CalendarRenderer {
    static buildGrid() {
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

    static setupMobileDayPicker() {
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

    static updateHeader(weekDays, monthNames) {
        document.querySelectorAll('.day-header').forEach((header, index) => {
            const dayNumberSpan = header.querySelector('.day-number');
            if (dayNumberSpan) dayNumberSpan.textContent = weekDays[index].getDate();
        });

        document.querySelectorAll('.day-btn span').forEach((span, index) => {
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
        if (dateNavSpan) dateNavSpan.textContent = dateText;

        const calendarTitle = document.querySelector('.calendar-controls h2');
        if (calendarTitle) calendarTitle.textContent = titleText;
    }

    static updateDayOptions(weekDays) {
        const daySelect = document.getElementById('lessonDay');
        daySelect.innerHTML = weekDays
            .map((day, index) => `<option value="${index}">${DAY_NAMES[index]} ${day.getDate()}</option>`)
            .join('');
    }

    static showSkeletons() {
        this.hideSkeletons();
        const skeletonSlots = [{day: 0, slot: 6}, {day: 1, slot: 18}, {day: 2, slot: 30}];

        skeletonSlots.forEach(({day, slot}) => {
            const cell = document.querySelector(`.day-cell[data-day="${day}"][data-slot="${slot}"]`);
            if (cell) {
                const skeleton = document.createElement('div');
                skeleton.className = 'skeleton-card';
                skeleton.style.height = `${SLOT_HEIGHT * 9}px`;
                cell.appendChild(skeleton);
            }
        });
    }

    static hideSkeletons() {
        document.querySelectorAll('.skeleton-card').forEach(card => card.remove());
    }

    static syncBufferVisibility(groupId, isDragging) {
        const bufferSection = document.querySelector('.mobile-buffer-section');
        if (!bufferSection) return;

        const bufferItems = getGlobalBuffer(groupId);
        const shouldShow = bufferItems.length > 0 || isDragging;

        if (shouldShow) {
            bufferSection.classList.add('is-active');
            document.body.classList.add('buffer-open');
        } else {
            bufferSection.classList.remove('is-active');
            document.body.classList.remove('buffer-open');
        }
    }
}