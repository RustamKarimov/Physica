import { useEffect, useRef } from "react";
import { MathfieldElement } from "mathlive";
import "mathlive/fonts.css";

interface MathLiveEditorProps {
  readonly value: string;
  readonly labelledBy: string;
  readonly describedBy: string;
  readonly onInput: (value: string) => void;
}

export function MathLiveEditor({
  value,
  labelledBy,
  describedBy,
  onInput,
}: MathLiveEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const field = useRef<MathfieldElement | null>(null);
  const initialValue = useRef(value);
  const onInputRef = useRef(onInput);

  useEffect(() => {
    onInputRef.current = onInput;
  }, [onInput]);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    const mathfield = new MathfieldElement();
    mathfield.value = initialValue.current;
    mathfield.smartFence = true;
    mathfield.mathVirtualKeyboardPolicy = "auto";
    mathfield.setAttribute("aria-labelledby", labelledBy);
    mathfield.setAttribute("aria-describedby", describedBy);
    mathfield.setAttribute("data-physica-input", "equation-v1");
    const handleInput = () => onInputRef.current(mathfield.value);
    mathfield.addEventListener("input", handleInput);
    container.append(mathfield);
    field.current = mathfield;
    return () => {
      mathfield.removeEventListener("input", handleInput);
      mathfield.remove();
      field.current = null;
    };
  }, [describedBy, labelledBy]);

  useEffect(() => {
    if (field.current && field.current.value !== value) {
      field.current.value = value;
    }
  }, [value]);

  return <div className="eq-mathfield-host" ref={host} />;
}
