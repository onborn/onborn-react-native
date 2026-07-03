import React from "react";
import type { TextStyle, ViewStyle } from "react-native";
import { Input as TamaguiInput, YStack } from "tamagui";
import {
  resolveTextFontStyle,
  resolveTextLineHeight,
  type OnbornFontFamily,
  type OnbornFontWeight,
  type OnbornLineHeight,
} from "../typography/fonts";
import { useResponsiveScale } from "../responsive";

export function InputPrimitive(props: {
  placeholder: string;
  value?: string;
  keyboardType?: "text" | "email" | "number";
  autoFocus?: boolean;
  secureTextEntry?: boolean;
  submitOnReturn?: boolean;
  transparent?: boolean;
  bg?: string;
  color?: string;
  placeholderColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  height?: number;
  paddingHorizontal?: number;
  fontSize?: number;
  fontFamily?: OnbornFontFamily;
  fontWeight?: OnbornFontWeight;
  lineHeight?: OnbornLineHeight;
  editable?: boolean;
  pointerEvents?: "auto" | "none" | "box-none" | "box-only";
  onChangeText?: (text: string) => void;
  onSubmit?: () => void;
}) {
  const { scaleFont, scaleRadius, scaleSpace } = useResponsiveScale();
  const kt =
    props.keyboardType === "email"
      ? "email-address"
      : props.keyboardType === "number"
        ? "numeric"
        : "default";
  const fontSize = scaleFont(props.fontSize ?? 16);
  const isTransparent = props.transparent === true;
  const borderColor = isTransparent
    ? "transparent"
    : props.borderColor ?? "#2B3340";
  const inputStyle: ViewStyle & TextStyle = {
    lineHeight: resolveTextLineHeight(fontSize, props.lineHeight),
    outlineWidth: 0,
    boxShadow: "none",
  };

  return (
    <YStack width="100%" pointerEvents={props.pointerEvents}>
      <TamaguiInput
        pointerEvents={props.pointerEvents}
        placeholder={props.placeholder}
        value={props.value}
        disabled={props.editable === false}
        onChangeText={props.editable === false ? undefined : props.onChangeText}
        onSubmitEditing={props.submitOnReturn ? props.onSubmit : undefined}
        keyboardType={kt}
        autoFocus={props.autoFocus}
        secureTextEntry={props.secureTextEntry}
        placeholderTextColor={
          (props.placeholderColor ?? "#9CA5B3") as never
        }
        backgroundColor={isTransparent ? "transparent" : props.bg ?? "#171B22"}
        borderColor={borderColor}
        borderWidth={isTransparent ? 0 : props.borderWidth ?? 1}
        borderRadius={scaleRadius(props.borderRadius ?? 16)}
        color={props.color ?? "#F3F5F8"}
        height={scaleSpace(props.height ?? 48)}
        paddingHorizontal={scaleSpace(props.paddingHorizontal ?? 14)}
        fontSize={fontSize}
        width="100%"
        {...resolveTextFontStyle({
          fontFamily: props.fontFamily,
          fontWeight: props.fontWeight,
        })}
        focusStyle={{
          outlineWidth: 0,
          borderColor,
          boxShadow: "none",
        }}
        hoverStyle={{
          borderColor,
          boxShadow: "none",
        }}
        disabledStyle={{
          opacity: 1,
          backgroundColor: isTransparent ? "transparent" : props.bg ?? "#171B22",
          borderColor,
        }}
        style={inputStyle}
      />
    </YStack>
  );
}
