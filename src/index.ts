export type Validator<TFormData> = (
  data: Partial<TFormData>
) =>
  | Promise<string | null | undefined | boolean>
  | string
  | null
  | undefined
  | boolean;

export type Fields<TFormData> = Partial<{
  [K in keyof TFormData]: Validator<TFormData>[];
}>;

export type Options<TFormData> = {
  fields: Fields<TFormData>;
  loose?: boolean;
  form?: Validator<TFormData>[];
  defaultMessage?: (field: keyof TFormData) => string;
};

export type FormHandler<TFormData, T> = (
  formData: TFormData,
  formElement: HTMLFormElement,
  e: SubmitEvent
) => Promise<T>;

export type FieldErrors<TFormData> = Partial<Record<keyof TFormData, string>>;

/**
 * A form utility that provides tools for validation and submission of forms.
 *
 * @param {Object} options
 * @param {Fields<TFormData>} options.fields - The fields and their validators.
 * @param {Validator<TFormData>[]} [options.form] - The form-level validators.
 * @param {boolean} [options.loose] - Whether to use loose validation. Loose validation preserves unvalidated fields.
 *
 * @example
 *
 * interface UserFormData {
 *   name: string | null;
 *   email: string;
 *   password: string;
 * }
 *
 * const form = new Form<UserFormData>({
 *   fields: {
 *     name: [
 *       // These typeof checks are not necessary most real forms, but they are
 *       // here to guard against invalid data types being passed to the form
 *       ({ name }) => typeof name !== "string",
 *       (form) => form.name === "" && (form.name = null),
 *       () => new Promise((r) => setTimeout(r, 1)),
 *     ],
 *     email: [
 *       ({ email }) => typeof email !== "string",
 *       ({ email }) => (email?.trim() ? null : "Required"),
 *       ({ email }) =>
 *         /^[^@]+@[^@]+\.[^@]+$/g.test(email ?? "") ? null : "Invalid email",
 *     ],
 *     password: [
 *       ({ password }) => typeof password !== "string",
 *       ({ password }) => (password?.trim() ? null : "Required"),
 *       ({ password }) => (password?.length ?? 0 > 8 ? null : "> 8 characters"),
 *     ],
 *   },
 *   form: [
 *     // Validate the password doesn't include the name
 *     ({ password, name }) =>
 *       name && password?.includes(name)
 *         ? "Password cannot contain your name"
 *         : null,
 *   ],
 * });
 *
 * const submit = form.handle(async (formData, formElement) => {
 *   await form.validate(formData);
 *
 *   if (form.hasErrors()) return;
 *
 *   const data = form.assert();
 *
 *   formElement.reset();
 *
 *   console.log(data);
 * });
 *
 * // ...
 *
 * <form onSubmit={submit} noValidate>
 *   <label>
 *     Email
 *     <input name="email" type="email" />
 *     <span className="error">
 *       {form.fieldErrors.email}
 *     </span>
 *   </label>
 *   <label>
 *     Password
 *     <input name="password" type="password" />
 *     <span className="error">
 *       {form.fieldErrors.password}
 *     </span>
 *   </label>
 *   {form.submitting ? (
 *     <button disabled>Submitting...</button>
 *   ) : (
 *     <button>Submit</button>
 *   )}
 * </form>;
 *
 */
export class Form<TFormData extends Record<string, any>> {
  private fields: Fields<TFormData>;
  private loose: boolean;
  private formValidators: Validator<TFormData>[];

  fieldErrors: FieldErrors<TFormData> = {};
  submitting = false;
  data: Partial<TFormData> = {};
  formError: string | null = null;
  isValid = false;
  defaultMessage: (field: keyof TFormData) => string;

  private lastValidateController: AbortController | null = null;

  constructor({ fields, loose, form, defaultMessage }: Options<TFormData>) {
    this.fields = fields;
    this.loose = loose ?? false;
    this.formValidators = form ?? [];
    this.defaultMessage = defaultMessage ?? (() => "Required");
  }

  async validate(data: unknown): Promise<void> {
    // Cancel any pending validation
    if (this.lastValidateController) {
      this.lastValidateController.abort();
    }

    // Create a new AbortController for this validation
    this.lastValidateController = new AbortController();
    const signal = this.lastValidateController.signal;

    this.reset();
    const d = structuredClone(data) as TFormData;

    // quick check data is an object
    if (typeof d !== "object" || d === null) {
      throw new Error("Data is not an object");
    }

    // field-level validation
    for (const field in this.fields) {
      const validators = this.fields[field];
      if (!validators) continue;
      for (const v of validators) {
        if (signal.aborted) return; // Check if validation has been cancelled
        try {
          const error = await v(d);
          if (error) {
            if (error === true) {
              this.fieldErrors[field] = this.defaultMessage(field);
            } else {
              this.fieldErrors[field] = error;
            }
            break;
          }
        } catch (e) {
          console.error(e);
          this.fieldErrors[field] = this.defaultMessage(field);
          break;
        }
      }
      if (!this.hasErrors(field)) {
        this.data[field] = (d as TFormData)[field];
      }
    }

    if (signal.aborted) return; // Double check if validation has been cancelled

    // form-level validation
    for (const validator of this.formValidators) {
      try {
        const error = await validator(d);
        if (error) {
          if (error === true) {
            throw new Error("Validation failed");
          } else {
            this.formError = error;
          }
          break;
        }
      } catch (e) {
        console.error(e);
        this.formError = "Failed to validate form";
        break;
      }
    }

    // If the 'loose' option is enabled, merge the validated data
    // with the original data so unvalidated fields are preserved
    if (this.loose) {
      const d = structuredClone(data) as TFormData;
      Object.assign(d, this.data);
      this.data = d;
    }

    if (!this.hasErrors()) this.isValid = true;

    this.lastValidateController = null; // Clear the AbortController reference
  }

  hasErrors(field?: keyof TFormData): boolean {
    if (field) return !!this.fieldErrors[field];
    return Object.keys(this.fieldErrors).length > 0 || !!this.formError;
  }

  handle<T = void>(
    fn: FormHandler<TFormData, T>
  ): (e: SubmitEvent) => Promise<T> {
    return async (e: SubmitEvent) => {
      this.submitting = true;
      e.preventDefault();
      const data = Form.data(e) as TFormData;
      const o = await fn(data, e.target as HTMLFormElement, e);
      this.submitting = false;
      return o;
    };
  }

  assert(): TFormData {
    if (!this.isValid) {
      throw new Error("Form has not been validated yet");
    }
    // This is more of a just in case, doesn't make sense
    // for this assert to pass if there are any form errors
    if (this.hasErrors() || this.formError) {
      throw new Error("Form has errors and cannot be submitted");
    }
    return this.data as TFormData;
  }

  reset(): void {
    this.fieldErrors = {};
    this.submitting = false;
    this.data = {};
    this.formError = null;
    this.isValid = false;
  }

  static data(e: SubmitEvent): Record<string, any> {
    return Object.fromEntries(new FormData(e.target as HTMLFormElement));
  }
}
