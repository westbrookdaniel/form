import { test, expect, mock, afterEach } from "bun:test";
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
      ({ email }) => (email.trim() ? null : "Required"),
      ({ email }) =>
        /^[^@]+@[^@]+\.[^@]+$/g.test(email) ? null : "Invalid email",
    ],
    password: [
      ({ password }) => typeof password !== "string",
      ({ password }) => (password.trim() ? null : "Required"),
      ({ password }) => (password.length > 8 ? null : "> 8 characters"),
    ],
  },
  form: [
    ({ password, name }) =>
      name && password.includes(name)
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
  const validations = [
    form.validate({
      name: "John",
      email: "john@example.com",
      password: "password123",
    }),
    form.validate({
      name: "Jane",
      email: "jane@example.com",
      password: "janepwd",
    }),
    form.validate({ name: "Bob", email: "bob@invalid", password: "bob" }),
  ];

  await Promise.all(validations);

  // The last validation should be the one that sets the final state
  expect(form.fieldErrors.email).toBe("Invalid email");
  expect(form.fieldErrors.password).toBe("> 8 characters");
  expect(form.isValid).toBe(false);
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
