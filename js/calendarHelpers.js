export const SLOT_MINUTES = 10;
export const SLOT_HEIGHT = 14;
export const START_HOUR = 8;
export const END_HOUR = 23;
export const TOTAL_SLOTS = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;
export const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
export const dayToIndex = {
    Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6
};
export const indexToEnglishDay = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function getMonday(date) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const currentDay = targetDate.getDay();
    const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
    targetDate.setDate(targetDate.getDate() - diffToMonday);
    return targetDate;
}

export function getDateForDayIndex(currentMondayDate, dayIndex) {
    const date = new Date(currentMondayDate);
    date.setDate(currentMondayDate.getDate() + dayIndex);
    return date;
}

export function toYMD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function formatDateTime(date) {
    return `${toYMD(date)}T00:00:00`;
}

export function timeToDecimal(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + (minutes / 60);
}

export function decimalToTime(decimal) {
    const normalizedDecimal = Math.max(0, decimal);
    const hours = Math.floor(normalizedDecimal);
    const minutes = Math.round((normalizedDecimal - hours) * 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function getSlotIndex(decimalTime) {
    const minutesFromStart = (decimalTime - START_HOUR) * 60;
    const slotIndex = Math.floor(minutesFromStart / SLOT_MINUTES);
    return Math.min(Math.max(slotIndex, 0), TOTAL_SLOTS - 1);
}

export function getSlotStartDecimal(slotIndex) {
    return START_HOUR + ((slotIndex * SLOT_MINUTES) / 60);
}

export function getEventColor(subjectName) {
    const name = subjectName.toLowerCase();
    if (name.includes('мат') || name.includes('маш')) return 'blue';
    if (name.includes('физ') || name.includes('ист') || name.includes('пуб')) return 'orange';
    return 'green';
}

export function hasUsableLocalLessons(lessons) {
    return Array.isArray(lessons) && lessons.length > 0;
}

export function sortLessons(lessons) {
    return [...lessons].sort((left, right) => {
        const leftDay = dayToIndex[left.dayOfWeek] ?? 0;
        const rightDay = dayToIndex[right.dayOfWeek] ?? 0;
        if (leftDay !== rightDay) {
            return leftDay - rightDay;
        }
        return timeToDecimal(left.startTime) - timeToDecimal(right.startTime);
    });
}

export function recalculatePairNumbers(lessons) {
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