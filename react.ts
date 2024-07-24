import { RefObject, useCallback, useEffect, useRef, useState } from 'react'
import {
  Mode,
  getEventNameForMode,
  getFormValues,
  getOnSubmit,
  setHiddenValue,
} from './mod.ts'

export type UseFormOptions<T> = {
  onSubmit?: (state: T, form: HTMLFormElement) => void
}

export type Form = RefObject<HTMLFormElement>

export function useForm<T>(opts?: UseFormOptions<T>): Form {
  const form = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const el = form.current
    if (!el) return
    const onSubmit = getOnSubmit<T>(el, opts?.onSubmit)
    el.addEventListener('submit', onSubmit)
    return () => {
      el?.removeEventListener('submit', onSubmit)
    }
  }, [form, opts])

  return form
}

export function useInput() {
  const ref = useRef<HTMLInputElement>(null)

  const setValue = useCallback((value: string) => {
    if (ref.current) setHiddenValue(ref.current, value)
  }, [])

  return [ref, setValue] as const
}

export type UseFormValuesOptions<T> = {
  mode?: Mode
  initialValue?: T
}

export function useFormValues<T>(form: Form, opts?: UseFormValuesOptions<T>) {
  const mode = opts?.mode || 'change'
  const initialValue = opts?.initialValue || ({} as T)

  const [state, setState] = useState<T>(initialValue)

  // Initial load
  useEffect(() => {
    if (!form.current) return
    setState(getFormValues(form.current))
  }, [form])

  // Subcribe to changes
  useEffect(() => {
    const el = form.current
    if (!el) return
    const onChange = () => {
      setState(getFormValues(el))
    }
    const fields = Array.from<Element>(el.elements)
    fields.forEach((field) => {
      field.addEventListener(getEventNameForMode(field, mode), onChange)
    })
    return () => {
      fields.forEach((field) => {
        field.removeEventListener(getEventNameForMode(field, mode), onChange)
      })
    }
  }, [mode, form])

  return state
}
