export type Mode = 'blur' | 'change'

export function getOnSubmit<T>(
  form: HTMLFormElement,
  onSubmit?: (state: T, form: HTMLFormElement) => void
) {
  return (e: Event) => {
    e.preventDefault()
    const state = getFormValues<T>(form)
    if (onSubmit) onSubmit(state, form)
  }
}

export function setHiddenValue(input: HTMLInputElement, value: string) {
  input.value = value
  input.dispatchEvent(new Event('change'))
}

export function getEventNameForMode(field: Element, mode: Mode) {
  const fieldType = field.getAttribute('type')
  let eventName = 'change'

  if (mode === 'change') {
    if (
      field.tagName === 'INPUT' &&
      (!fieldType ||
        fieldType === 'text' ||
        fieldType === 'number' ||
        fieldType === 'email' ||
        fieldType === 'password' ||
        fieldType === 'search' ||
        fieldType === 'tel' ||
        fieldType === 'url')
    ) {
      eventName = 'input'
    }
    if (field.tagName === 'TEXTAREA') {
      eventName = 'input'
    }
  }

  return eventName
}

// TODO: Validation + stripping fields
export function getFormValues<T>(el: HTMLFormElement): T {
  const fields = Array.from<any>(el.elements)
  const values = fields.reduce((acc, field) => {
    const name = field.getAttribute('name')
    if (!name) return acc
    const value =
      field.tagName === 'INPUT' && field.getAttribute('type') === 'checkbox'
        ? field.checked
        : field.value
    // Name can be a path like "user.fullName"
    return set(acc, name.split('.'), value)
  }, {} as T)
  return values
}

function set(obj: any, path: string[], value: any) {
  const last = path.pop()
  if (!last) return obj
  const parent = path.reduce((acc: any, key: any) => {
    if (!acc[key]) acc[key] = {}
    return acc[key]
  }, obj as Record<string, unknown>)
  parent[last] = value
  return obj
}
