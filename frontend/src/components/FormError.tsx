import { ApiError } from '../api/client';
export function getFormError(error: unknown) {
  return error instanceof Error ? error.message : 'Неизвестная ошибка';
}
export function getFieldError(
  error: unknown,
  field: string
): string | undefined {
  if (!(error instanceof ApiError)) {
    return undefined;
  }

  return error.body.error.details?.find(
    (item) => item.field === field
  )?.message;
}
