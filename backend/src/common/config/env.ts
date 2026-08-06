/**
 * `process.env.X` в TypeScript всегда имеет тип `string | undefined` —
 * даже если мы на 100% уверены, что переменная задана в .env.
 * Эта функция превращает "может быть undefined" в гарантированный
 * `string`, и, что важнее, падает с понятной ошибкой при старте
 * приложения, если обязательная переменная забыта в .env — вместо
 * непонятного сбоя где-то в середине запроса пользователя.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Отсутствует обязательная переменная окружения ${name}. Проверьте файл backend/.env (см. .env.example).`,
    );
  }
  return value;
}
