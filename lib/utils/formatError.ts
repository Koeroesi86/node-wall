// Logs only the message and stack of an error, never the raw object (it may carry addresses or mail contents).
export default (error: unknown) => error instanceof Error ? (error.stack ?? error.message) : String(error);
