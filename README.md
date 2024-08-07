# @westbrookdaniel/form

A framework-agnostic form library that provides tools for validation and submission of forms.

## Installation

```sh
npm install @westbrookdaniel/form
```

## API

### `Form`

The `Form` class provides methods for validating and handling form submissions.

#### Constructor

```ts
constructor({ fields, loose, form, defaultMessage }: Options<TFormData>)
```

- `fields`: An object containing field validators.
- `loose`: A boolean indicating whether to use loose validation.
- `form`: An array of form-level validators.
- `defaultMessage`: A function that returns the default error message for a field.

#### Methods

- `validate(data: unknown): Promise<void>`: Validates the form data.
- `hasErrors(field?: keyof TFormData): boolean`: Checks if there are any errors.
- `handle<T = void>(fn: FormHandler<TFormData, T>): (e: SubmitEvent) => Promise<T>`: Handles form submission.
- `assert(): TFormData`: Asserts that the form is valid and returns the form data.
- `reset(): void`: Resets the form state.
- `subscribe(key: "fieldErrors" | "submitting" | "data" | "formError" | "isValid", callback: (value: any) => void): () => void`: Subscribes to changes in form state.

## Usage

Here's an example of how to use the form library:

```ts
import { Form } from "./index";

interface UserFormData {
  name: string | null;
  email: string;
  password: string;
}

const form = new Form<UserFormData>({
  fields: {
    name: [
      ({ name }) => typeof name !== "string",
      (form) => form.name === "" && (form.name = null),
      () => new Promise((r) => setTimeout(r, 1)),
    ],
    email: [
      ({ email }) => typeof email !== "string",
      ({ email }) => (email?.trim() ? null : "Required"),
      ({ email }) =>
        /^[^@]+@[^@]+\.[^@]+$/g.test(email ?? "") ? null : "Invalid email",
    ],
    password: [
      ({ password }) => typeof password !== "string",
      ({ password }) => (password?.trim() ? null : "Required"),
      ({ password }) => ((password?.length ?? 0) > 8 ? null : "> 8 characters"),
    ],
  },
  form: [
    ({ password, name }) =>
      name && password?.includes(name)
        ? "Password cannot contain your name"
        : null,
  ],
});

const submit = form.handle(async (formData, formElement) => {
  await form.validate(formData);

  if (form.hasErrors()) return;

  const data = form.assert();

  formElement.reset();

  console.log(data);
});

// ... An example using React of how to use this in a form ...

<form onSubmit={submit} noValidate>
  <label>
    Email
    <input name="email" type="email" />
    <span className="error">{form.fieldErrors.email}</span>
  </label>
  <label>
    Password
    <input name="password" type="password" />
    <span className="error">{form.fieldErrors.password}</span>
  </label>
  {form.submitting ? (
    <button disabled>Submitting...</button>
  ) : (
    <button>Submit</button>
  )}
</form>;
```

### Vanilla JS Integration

Here's an example of how to use the form library with vanilla JavaScript:

```ts
import { Form } from "@westbrookdaniel/form";

const form = new Form({
  fields: {
    email: [
      ({ email }) => (email?.trim() ? null : "Required"),
      ({ email }) =>
        /^[^@]+@[^@]+\.[^@]+$/g.test(email ?? "") ? null : "Invalid email",
    ],
    password: [
      ({ password }) => (password?.trim() ? null : "Required"),
      ({ password }) => ((password?.length ?? 0) > 8 ? null : "> 8 characters"),
    ],
  },
});

const emailError = document.getElementById("email-error");
const passwordError = document.getElementById("password-error");
const submitButton = document.getElementById("submit-button");

form.subscribe("fieldErrors", (errors) => {
  emailError.textContent = errors.email || "";
  passwordError.textContent = errors.password || "";
});

form.subscribe("submitting", (submitting) => {
  submitButton.disabled = submitting;
  submitButton.textContent = submitting ? "Submitting..." : "Submit";
});

const handleSubmit = form.handle(async (formData) => {
  await form.validate(formData);

  if (form.hasErrors()) return;

  const data = form.assert();
  console.log(data);
});

document.querySelector("form").addEventListener("submit", handleSubmit);
```

This example demonstrates how to use the `Form` class with vanilla JavaScript, including subscribing to form state changes and handling form submission.

## License

This project is licensed under the MIT License.
