import * as React from "react";
import Form from "react-bootstrap/esm/Form";
import { useEffect, useState } from "react";

export interface TextInputAreaProps {
  setNewValue: (newValue: string) => void;
  startingValue?: string;
  placeholder?: string;
  width: number | string;
  onEnter?: (newValue?: string) => void;
  updateOnlyOnBlur?: boolean;
  autoFocus?: boolean;
  inputFormatter?: (text: TextWithSelection) => TextWithSelection;
  handleKeypress?: (key: string) => string | null;
  forcedText?: string;
  onClick?: () => void;
  isValid?: boolean;
  disabled?: boolean;
  possibleOptions?: string[];
}

export interface TextWithSelection {
  value: string;
  startIndex?: number | null;
  endIndex?: number | null;
}

export const TextInputArea = (props: TextInputAreaProps) => {
  const {
    setNewValue,
    startingValue,
    placeholder,
    width,
    onEnter,
    updateOnlyOnBlur,
    autoFocus,
    inputFormatter,
    handleKeypress,
    forcedText,
    onClick,
    isValid,
    disabled,
    possibleOptions,
  } = props;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(startingValue);
  const [possibleValue, setPossibleValue] = useState<string | null>(null);

  useEffect(() => {
    if (forcedText) {
      setValue(forcedText);
    }
  }, [forcedText]);

  useEffect(() => {
    if (inputRef.current && possibleValue && value) {
      inputRef.current.selectionStart = value.length;
      inputRef.current.selectionEnd = possibleValue.length;
    }
  }, [inputRef, possibleValue, value]);

  function updatePossibleOption(value: string) {
    if (possibleOptions) {
      const possibleOption =
        value !== "" && !!value
          ? possibleOptions.find((x) =>
              x.toLowerCase().startsWith(value.toLowerCase())
            )
          : null;

      setPossibleValue(possibleOption ?? null);
    }
  }

  const onKeypress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const inputControl = e.target as HTMLTextAreaElement;
    const keyPressResult = handleKeypress?.(e.key) ?? null;

    if (keyPressResult !== null) {
      e.preventDefault();

      inputControl.value = keyPressResult;
      return;
    }

    if (e.key === "Backspace") {
      if (possibleValue) {
        e.preventDefault();
        const newValue = value?.slice(0, -1) ?? "";
        setValue(newValue);
        updatePossibleOption(newValue);
      }
    }

    if (e.key === "Escape" || e.key === "Delete") {
      if (possibleValue) {
        e.preventDefault();
        setPossibleValue(null);
      }
    }

    if (e.key === "Enter") {
      e.preventDefault();
      onEnter?.(possibleValue ?? value);
    }
  };

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    updatePossibleOption(e.target.value);

    if (updateOnlyOnBlur === true) {
      setValue(e.target.value);
      return;
    }

    const newValue = inputFormatter?.({
      value: e.target.value,
      startIndex: e.target.selectionStart,
      endIndex: e.target.selectionEnd,
    }) ?? { value: e.target.value };
    setValue(newValue.value);
    setNewValue(newValue.value);
    e.target.value = newValue.value;
    e.target.selectionStart = newValue.startIndex ?? e.target.selectionStart;
    e.target.selectionEnd = newValue.endIndex ?? e.target.selectionEnd;
  }

  function onFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.target.select();
    setPossibleValue(null);
  }

  function onBlur(e: React.FocusEvent<HTMLInputElement>): void {
    const newValue = inputFormatter?.({
      value: e.target.value,
      startIndex: e.target.selectionStart,
      endIndex: e.target.selectionEnd,
    }) ?? { value: e.target.value };

    if (newValue.value !== e.target.value)
      e.target.value = newValue.value ?? "";
    setNewValue(possibleValue ?? newValue.value ?? "");
    setValue(possibleValue ?? newValue.value ?? "");
    setPossibleValue(null);
  }

  const fieldStyle =
    isValid === false
      ? { borderColor: "red", borderWidth: "medium", width: width }
      : { width: width };

  return (
    <>
      <Form onSubmit={(e) => e.preventDefault()}>
        <Form.Control
          type="textarea"
          ref={inputRef}
          value={possibleValue ?? value ?? startingValue ?? ""}
          style={fieldStyle}
          onKeyDown={onKeypress}
          onChange={onChange}
          onBlur={onBlur}
          autoFocus={autoFocus}
          onFocus={onFocus}
          placeholder={placeholder}
          onClick={onClick}
          disabled={disabled}
        />
      </Form>
    </>
  );
};
