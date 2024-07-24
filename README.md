# @westbrookdaniel/form

A form library for handling form validation and submission.

## Installation

```sh
npm install @westbrookdaniel/form
```

## Usage

### Basic Example

Here's a basic example of how to use the form library:

```typescript
import { Form } from "@westbrookdaniel/form";

interface UserFormData {
  name: string | null;
  email: string;
  password: string;
}

const form = new Form<UserFormData>({
  fields: {
    name: [
      (form) => form.name === "" && (form.name = null),
      () => new Promise((r) => setTimeout(r, 1000)),
    ],
    email: [
      ({ email }) => (email.trim() ? null : "Required"),
      ({ email }) =>
        /^[^@]+@[^@]+\.[^@]+$/g.test(email) ? null : "Invalid email",
    ],
    password: [
      ({ password }) => (password.trim() ? null : "Required"),
      ({ password }) => (password.length > 8 ? null : "> 8 characters"),
    ],
  },
  form: [
    // Validate the password doesn't include the name
    ({ password, name }) =>
      name && password.includes(name)
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

// ...

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

### API

#### `Form`

The `Form` class provides tools for validation and submission of forms.

##### Constructor

```typescript
new Form<TFormData>({ fields, loose, form, defaultMessage }: Options<TFormData>)
```

- `fields`: The fields and their validators.
- `loose`: Whether to use loose validation. Loose validation preserves unvalidated fields.
- `form`: The form-level validators.
- `defaultMessage`: A function that returns the default error message for a field.

##### Methods

###### `validate`

```typescript
async validate(data: unknown): Promise<void>
```

Validates the form data.

###### `hasErrors`

```typescript
hasErrors(field?: keyof TFormData): boolean
```

Checks if there are any errors in the form or a specific field.

###### `handle`

```typescript
handle<T = void>(fn: FormHandler<TFormData, T>): (e: SubmitEvent) => Promise<T>
```

Handles the form submission.

###### `assert`

```typescript
assert(): TFormData
```

Asserts that the form is valid and returns the form data.

###### `reset`

```typescript
reset(): void
```

Resets the form state.

###### `static data`

```typescript
static data(e: SubmitEvent): Record<string, any>
```

Extracts form data from a submit event.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## Author

Daniel Westbrook
