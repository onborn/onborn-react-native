import type { NativeCustomStepRendererProps } from "@onborn/rn-sdk";
import { Pressable, StyleSheet, Text, View } from "react-native";

const FOCUS_OPTIONS = [
  { id: "sleep", label: "Sleep better" },
  { id: "energy", label: "More energy" },
  { id: "routine", label: "Daily routine" },
] as const;

export function DemoNativeCustomStep({
  actions,
  layout,
  primitives,
  theme,
  values,
}: NativeCustomStepRendererProps) {
  const selectedFocus =
    typeof values.native_focus === "string" ? values.native_focus : "";
  const primary = theme?.colors?.primary ?? "#111827";
  const secondary = theme?.colors?.secondary ?? "#6B7280";
  const neutral = theme?.colors?.neutral ?? "#FFFFFF";
  const tertiary = theme?.colors?.tertiary ?? "#E5E7EB";
  const bgColor =
    layout.bg?.type === "solid" ? layout.bg.color : neutral;

  return (
    <View style={styles.wrap}>
      <View style={[styles.nativeCard, { backgroundColor: bgColor }]}>
        <Text style={[styles.kicker, { color: secondary }]}>Native screen</Text>
        {primitives.renderTitle({
          text: "Tune your plan",
          align: "left",
          size: "lg",
          color: primary,
        })}
        {primitives.renderSubtitle({
          text: "This part is rendered by the host app, but still uses ONBORN theme tokens and flow actions.",
          align: "left",
          color: secondary,
        })}

        <View style={styles.options}>
          {FOCUS_OPTIONS.map((option) => {
            const selected = selectedFocus === option.id;
            return (
              <Pressable
                key={option.id}
                style={[
                  styles.option,
                  {
                    borderColor: selected ? primary : tertiary,
                    backgroundColor: selected ? primary : "transparent",
                  },
                ]}
                onPress={() => actions.setValue("native_focus", option.id)}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    { color: selected ? neutral : primary },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {primitives.renderCTAButton({
        text: selectedFocus ? "Continue" : "Skip for now",
        action: "next",
        variant: "primary",
        fullWidth: true,
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    gap: 18,
  },
  nativeCard: {
    width: "100%",
    borderRadius: 24,
    padding: 22,
    gap: 14,
  },
  kicker: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  options: {
    gap: 10,
  },
  option: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
});
