import {
  ReusablePickerPrimitive,
  type ReusablePickerPrimitiveProps,
} from "./ReusablePicker";
import { useEffect, useMemo, useState } from "react";
import { MetricUnitSwitcher } from "./MetricUnitSwitcher";

export type HeightPickerPrimitiveProps = Omit<
  ReusablePickerPrimitiveProps,
  "sheetAccessory" | "valueSuffix"
> & {
  unit?: "cm" | "ft";
  unitMode?: "cm" | "ft" | "cm_ft";
  unitSwitchBg?: string;
  unitSwitchActiveBg?: string;
  unitSwitchTextColor?: string;
  unitSwitchActiveTextColor?: string;
  unitSwitchBorderColor?: string;
  unitSwitchBorderWidth?: number;
  unitSwitchRadius?: number;
  unitSwitchWidth?: number;
  unitSwitchHeight?: number;
  unitSwitchFontSize?: number;
  unitSwitchFontFamily?: string;
  unitSwitchFontWeight?: string;
  onUnitChange?: (unit: "cm" | "ft") => void;
};

type HeightUnit = "cm" | "ft";

const CM_PER_FT = 30.48;

function normalizeUnit(unit: unknown): HeightUnit {
  return unit === "ft" ? "ft" : "cm";
}

function normalizeUnitMode(
  unitMode: HeightPickerPrimitiveProps["unitMode"],
  unit: HeightUnit,
): "cm" | "ft" | "cm_ft" {
  return unitMode === "cm_ft" || unitMode === "ft" || unitMode === "cm"
    ? unitMode
    : unit;
}

function convertHeight(value: number, from: HeightUnit, to: HeightUnit) {
  if (from === to) {
    return value;
  }
  return to === "ft"
    ? Math.round(value / CM_PER_FT)
    : Math.round(value * CM_PER_FT);
}

function resolveHeightRange(unit: HeightUnit, min: number, max: number) {
  if (unit === "cm") {
    return { min, max };
  }
  const sourceLooksLikeCm = max > 20 || min > 20;
  if (!sourceLooksLikeCm) {
    return { min, max };
  }
  return {
    min: Math.max(0, Math.round(min / CM_PER_FT)),
    max: Math.max(1, Math.round(max / CM_PER_FT)),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function HeightPickerPrimitive({
  min = 0,
  max = 250,
  value = 170,
  unit = "cm",
  unitMode,
  unitSwitchBg,
  unitSwitchActiveBg,
  unitSwitchTextColor,
  unitSwitchActiveTextColor,
  unitSwitchBorderColor,
  unitSwitchBorderWidth,
  unitSwitchRadius,
  unitSwitchWidth,
  unitSwitchHeight,
  unitSwitchFontSize,
  unitSwitchFontFamily,
  unitSwitchFontWeight,
  selectorLabel = "Height",
  sheetTitle = "Select your height",
  onChange,
  onUnitChange,
  ...props
}: HeightPickerPrimitiveProps) {
  const configuredUnit = normalizeUnit(unit);
  const mode = normalizeUnitMode(unitMode, configuredUnit);
  const initialUnit = mode === "cm_ft" ? configuredUnit : mode;
  const [activeUnit, setActiveUnit] = useState<HeightUnit>(initialUnit);
  const [pickerValue, setPickerValue] = useState(value);

  useEffect(() => {
    const nextUnit = mode === "cm_ft" ? configuredUnit : mode;
    setActiveUnit(nextUnit);
    setPickerValue(value);
  }, [configuredUnit, mode, value]);

  const range = useMemo(
    () => resolveHeightRange(activeUnit, min, max),
    [activeUnit, max, min],
  );
  const normalizedValue = clamp(
    pickerValue,
    range.min,
    range.max,
  );
  const sheetAccessory =
    mode === "cm_ft" ? (
      <MetricUnitSwitcher
        value={activeUnit}
        units={["cm", "ft"] as const}
        bg={unitSwitchBg}
        activeBg={unitSwitchActiveBg}
        textColor={unitSwitchTextColor}
        activeTextColor={unitSwitchActiveTextColor}
        borderColor={unitSwitchBorderColor}
        borderWidth={unitSwitchBorderWidth}
        radius={unitSwitchRadius}
        width={unitSwitchWidth}
        height={unitSwitchHeight}
        fontSize={unitSwitchFontSize}
        fontFamily={unitSwitchFontFamily ?? props.layoutFontFamily}
        fontWeight={unitSwitchFontWeight}
        onChange={(nextUnit) => {
          setPickerValue((currentValue) =>
            clamp(
              convertHeight(currentValue, activeUnit, nextUnit),
              resolveHeightRange(nextUnit, min, max).min,
              resolveHeightRange(nextUnit, min, max).max,
            ),
          );
          setActiveUnit(nextUnit);
        }}
      />
    ) : undefined;

  return (
    <ReusablePickerPrimitive
      {...props}
      min={range.min}
      max={range.max}
      value={normalizedValue}
      valueSuffix={activeUnit}
      selectorLabel={selectorLabel}
      sheetTitle={sheetTitle}
      sheetAccessory={sheetAccessory}
      onChange={(nextValue) => {
        setPickerValue(nextValue);
        onChange?.(nextValue);
        onUnitChange?.(activeUnit);
      }}
    />
  );
}
