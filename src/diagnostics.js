const LOG_KEY = "chat-diagnostics";
const listeners = new Set();

function readLogs() {
    try {
        return JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
    } catch {
        return [];
    }
}

function writeLog(level, message, details) {
    const entry = {
        id: `${Date.now()}-${Math.random()}`,
        time: new Date().toISOString(),
        level,
        message: String(message),
        details: details ? String(details) : "",
    };
    const logs = [...readLogs(), entry].slice(-200);
    localStorage.setItem(LOG_KEY, JSON.stringify(logs));
    listeners.forEach((listener) => listener(logs));
    if (level === "error") console.error(`[chat] ${message}`, details || "");
}

export function logInfo(message, details) {
    writeLog("info", message, details);
}

export function logError(message, details) {
    writeLog("error", message, details);
}

export function getLogs() {
    return readLogs();
}

export function clearLogs() {
    localStorage.removeItem(LOG_KEY);
    listeners.forEach((listener) => listener([]));
}

export function subscribeLogs(listener) {
    listeners.add(listener);
    listener(readLogs());
    return () => listeners.delete(listener);
}

export function installGlobalErrorLogging() {
    window.addEventListener("error", (event) => {
        logError(event.message, `${event.filename}:${event.lineno}:${event.colno}`);
    });
    window.addEventListener("unhandledrejection", (event) => {
        logError("Unhandled promise rejection", event.reason?.stack || event.reason);
    });
}
