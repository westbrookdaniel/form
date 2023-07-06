# @westbrookdaniel/form

Framework agnostic uncontrolled form utilities. Available for node and deno (but requires browser APIs).

Framework adapters are only currently available for React and Preact.

## Guide (React)

This libraries React adapter is made up of:

- `useForm` - Accepts an onSubmit callback and returns a ref for the form element.
- `useFormValues` - Accepts a form ref and returns the current form values as state.
- `useInput` - Creates ref to be given to an input element for a given name and provides a setter for its value.

### Example (w/ tailwindcss on @tailwindcss/form example)

```jsx
import {
  // Form is just a shorthand for React.RefObject<HTMLFormElement>
  Form,
  useForm,
  useFormValues,
  useInput,
} from '@westbrookdaniel/form/react'

function Form() {
  /**
   * The `form` needs given to <form /> as a ref
   * any form field with a `name` will be tracked as a part of the form
   *
   * These fields will be transformed into a state object and
   * where nested fields can be represented by dot notation like so:
   *
   * {
   *   "user": {
   *     "fullName": "",
   *     "email": ""
   *   },
   *   "date": "",
   *   "type": "Corporate event",
   *   "details": "",
   *   "subscribe": false,
   *   "manual": "A content editable div's value stored in a hidden input"
   * }
   *
   */
  const form = useForm({
    onSubmit: (state) => {
      console.log('submit', state)
    },
  })

  return (
    <main className="max-w-xl my-8 mx-auto">
      <form ref={form} className="space-y-3">
        <label className="block">
          <span className="text-gray-700">Full name</span>
          <input
            name="user.fullName"
            type="text"
            className="mt-1 block w-full"
            placeholder=""
          />
        </label>
        <label className="block">
          <span className="text-gray-700">Email address</span>
          <input
            name="user.email"
            type="email"
            className="mt-1 block w-full"
            placeholder="john@example.com"
          />
        </label>
        <label className="block">
          <span className="text-gray-700">When is your event?</span>
          <input name="date" type="date" className="mt-1 block w-full" />
        </label>
        <label className="block">
          <span className="text-gray-700">What type of event is it?</span>
          <select name="type" className="block w-full mt-1">
            <option>Corporate event</option>
            <option>Wedding</option>
            <option>Birthday</option>
            <option>Other</option>
          </select>
        </label>
        <label className="block">
          <span className="text-gray-700">Additional details</span>
          <textarea name="details" className="mt-1 block w-full" rows={3} />
        </label>
        <div className="block">
          <div className="mt-2">
            <div>
              <label className="inline-flex items-center">
                <input name="subscribe" type="checkbox" />
                <span className="ml-2">Email me news and special offers</span>
              </label>
            </div>
          </div>
        </div>
        <ManualInput />
        <button className="button" type="submit">
          Submit
        </button>
      </form>
      <Preview form={form} />
    </main>
  )
}

function ManualInput() {
  const defaultValue = "A content editable div's value stored in a hidden input"
  const [ref, setValue] = useInput()
  return (
    <label className="block">
      <input
        defaultValue={defaultValue}
        type="hidden"
        ref={ref}
        name="manual"
      />
      <span className="text-gray-700">Manual</span>
      <div
        className="mt-1 p-2 border border-gray-500"
        contentEditable
        onInput={(e) => {
          setValue(e.currentTarget.textContent?.toString() || '')
        }}
      >
        {defaultValue}
      </div>
    </label>
  )
}

function Preview({ form }: { form: Form }) {
  // This will only cause rerenders within this component
  const values = useFormValues(form, {
    // Second argument is optional and defaults to 'change'
    mode: 'blur',
  })

  return (
    <pre>
      <code>{JSON.stringify(values, null, 2)}</code>
    </pre>
  )
}

export default App
```

## Guide (Preact)

The preact adapter is currently the same as react but using preact/hooks.
