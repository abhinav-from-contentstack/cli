import { v4 as uuidv4 } from 'uuid';
import { configHandler, CLIError, logger } from '@contentstack/utilities';

/**
 * Generate or return an RFC version 4 (random) sessionId
 * If sessionId already stored in config it will return that
 * Mainly used to maintain uniqueness in Analytics
 * @returns {string} a version 4 sessionId
 */
export default function (): string {
  try {
    let sessionId = configHandler.get('sessionId');
    if (!sessionId) {
      sessionId = configHandler.set('sessionId', uuidv4());
    }
    return sessionId;
  } catch (error) {
    logger.debug('sessionId generation error', error);
    throw new CLIError({ message: 'CLI_CORE_FAILED_UUID_GENERATION' });
  }
}
