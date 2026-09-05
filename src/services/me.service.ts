import { selectMe } from '../repositories/users.repo.js';
import { mapMeRow, type MeDto } from '../mappers/me.mapper.js';
import { NotFoundError } from '../errors/AppError.js';

export async function getMe(userId: string): Promise<MeDto> {
  const row = await selectMe(userId);
  if (!row) {
    throw new NotFoundError('USER_NOT_FOUND', 'That user could not be found.');
  }
  return mapMeRow(row);
}
