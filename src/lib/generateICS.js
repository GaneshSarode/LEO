/**
 * Formats a JavaScript Date object into iCalendar UTC date string.
 * Format: YYYYMMDDTHHMMSSZ (no dashes, no colons)
 */
function formatICSDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Converts a string into a URL/filename-friendly slug.
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s]+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '') || 'event';
}

/**
 * Folds long lines to comply with the iCalendar spec (max 75 octets per line).
 * Continuation lines start with a single space.
 */
function foldLine(line) {
  const maxLen = 75;
  if (line.length <= maxLen) return line;

  const parts = [];
  parts.push(line.substring(0, maxLen));
  let remaining = line.substring(maxLen);

  while (remaining.length > 0) {
    parts.push(' ' + remaining.substring(0, maxLen - 1));
    remaining = remaining.substring(maxLen - 1);
  }

  return parts.join('\r\n');
}

/**
 * Generates and downloads an .ics calendar file for a given task.
 *
 * @param {Object} task - The task object.
 * @param {string} task.id - Unique identifier for the task.
 * @param {string} task.title - Title of the task (used as event summary).
 * @param {string|number|Date} task.deadline - Deadline date/time for the task.
 * @param {string} task.category - Category label for the task.
 */
export function generateICSFile(task) {
  if (!task || !task.title || !task.deadline) {
    console.error('generateICSFile: task must have title and deadline');
    return;
  }

  const deadlineDate = task.deadline instanceof Date
    ? task.deadline
    : new Date(task.deadline);

  if (isNaN(deadlineDate.getTime())) {
    console.error('generateICSFile: invalid deadline date');
    return;
  }

  const startDate = deadlineDate;
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration
  const now = new Date();

  const uid = (task.id || slugify(task.title) + '-' + Date.now()) + '@leo-app';
  const dtStart = formatICSDate(startDate);
  const dtEnd = formatICSDate(endDate);
  const dtStamp = formatICSDate(now);
  const summary = task.title.replace(/[\\;,]/g, (match) => '\\' + match);
  const description = 'Category: ' + (task.category || 'General');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LEO//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `DTSTAMP:${dtStamp}`,
    `UID:${uid}`,
    foldLine(`SUMMARY:${summary}`),
    foldLine(`DESCRIPTION:${description}`),
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  const icsContent = lines.join('\r\n');

  const blob = new Blob([icsContent], {
    type: 'text/calendar;charset=utf-8',
  });

  const filename = slugify(task.title) + '.ics';

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  // Cleanup after a short delay to ensure the download triggers
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }, 100);
}

/**
 * Generates a Google Calendar event URL for a given task and opens it in a new tab.
 *
 * @param {Object} task - The task object.
 */
export function generateGoogleCalendarLink(task) {
  if (!task || !task.title || !task.deadline) {
    console.error('generateGoogleCalendarLink: task must have title and deadline');
    return;
  }

  const deadlineDate = task.deadline instanceof Date
    ? task.deadline
    : new Date(task.deadline);

  if (isNaN(deadlineDate.getTime())) {
    console.error('generateGoogleCalendarLink: invalid deadline date');
    return;
  }

  const startDate = deadlineDate;
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

  const dtStart = formatICSDate(startDate);
  const dtEnd = formatICSDate(endDate);
  
  const title = encodeURIComponent(task.title);
  const details = encodeURIComponent('Category: ' + (task.category || 'General'));
  
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dtStart}/${dtEnd}&details=${details}`;
  
  window.open(url, '_blank');
}
