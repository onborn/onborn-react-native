import {
  ReusablePickerPrimitive,
  type ReusablePickerPrimitiveProps,
} from "./ReusablePicker";

export type AgePickerPrimitiveProps = ReusablePickerPrimitiveProps;

export function AgePickerPrimitive({
  min = 0,
  max = 120,
  value,
  valueSuffix = "years",
  selectorLabel = "Age",
  sheetTitle = "Select your age",
  ...props
}: AgePickerPrimitiveProps) {
  return (
    <ReusablePickerPrimitive
      {...props}
      min={min}
      max={max}
      value={value}
      valueSuffix={valueSuffix}
      selectorLabel={selectorLabel}
      sheetTitle={sheetTitle}
    />
  );
}
