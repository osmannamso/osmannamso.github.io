const dateFormEl = document.getElementById('date-form');
const yearEl = document.getElementById('year');
const monthEl = document.getElementById('month');
const dayEl = document.getElementById('day');
const hourEl = document.getElementById('hour');
const minuteEl = document.getElementById('minutes');
const secondEl = document.getElementById('seconds');
const unixEl = document.getElementById('unix-timestamp');

const current = moment();
yearEl.value = current.year();
monthEl.value = current.month() + 1;
dayEl.value = current.day();
hourEl.value = current.hour();
minuteEl.value = current.minute();
secondEl.value = current.second();

const setUnixTimestamp = (year, month, day, hour, minute, second) => {
    const date = moment();
    date.year(year);
    date.month(month);
    date.day(day);
    date.hour(hour);
    date.minute(minute);
    date.second(second);

    unixEl.textContent = date.unix();
}

setUnixTimestamp(current.year(), current.month(), current.day(), current.hour(), current.minute(), current.second());
dateFormEl.addEventListener('submit', (e) => {
    e.preventDefault();

    const year = yearEl.value;
    const month = monthEl.value - 1;
    const day = dayEl.value;
    const hour = hourEl.value;
    const minute = minuteEl.value;
    const second = secondEl.value;
    if (!year || !month || !day || !hour || !minute || !second) {
        return;
    }
    setUnixTimestamp(year, month, day, hour, minute, second);
});
