import dotenv from 'dotenv';
dotenv.config();

import { fetchScheduleByDay, fetchScheduleByPeriod } from "./scheduleService.js";

// для теста
const lessonsByDate = await fetchScheduleByDay(240801, 1, new Date(2026, 3, 13));
const lessonsByPeriod = await fetchScheduleByPeriod(240801, 1,
    new Date(2026, 3, 13),
    new Date(2026, 3, 19));
console.log(lessonsByDate);
console.log(lessonsByPeriod);