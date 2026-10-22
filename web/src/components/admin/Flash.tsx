/** Сообщение о результате действия, переданное через ?ok= / ?error=. */
export function Flash({ ok, error }: { ok?: string | string[]; error?: string | string[] }) {
  const okText = Array.isArray(ok) ? ok[0] : ok
  const errorText = Array.isArray(error) ? error[0] : error
  if (errorText) {
    return (
      <div className="alert alert--danger" role="alert">
        <p>{errorText}</p>
      </div>
    )
  }
  if (okText) {
    return (
      <div className="alert alert--success" role="status">
        <p>{okText}</p>
      </div>
    )
  }
  return null
}
