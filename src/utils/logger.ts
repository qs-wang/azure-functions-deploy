import * as winston from "winston";

const winstonLogger = new winston.Logger({
  level: 'debug',
  transports: [
    new (winston.transports.Console)({
      colorize: true
    })
  ]
});

export const createLogger = (fileName: string) => {
  const myLogger = {
    debug: (text: string) => {
      winstonLogger.debug(`[${fileName}] : ${text}`);
    },
    error: (text: string) => {
      winstonLogger.error(`[${fileName}]:${text}`);
    },
    info: (text: string) => {
      winstonLogger.info(`[${fileName}]:${text}`);
    }
  }
  return myLogger;
}
