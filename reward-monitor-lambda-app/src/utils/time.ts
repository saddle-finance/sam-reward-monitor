/**
 * Returns the timestamp of the current UTC day
 * @returns {number} timestamp of the current UTC day
 */
export const getUTCDayTimestamp = (): number => {
    const now = new Date();
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
};

export enum TimeInSeconds {
    Day = 86400,
    Week = 604800,
    Month = 2592000,
}
