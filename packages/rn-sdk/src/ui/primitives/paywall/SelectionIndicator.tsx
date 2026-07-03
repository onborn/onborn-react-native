import React from "react";
import { Check } from "phosphor-react-native";
import { YStack } from "tamagui";
import type { NormalizedPackageSelectorProps } from "@onborn/sdk-contracts";

export function SelectionIndicator({
  indicator,
  selected,
  color,
}: {
  indicator: NormalizedPackageSelectorProps["selectedIndicator"];
  selected: boolean;
  color: string;
}) {
  if (indicator === "radio") {
    return (
      <YStack
        width={20}
        height={20}
        borderRadius={999}
        borderWidth={2}
        borderColor={selected ? color : "rgba(148, 163, 184, 0.55)"}
        backgroundColor={selected ? color : "transparent"}
        alignItems="center"
        justifyContent="center"
      >
        {selected ? (
          <YStack
            width={8}
            height={8}
            borderRadius={999}
            backgroundColor="#FFFFFF"
          />
        ) : null}
      </YStack>
    );
  }
  if (indicator === "checkbox") {
    return (
      <YStack
        width={20}
        height={20}
        borderRadius={5}
        borderWidth={2}
        borderColor={selected ? color : "rgba(148, 163, 184, 0.55)"}
        backgroundColor={selected ? color : "transparent"}
        alignItems="center"
        justifyContent="center"
      >
        {selected ? <Check size={12} color="#FFFFFF" weight="bold" /> : null}
      </YStack>
    );
  }
  if (indicator === "checkmark" && selected) {
    return <Check size={20} color={color} weight="bold" />;
  }
  return null;
}
