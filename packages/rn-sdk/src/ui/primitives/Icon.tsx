import React from "react";
import { Star, type IconWeight } from "phosphor-react-native";
import type { PhosphorIconName, PhosphorIconWeight } from "@onborn/sdk-contracts";
import { useResponsiveScale } from "../responsive";
import { PHOSPHOR_ICONS } from "./phosphorIcons";

export function IconPrimitive(props: {
  name: PhosphorIconName;
  color?: string;
  size?: number;
  weight?: PhosphorIconWeight;
}) {
  const { scaleImage } = useResponsiveScale();
  const IconComponent = PHOSPHOR_ICONS[props.name] ?? Star;
  const size = scaleImage(props.size ?? 32);

  return (
    <IconComponent
      color={props.color ?? "#F3F5F8"}
      size={size}
      weight={(props.weight ?? "duotone") as IconWeight}
    />
  );
}
