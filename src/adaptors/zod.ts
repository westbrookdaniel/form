import type { z } from "zod";
import type { Adaptor } from "..";

export type ZodAdaptorOptions<TFormData> = {
  schema: z.ZodType<TFormData>;
};

export const zodAdaptor = <TFormData>({
  schema,
}: ZodAdaptorOptions<TFormData>): Adaptor<TFormData> => {
  return {
    validate: async (data: unknown) => {
      const result = await schema.safeParseAsync(data);

      if (result.success) {
        return {
          fieldErrors: {},
          data: result.data,
          formError: null,
        };
      } else {
        const fieldErrors: Partial<Record<keyof TFormData, string>> = {};
        let formError: string | null = null;

        result.error.issues.forEach((issue) => {
          if (issue.path.length > 0) {
            const field = issue.path[0] as keyof TFormData;
            fieldErrors[field] = issue.message;
          } else {
            formError = issue.message;
          }
        });

        return {
          fieldErrors,
          data: {},
          formError,
        };
      }
    },
  };
};
