"use client";

import { useId } from "react";
import { FieldError } from "react-hook-form";

type InputFieldProps = {
  label: string;
  type?: string;
  register: any;
  name: string;
  defaultValue?: string;
  error?: FieldError;
  hidden?: boolean;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
};

const InputField = ({
  label,
  type = "text",
  register,
  name,
  defaultValue,
  error,
  hidden,
  inputProps,
}: InputFieldProps) => {
  const generatedId = useId();
  const inputId = inputProps?.id ?? `${name}-${generatedId}`;
  const errorId = `${inputId}-error`;
  const hasError = Boolean(error?.message);

  return (
    <div className={hidden ? "hidden" : "flex flex-col gap-2 w-full md:w-1/4"}>
      <label htmlFor={inputId} className="text-xs text-gray-500">
        {label}
      </label>
      <input
        id={inputId}
        type={type}
        {...register(name)}
        className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
        aria-invalid={hasError ? "true" : "false"}
        aria-describedby={hasError ? errorId : undefined}
        {...inputProps}
        defaultValue={defaultValue}
      />
      {error?.message && (
        <p id={errorId} role="alert" className="text-xs text-red-400">
          {error.message.toString()}
        </p>
      )}
    </div>
  );
};

export default InputField;
