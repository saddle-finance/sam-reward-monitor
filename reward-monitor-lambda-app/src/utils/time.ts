/**
 * Returns the timestamp of the current UTC day
 * @returns {number} timestamp of the current UTC day
 */
export const getUTCDayTimestamp = (): number => {
    const now = new Date();
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
};
