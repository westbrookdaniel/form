import type { Adaptor, FieldErrors, Fields, Validator } from "..";

export type StandardAdaptorOptions<TFormData> = {
  fields?: Fields<TFormData>;
  loose?: boolean;
  form?: Validator<TFormData>[];
  defaultMessage?: (field: keyof TFormData) => string;
};

export const standardAdaptor = <TFormData>({
  defaultMessage = () => "Required",
  fields = {},
  form = [],
  loose = false,
}: StandardAdaptorOptions<TFormData>): Adaptor<TFormData> => {
  return {
    validate: async (data: unknown) => {
      const state = {
        fieldErrors: {} as FieldErrors<TFormData>,
        data: {} as Partial<TFormData>,
        formError: null as string | null,
      };

      const d = structuredClone(data) as TFormData;

      // quick check data is an object
      if (typeof d !== "object" || d === null) {
        throw new Error("Data is not an object");
      }

      // field-level validation
      for (const field in fields) {
        const validators = fields[field];
        if (!validators) continue;
        for (const v of validators) {
          try {
            const error = await v(d);
            if (error) {
              if (error === true) {
                state.fieldErrors[field] = defaultMessage(field);
              } else {
                state.fieldErrors[field] = error;
              }
              break;
            }
          } catch (e) {
            console.error(e);
            state.fieldErrors[field] = defaultMessage(field);
            break;
          }
        }
        if (!state.fieldErrors[field]) {
          state.data[field] = (d as TFormData)[field];
        }
      }

      // form-level validation
      for (const validator of form) {
        try {
          const error = await validator(d);
          if (error) {
            if (error === true) {
              throw new Error("Validation failed");
            } else {
              state.formError = error;
            }
            break;
          }
        } catch (e) {
          console.error(e);
          state.formError = "Failed to validate form";
          break;
        }
      }

      // If the 'loose' option is enabled, merge the validated data
      // with the original data so unvalidated fields are preserved
      if (loose) {
        const d = structuredClone(data) as TFormData;
        Object.assign(d as any, state.data);
        state.data = d;
        form;
      }

      return state;
    },
  };
};
