import {
  standardAdaptor,
  type StandardAdaptorOptions,
} from "./adaptors/standard";

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

export type Adaptor<TFormData> = {
  validate: (data: unknown) => Promise<{
    fieldErrors: FieldErrors<TFormData>;
    data: Partial<TFormData>;
    formError: string | null;
  }>;
};

export type FormHandler<TFormData> = (
  formData: TFormData,
  formElement: HTMLFormElement,
  e: SubmitEvent
) => Promise<void>;

export type FieldErrors<TFormData> = Partial<Record<keyof TFormData, string>>;

/**
 * A form utility that provides tools for validation and submission of forms.
 *
 * @param {Object} options
 * @param {Fields<TFormData>} options.fields - The fields and their validators.
 * @param {Validator<TFormData>[]} [options.form] - The form-level validators.
 * @param {boolean} [options.loose] - Whether to use loose validation. Loose validation preserves unvalidated fields.
 */
export class Form<TFormData extends Record<string, any>> {
  private subscribers: Record<string, Set<(value: any) => void>> = {};
  private adaptor: Adaptor<TFormData>;

  fieldErrors: FieldErrors<TFormData> = {};
  submitting = false;
  data: Partial<TFormData> = {};
  formError: string | null = null;
  isValid = false;

  private lastValidateController: AbortController | null = null;

  constructor(
    options: StandardAdaptorOptions<TFormData> | { adaptor: Adaptor<TFormData> }
  ) {
    if ("adaptor" in options) {
      this.adaptor = options.adaptor;
    } else {
      this.adaptor = standardAdaptor(options);
    }
  }

  subscribe(
    key: "fieldErrors" | "submitting" | "data" | "formError" | "isValid",
    callback: (value: any) => void
  ): () => void {
    if (
      !["fieldErrors", "submitting", "data", "formError", "isValid"].includes(
        key
      )
    ) {
      throw new Error(
        `Invalid key: ${key}. Valid keys are: fieldErrors, submitting, data, formError, isValid`
      );
    }

    if (!this.subscribers[key]) this.subscribers[key] = new Set();
    this.subscribers[key].add(callback);
    return () => {
      this.subscribers[key]?.delete(callback);
    };
  }

  private notifySubscribers(changedKeys: string[] = []): void {
    changedKeys.forEach((key) => {
      const value = this.getNestedValue(key);
      Object.keys(this.subscribers).forEach((subscriberKey) => {
        if (subscriberKey === key) {
          this.subscribers[subscriberKey].forEach((cb) => cb(value));
        }
      });
    });
  }

  private getNestedValue(key: string): any {
    return key.split(".").reduce((obj, k) => obj && obj[k], this as any);
  }

  async validate(data: unknown): Promise<void> {
    // Cancel any pending validation
    if (this.lastValidateController) {
      this.lastValidateController.abort();
    }

    try {
      // Cancel any pending validation
      if (this.lastValidateController) {
        this.lastValidateController.abort();
      }

      // Create a new AbortController for this validation
      this.lastValidateController = new AbortController();
      const signal = this.lastValidateController.signal;

      this.reset(true);

      const result = await this.adaptor.validate(data);

      if (signal.aborted) return;
      this.lastValidateController = null; // Clear the AbortController reference

      this.fieldErrors = result.fieldErrors;
      this.data = result.data;
      this.formError = result.formError;
      this.isValid = !this.hasErrors();

      this.notifySubscribers(["fieldErrors", "data", "formError", "isValid"]);
    } finally {
      this.lastValidateController = null;
    }
  }

  hasErrors(field?: keyof TFormData): boolean {
    if (field) return !!this.fieldErrors[field];
    return Object.keys(this.fieldErrors).length > 0 || !!this.formError;
  }

  handle(fn: FormHandler<TFormData>): (e: SubmitEvent) => Promise<void> {
    return async (e: SubmitEvent) => {
      try {
        this.submitting = true;
        this.notifySubscribers(["submitting"]);
        e.preventDefault();
        const data = Form.data(e) as TFormData;
        await fn(data, e.target as HTMLFormElement, e);
      } finally {
        this.submitting = false;
        this.notifySubscribers(["submitting"]);
      }
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

  reset(dontNotify?: boolean): void {
    this.fieldErrors = {};
    this.data = {};
    this.formError = null;
    this.isValid = false;
    if (!dontNotify) {
      this.notifySubscribers(["fieldErrors", "data", "formError", "isValid"]);
    }
  }

  static data(e: SubmitEvent): Record<string, any> {
    return Object.fromEntries(new FormData(e.target as HTMLFormElement));
  }
}
