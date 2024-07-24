export type Validator<TFormData> = (
  data: TFormData
) =>
  | Promise<string | null | undefined | false>
  | string
  | null
  | undefined
  | false;

export type Fields<TFormData> = Partial<{
  [K in keyof TFormData]: Validator<TFormData>[];
}>;

export type Options<TFormData> = {
  fields: Fields<TFormData>;
  loose?: boolean;
  form?: Validator<TFormData>[];
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
 *       (form) => form.name === "" && (form.name = null),
 *       () => new Promise((r) => setTimeout(r, 1000)),
 *     ],
 *     email: [
 *       ({ email }) => (email.trim() ? null : "Required"),
 *       ({ email }) =>
 *         /^[^@]+@[^@]+\.[^@]+$/g.test(email) ? null : "Invalid email",
 *     ],
 *     password: [
 *       ({ password }) => (password.trim() ? null : "Required"),
 *       ({ password }) => (password.length > 8 ? null : "> 8 characters"),
 *     ],
 *   },
 *   form: [
 *     // Validate the password doesn't include the name
 *     ({ password, name }) =>
 *       name && password.includes(name)
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

  fieldErrors: FieldErrors<TFormData> = {}; // state
  submitting = false; // state
  data: Partial<TFormData> = {};
  formError: string | null = null; // new state for form-level error
  isValid = false; // new state to track validation

  constructor({ fields, loose, form }: Options<TFormData>) {
    this.fields = fields;
    this.loose = loose ?? false;
    this.formValidators = form ?? [];
  }

  async validate(data: TFormData): Promise<void> {
    // Reset the form state
    this.fieldErrors = {};
    this.data = {};
    this.formError = null;
    this.isValid = false;
    const d = structuredClone(data);

    // field-level validation
    for (const field in this.fields) {
      const validators = this.fields[field];
      if (!validators) continue;
      for (const v of validators) {
        try {
          const error = await v(d);
          if (error) {
            this.fieldErrors[field] = error;
            break;
          }
        } catch (e) {
          console.error(e);
          this.fieldErrors[field] = "Failed to validate";
          break;
        }
      }
      if (!this.hasErrors(field)) {
        this.data[field] = d[field];
      }
    }

    // form-level validation
    for (const validator of this.formValidators) {
      try {
        const error = await validator(d);
        if (error) {
          this.formError = error;
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
      const d = structuredClone(data);
      Object.assign(d, this.data);
      this.data = d as Partial<TFormData>;
    }

    if (!this.hasErrors()) this.isValid = true;
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

  static data(e: SubmitEvent): Record<string, any> {
    return Object.fromEntries(new FormData(e.target as HTMLFormElement));
  }
}
