import { test, expect, mock, afterEach } from "bun:test";
import { Form } from "./index";
import { z } from "zod";
import { zodAdaptor } from "./adaptors/zod";

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

afterEach(() => {
  form.reset();
});

test("validate should set field errors correctly", async () => {
  const data = { name: "John", email: "invalid-email", password: "short" };
  await form.validate(data);
  expect(form.fieldErrors.email).toBe("Invalid email");
  expect(form.fieldErrors.password).toBe("> 8 characters");
});

test("validate should set form error correctly", async () => {
  const data = {
    name: "John",
    email: "john@example.com",
    password: "John12345",
  };
  await form.validate(data);
  expect(form.formError).toBe("Password cannot contain your name");
});

test("validate should set isValid to true if no errors", async () => {
  const data = {
    name: "John",
    email: "john@example.com",
    password: "securepassword",
  };
  await form.validate(data);
  expect(form.isValid).toBe(true);
});

test("hasErrors should return true if there are field errors", async () => {
  const data = { name: "John", email: "invalid-email", password: "short" };
  await form.validate(data);
  expect(form.hasErrors()).toBe(true);
});

test("hasErrors should return false if there are no errors", async () => {
  const data = {
    name: "John",
    email: "john@example.com",
    password: "securepassword",
  };
  await form.validate(data);
  expect(form.hasErrors()).toBe(false);
});

test("assert should throw an error if form is not valid", () => {
  expect(() => form.assert()).toThrow("Form has not been validated yet");
});

test("assert should return form data if form is valid", async () => {
  const data = {
    name: "John",
    email: "john@example.com",
    password: "securepassword",
  };
  await form.validate(data);
  expect(form.assert()).toEqual(data);
});

test("handle should call the provided function with form data", async () => {
  const mockFn = mock();
  const target = {};
  const submitHandler = form.handle(mockFn);
  const event = {
    preventDefault: mock(),
    target,
  } as unknown as SubmitEvent;
  await submitHandler(event);
  expect(mockFn).toHaveBeenCalledWith(
    expect.any(Object),
    target, // HTMLFormElement
    event
  );
});

test("reset should clear all form state", async () => {
  const data = {
    name: "John",
    email: "whoops",
    password: "securepassword",
  };
  await form.validate(data);
  expect(form.fieldErrors).not.toEqual({});
  expect(form.submitting).toBe(false);
  expect(form.data).not.toEqual({});
  expect(form.formError).toBe(null);
  expect(form.isValid).toBe(false);
  form.reset();
  expect(form.fieldErrors).toEqual({});
  expect(form.submitting).toBe(false);
  expect(form.data).toEqual({});
  expect(form.formError).toBe(null);
  expect(form.isValid).toBe(false);
});

test("validate should handle empty input correctly", async () => {
  const data = { name: "", email: "", password: "" };
  await form.validate(data);
  expect(form.fieldErrors.email).toBe("Required");
  expect(form.fieldErrors.password).toBe("Required");
  expect(form.isValid).toBe(false);
});

test("validate should handle null values correctly", async () => {
  const data = {
    name: null,
    email: null,
    password: null,
  } as unknown as UserFormData;
  await form.validate(data);
  expect(form.fieldErrors.email).toBe("Required");
  expect(form.fieldErrors.password).toBe("Required");
  expect(form.isValid).toBe(false);
});

test("validate should handle extremely long input", async () => {
  const longString = "a".repeat(1000000);
  const longString2 = "b".repeat(1000000);
  const data = {
    name: longString,
    email: `${longString}@example.com`,
    password: longString2,
  };
  await form.validate(data);
  expect(form.isValid).toBe(true);
});

test("validate should handle concurrent validations", async () => {
  const concurrentForm = new Form<UserFormData>({
    fields: {
      name: [
        ({ name }) => typeof name !== "string",
        (form) => form.name === "" && (form.name = null),
        () => new Promise((r) => setTimeout(r, 500)),
      ],
    },
  });

  const validations = [
    concurrentForm.validate({
      name: "John",
    }),
    new Promise<void>((resolve) =>
      setTimeout(
        () =>
          resolve(
            concurrentForm.validate({
              name: "Jane",
            })
          ),
        100
      )
    ),
    new Promise<void>((resolve) =>
      setTimeout(() => resolve(concurrentForm.validate({})), 200)
    ),
  ];

  await Promise.all(validations);

  // The last validation should be the one that sets the final state
  expect(concurrentForm.fieldErrors.name).toBe("Required");
  expect(concurrentForm.isValid).toBe(false);
});

test("validate should use default message for required fields", async () => {
  const data = { name: "", email: "", password: "" };
  await form.validate(data);
  // By default fields aren't required, so this should be undefined
  // since it won't hit default validation since it doesn't have the typeof check
  expect(form.fieldErrors.name).toBeUndefined();
  expect(form.fieldErrors.email).toBe("Required");
  expect(form.fieldErrors.password).toBe("Required");
  expect(form.isValid).toBe(false);
});

test("validate should use custom default message for required fields", async () => {
  const customForm = new Form<UserFormData>({
    fields: {
      name: [({ name }) => !name && true],
      email: [({ email }) => !email && true],
      password: [({ password }) => !password && true],
    },
    defaultMessage: (field) => `${field} is mandatory`,
  });

  const data = { name: "", email: "", password: "" };
  await customForm.validate(data);
  expect(customForm.fieldErrors.name).toBe("name is mandatory");
  expect(customForm.fieldErrors.email).toBe("email is mandatory");
  expect(customForm.fieldErrors.password).toBe("password is mandatory");
  expect(customForm.isValid).toBe(false);
});

test("validate should not expand dot notation in field names", async () => {
  const dotNotationForm = new Form({
    fields: {
      "user.name": [({ "user.name": name }) => !name && "Required"],
      "user.email": [({ "user.email": email }) => !email && "Required"],
      "user.password": [
        ({ "user.password": password }) => !password && "Required",
      ],
    },
  });

  const data = { "user.name": "", "user.email": "", "user.password": "" };
  await dotNotationForm.validate(data);
  expect(dotNotationForm.fieldErrors["user.name"]).toBe("Required");
  expect(dotNotationForm.fieldErrors["user.email"]).toBe("Required");
  expect(dotNotationForm.fieldErrors["user.password"]).toBe("Required");
  expect(dotNotationForm.isValid).toBe(false);
});

test("subscribe should notify subscribers on field change", async () => {
  const mockCallback = mock();
  const unsubscribe = form.subscribe("data", mockCallback);

  const data = {
    name: "John",
    email: "john@example.com",
    password: "password123",
  };
  await form.validate(data);
  form.assert(); // Ensure form is valid

  expect(form.data.email).toBe("john@example.com");
  expect(mockCallback).toBeCalledTimes(1);

  unsubscribe();
});

test("unsubscribe should stop notifying subscribers", async () => {
  const mockCallback = mock();
  const unsubscribe = form.subscribe("data", mockCallback);

  unsubscribe();

  const data = {
    name: "John",
    email: "john@example.com",
    password: "password123",
  };
  await form.validate(data);

  expect(mockCallback).not.toHaveBeenCalled();
});

test("subscribe should notify subscribers on fieldErrors change", async () => {
  const mockCallback = mock();
  const unsubscribe = form.subscribe("fieldErrors", mockCallback);

  const data = {
    email: "",
    password: "",
  };
  await form.validate(data);

  expect(form.fieldErrors.name).toBe("Required");
  expect(mockCallback).toBeCalledTimes(1);

  unsubscribe();
});

test("subscribe should notify subscribers on submitting change", async () => {
  const mockCallback = mock();
  const unsubscribe = form.subscribe("submitting", mockCallback);

  const data = {
    name: "John",
    email: "john@example.com",
    password: "password123",
  };

  await form.handle(async () => {
    await form.validate(data);
  })({ preventDefault: () => {} } as SubmitEvent);

  expect(mockCallback).toBeCalledTimes(2); // Called once for true and once for false
  expect(mockCallback).nthCalledWith(1, true);
  expect(mockCallback).nthCalledWith(2, false);

  unsubscribe();
});

test("subscribe should notify subscribers on formError change", async () => {
  const mockCallback = mock();
  const unsubscribe = form.subscribe("formError", mockCallback);

  const data = {
    name: "John",
    email: "john@example.com",
    password: "John",
  };
  await form.validate(data);

  expect(form.formError).toBe("Password cannot contain your name");
  expect(mockCallback).toBeCalledTimes(1);

  unsubscribe();
});

test("subscribe should notify subscribers on isValid change", async () => {
  const mockCallback = mock();
  const unsubscribe = form.subscribe("isValid", mockCallback);

  const data = {
    name: "John",
    email: "john@example.com",
    password: "password123",
  };
  await form.validate(data);

  expect(form.isValid).toBe(true);
  expect(mockCallback).toBeCalledTimes(1);

  unsubscribe();
});

test("submitting should be false after a thrown validation", async () => {
  const originalConsoleError = console.error;
  console.error = mock();

  const form = new Form({
    fields: {
      email: [
        ({ email }) => {
          if (!email) throw new Error("Email is required");
          return null;
        },
      ],
    },
  });

  const data = {
    email: "",
  };

  // Note that the error also doesn't bubble up
  await form.handle(async () => {
    await form.validate(data);
  })({ preventDefault: () => {} } as SubmitEvent);

  expect(form.submitting).toBe(false);

  console.error = originalConsoleError;
});

test("validate should work with zodAdaptor", async () => {
  const schema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
  });

  const form = new Form({
    adaptor: zodAdaptor({ schema }),
  });

  const data = {
    name: "",
    email: "invalid-email",
    password: "123",
  };

  await form.validate(data);

  expect(form.fieldErrors.name).toBe("Name is required");
  expect(form.fieldErrors.email).toBe("Invalid email address");
  expect(form.fieldErrors.password).toBe(
    "Password must be at least 6 characters long"
  );
  expect(form.isValid).toBe(false);
});
