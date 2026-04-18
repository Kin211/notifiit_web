import { Lesson } from "./lesson.js";
import { API_CONFIG } from './config.js';

const BASE_URL = API_CONFIG.BASE_URL;

async function requestSchedule(url, timeoutMs = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url.toString(), { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            let errorText = await response.text().catch(() => '');
            throw new Error(`Ошибка HTTP ${response.status}: ${errorText}`);
        }
        const data = await response.json();
        return data.map(item => new Lesson(item));
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new Error(`Запрос превысил время ожидания (${timeoutMs} мс)`);
        }
        throw err;
    }
}

function toYMD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export async function fetchScheduleByDay(groupId, subgroup, date) {
    const url = new URL(`${BASE_URL}/api/schedule`);
    const dateStr = date instanceof Date ? toYMD(date) : date;

    url.searchParams.append('groupId', groupId.toString());
    url.searchParams.append('subgroup', subgroup.toString());
    url.searchParams.append('specificDate', dateStr);
    return requestSchedule(url);
}

export async function fetchScheduleByPeriod(groupId, subgroup, startDate, endDate) {
    const url = new URL(`${BASE_URL}/api/schedule`);
    const startDateStr = startDate instanceof Date ? toYMD(startDate) : startDate;
    const endDateStr = endDate instanceof Date ? toYMD(endDate) : endDate;

    url.searchParams.append('groupId', groupId.toString());
    url.searchParams.append('subgroup', subgroup.toString());
    url.searchParams.append('startDate', startDateStr);
    url.searchParams.append('endDate', endDateStr);
    return requestSchedule(url);
}