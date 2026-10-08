type LogArgument = unknown;

export const logger = {
  info(message: string, ...args: LogArgument[]): void {
    console.info(message, ...args);
  },
  warn(message: string, ...args: LogArgument[]): void {
    console.warn(message, ...args);
  },
  error(message: string, ...args: LogArgument[]): void {
    console.error(message, ...args);
  },
  debug(message: string, ...args: LogArgument[]): void {
    console.debug(message, ...args);
  },
};
