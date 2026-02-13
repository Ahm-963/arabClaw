/**
 * Shared Cron matching utility
 */

// Simple Cron Matcher
// Supports: * * * * * (Minute Hour Day Month DayOfWeek)
export function isCronMatch(schedule: string, date: Date): boolean {
    const parts = schedule.trim().split(/\s+/)
    if (parts.length !== 5) return false

    const [minute, hour, day, month, dayOfWeek] = parts

    const match = (value: number, pattern: string): boolean => {
        if (pattern === '*') return true
        if (pattern.includes(',')) return pattern.split(',').some(p => match(value, p))
        if (pattern.includes('/')) {
            const [base, step] = pattern.split('/')
            return (value % parseInt(step)) === 0
        }
        return parseInt(pattern) === value
    }

    return (
        match(date.getMinutes(), minute) &&
        match(date.getHours(), hour) &&
        match(date.getDate(), day) &&
        match(date.getMonth() + 1, month) && // Month is 0-indexed in JS
        match(date.getDay(), dayOfWeek)
    )
}
