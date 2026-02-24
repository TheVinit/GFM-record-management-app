/**
 * Returns a date string in YYYY-MM-DD format based on local time.
 * This avoids timezone shift issues that occur with .toISOString().split('T')[0]
 */
export const getLocalDateString = (date: Date = new Date()): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
