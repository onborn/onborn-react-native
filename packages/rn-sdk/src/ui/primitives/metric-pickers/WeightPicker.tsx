import { useEffect, useMemo, useState } from "react";
import {
  ReusablePickerPrimitive,
  type ReusablePickerPrimitiveProps,
} from "./ReusablePicker";
import { MetricUnitSwitcher } from "./MetricUnitSwitcher";

export type WeightPickerPrimitiveProps = Omit<
  ReusablePickerPrimitiveProps,
  "sheetAccessory" | "valueSuffix"
> & {
  unit?: "kg" | "lb";
  unitMode?: "kg" | "lb" | "kg_lb";
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
  onUnitChange?: (unit: "kg" | "lb") => void;
};

type WeightUnit = "kg" | "lb";

const LB_PER_KG = 2.20462;

function normalizeUnit(unit: unknown): WeightUnit {
  return unit === "lb" ? "lb" : "kg";
}

function normalizeUnitMode(
  unitMode: WeightPickerPrimitiveProps["unitMode"],
  unit: WeightUnit,
): "kg" | "lb" | "kg_lb" {
  return unitMode === "kg_lb" || unitMode === "lb" || unitMode === "kg"
    ? unitMode
    : unit;
}

function convertWeight(value: number, from: WeightUnit, to: WeightUnit) {
  if (from === to) {
    return value;
  }
  return to === "lb"
    ? Math.round(value * LB_PER_KG)
    : Math.round(value / LB_PER_KG);
}

function resolveWeightRange(unit: WeightUnit, min: number, max: number) {
  if (unit === "kg") {
    return { min, max };
  }
  const sourceLooksLikeKg = max <= 350;
  if (!sourceLooksLikeKg) {
    return { min, max };
  }
  return {
    min: Math.max(0, Math.round(min * LB_PER_KG)),
    max: Math.max(1, Math.round(max * LB_PER_KG)),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function WeightPickerPrimitive({
  min = 0,
  max = 300,
  value = 75,
  unit = "kg",
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
  selectorLabel = "Weight",
  sheetTitle = "Select your weight",
  onChange,
  onUnitChange,
  ...props
}: WeightPickerPrimitiveProps) {
  const configuredUnit = normalizeUnit(unit);
  const mode = normalizeUnitMode(unitMode, configuredUnit);
  const initialUnit = mode === "kg_lb" ? configuredUnit : mode;
  const [activeUnit, setActiveUnit] = useState<WeightUnit>(initialUnit);
  const [pickerValue, setPickerValue] = useState(value);

  useEffect(() => {
    const nextUnit = mode === "kg_lb" ? configuredUnit : mode;
    setActiveUnit(nextUnit);
    setPickerValue(value);
  }, [configuredUnit, mode, value]);

  const range = useMemo(
    () => resolveWeightRange(activeUnit, min, max),
    [activeUnit, max, min],
  );
  const normalizedValue = clamp(pickerValue, range.min, range.max);
  const sheetAccessory =
    mode === "kg_lb" ? (
      <MetricUnitSwitcher
        value={activeUnit}
        units={["kg", "lb"] as const}
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
              convertWeight(currentValue, activeUnit, nextUnit),
              resolveWeightRange(nextUnit, min, max).min,
              resolveWeightRange(nextUnit, min, max).max,
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
