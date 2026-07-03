import React from "react";
import { Linking } from "react-native";
import { Text, XStack } from "tamagui";
import type { PaywallPrimitiveComponentProps } from "./types";
import { isBuilderCanvasPreview } from "./utils";

export function TermsLinks({ ctx, props }: PaywallPrimitiveComponentProps) {
  const { flowTheme } = ctx;
  const terms = props as {
    links?: { label: string; url: string }[];
    separator?: string;
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
  };
  const links = Array.isArray(terms.links) ? terms.links : [];
  if (links.length === 0) {
    return null;
  }
  const separator = terms.separator ?? " · ";
  const linkColor = ctx.resolveColor(terms.color) ?? flowTheme.colors.secondary;
  return (
    <XStack
      maxWidth="100%"
      alignSelf="center"
      flexWrap="wrap"
      justifyContent="center"
      alignItems="center"
      gap={4}
    >
      {links.map((link, index) => (
        <React.Fragment key={`${link.url}-${index}`}>
          {index > 0 ? (
            <Text color={linkColor} fontSize={terms.fontSize ?? 12}>
              {separator}
            </Text>
          ) : null}
          <Text
            color={linkColor}
            fontSize={terms.fontSize ?? 12}
            fontFamily={
              terms.fontFamily ?? flowTheme.fonts.body ?? ctx.layoutFontFamily
            }
            fontWeight={terms.fontWeight ?? "500"}
            textDecorationLine="underline"
            onPress={
              isBuilderCanvasPreview(ctx.options)
                ? undefined
                : () => {
                    ctx.options?.paywallContext?.onLinkPress?.({
                      url: link.url,
                      label: link.label,
                    });
                    void Linking.openURL(link.url);
                  }
            }
          >
            {link.label}
          </Text>
        </React.Fragment>
      ))}
    </XStack>
  );
}
