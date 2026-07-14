import { useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { isLoaded, loadAsync, type FontSource } from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_600SemiBold,
  Roboto_700Bold,
  Roboto_800ExtraBold,
} from "@expo-google-fonts/roboto";
import {
  OpenSans_400Regular,
  OpenSans_500Medium,
  OpenSans_600SemiBold,
  OpenSans_700Bold,
  OpenSans_800ExtraBold,
} from "@expo-google-fonts/open-sans";
import {
  Lato_400Regular,
  Lato_700Bold,
  Lato_900Black,
} from "@expo-google-fonts/lato";
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from "@expo-google-fonts/montserrat";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from "@expo-google-fonts/poppins";
import {
  Raleway_400Regular,
  Raleway_500Medium,
  Raleway_600SemiBold,
  Raleway_700Bold,
  Raleway_800ExtraBold,
} from "@expo-google-fonts/raleway";
import {
  Merriweather_400Regular,
  Merriweather_500Medium,
  Merriweather_600SemiBold,
  Merriweather_700Bold,
  Merriweather_800ExtraBold,
} from "@expo-google-fonts/merriweather";
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from "@expo-google-fonts/nunito";
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_800ExtraBold,
} from "@expo-google-fonts/playfair-display";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import {
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from "@expo-google-fonts/sora";
import {
  Oswald_400Regular,
  Oswald_500Medium,
  Oswald_600SemiBold,
  Oswald_700Bold,
} from "@expo-google-fonts/oswald";
import {
  Fraunces_400Regular,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
  Fraunces_800ExtraBold,
} from "@expo-google-fonts/fraunces";
import {
  SchibstedGrotesk_400Regular,
  SchibstedGrotesk_500Medium,
  SchibstedGrotesk_600SemiBold,
  SchibstedGrotesk_700Bold,
  SchibstedGrotesk_800ExtraBold,
} from "@expo-google-fonts/schibsted-grotesk";

export type OnbornFontFamily =
  | "Inter"
  | "Roboto"
  | "Open Sans"
  | "Lato"
  | "Montserrat"
  | "Poppins"
  | "Raleway"
  | "Merriweather"
  | "Nunito"
  | "Playfair Display"
  | "Schibsted Grotesk"
  | "Space Grotesk"
  | "Sora"
  | "Oswald"
  | "Fraunces";

export type OnbornFontWeight =
  | "normal"
  | "400"
  | "500"
  | "600"
  | "700"
  | "800"
  | "bold";

export type OnbornLineHeight = "tight" | "normal" | "relaxed";

type NumericFontWeight = "400" | "500" | "600" | "700" | "800";
type FontWeightAssets = Record<
  NumericFontWeight,
  { familyName: string; source: FontSource }
>;

const FONT_FAMILY_ALIASES: Record<string, OnbornFontFamily> = {
  inter: "Inter",
  roboto: "Roboto",
  opensans: "Open Sans",
  "open-sans": "Open Sans",
  "open sans": "Open Sans",
  lato: "Lato",
  montserrat: "Montserrat",
  poppins: "Poppins",
  raleway: "Raleway",
  merriweather: "Merriweather",
  nunito: "Nunito",
  playfairdisplay: "Playfair Display",
  "playfair-display": "Playfair Display",
  "playfair display": "Playfair Display",
  schibstedgrotesk: "Schibsted Grotesk",
  "schibsted-grotesk": "Schibsted Grotesk",
  "schibsted grotesk": "Schibsted Grotesk",
  spacegrotesk: "Space Grotesk",
  "space-grotesk": "Space Grotesk",
  "space grotesk": "Space Grotesk",
  sora: "Sora",
  oswald: "Oswald",
  fraunces: "Fraunces",
};

const FONT_ASSETS: Record<OnbornFontFamily, FontWeightAssets> = {
  Inter: {
    "400": { familyName: "Inter_400Regular", source: Inter_400Regular },
    "500": { familyName: "Inter_500Medium", source: Inter_500Medium },
    "600": { familyName: "Inter_600SemiBold", source: Inter_600SemiBold },
    "700": { familyName: "Inter_700Bold", source: Inter_700Bold },
    "800": { familyName: "Inter_800ExtraBold", source: Inter_800ExtraBold },
  },
  Roboto: {
    "400": { familyName: "Roboto_400Regular", source: Roboto_400Regular },
    "500": { familyName: "Roboto_500Medium", source: Roboto_500Medium },
    "600": { familyName: "Roboto_600SemiBold", source: Roboto_600SemiBold },
    "700": { familyName: "Roboto_700Bold", source: Roboto_700Bold },
    "800": { familyName: "Roboto_800ExtraBold", source: Roboto_800ExtraBold },
  },
  "Open Sans": {
    "400": { familyName: "OpenSans_400Regular", source: OpenSans_400Regular },
    "500": { familyName: "OpenSans_500Medium", source: OpenSans_500Medium },
    "600": { familyName: "OpenSans_600SemiBold", source: OpenSans_600SemiBold },
    "700": { familyName: "OpenSans_700Bold", source: OpenSans_700Bold },
    "800": {
      familyName: "OpenSans_800ExtraBold",
      source: OpenSans_800ExtraBold,
    },
  },
  Lato: {
    "400": { familyName: "Lato_400Regular", source: Lato_400Regular },
    "500": { familyName: "Lato_400Regular", source: Lato_400Regular },
    "600": { familyName: "Lato_700Bold", source: Lato_700Bold },
    "700": { familyName: "Lato_700Bold", source: Lato_700Bold },
    "800": { familyName: "Lato_900Black", source: Lato_900Black },
  },
  Montserrat: {
    "400": {
      familyName: "Montserrat_400Regular",
      source: Montserrat_400Regular,
    },
    "500": { familyName: "Montserrat_500Medium", source: Montserrat_500Medium },
    "600": {
      familyName: "Montserrat_600SemiBold",
      source: Montserrat_600SemiBold,
    },
    "700": { familyName: "Montserrat_700Bold", source: Montserrat_700Bold },
    "800": {
      familyName: "Montserrat_800ExtraBold",
      source: Montserrat_800ExtraBold,
    },
  },
  Poppins: {
    "400": { familyName: "Poppins_400Regular", source: Poppins_400Regular },
    "500": { familyName: "Poppins_500Medium", source: Poppins_500Medium },
    "600": { familyName: "Poppins_600SemiBold", source: Poppins_600SemiBold },
    "700": { familyName: "Poppins_700Bold", source: Poppins_700Bold },
    "800": { familyName: "Poppins_800ExtraBold", source: Poppins_800ExtraBold },
  },
  Raleway: {
    "400": { familyName: "Raleway_400Regular", source: Raleway_400Regular },
    "500": { familyName: "Raleway_500Medium", source: Raleway_500Medium },
    "600": { familyName: "Raleway_600SemiBold", source: Raleway_600SemiBold },
    "700": { familyName: "Raleway_700Bold", source: Raleway_700Bold },
    "800": { familyName: "Raleway_800ExtraBold", source: Raleway_800ExtraBold },
  },
  Merriweather: {
    "400": {
      familyName: "Merriweather_400Regular",
      source: Merriweather_400Regular,
    },
    "500": {
      familyName: "Merriweather_500Medium",
      source: Merriweather_500Medium,
    },
    "600": {
      familyName: "Merriweather_600SemiBold",
      source: Merriweather_600SemiBold,
    },
    "700": { familyName: "Merriweather_700Bold", source: Merriweather_700Bold },
    "800": {
      familyName: "Merriweather_800ExtraBold",
      source: Merriweather_800ExtraBold,
    },
  },
  Nunito: {
    "400": { familyName: "Nunito_400Regular", source: Nunito_400Regular },
    "500": { familyName: "Nunito_500Medium", source: Nunito_500Medium },
    "600": { familyName: "Nunito_600SemiBold", source: Nunito_600SemiBold },
    "700": { familyName: "Nunito_700Bold", source: Nunito_700Bold },
    "800": { familyName: "Nunito_800ExtraBold", source: Nunito_800ExtraBold },
  },
  "Playfair Display": {
    "400": {
      familyName: "PlayfairDisplay_400Regular",
      source: PlayfairDisplay_400Regular,
    },
    "500": {
      familyName: "PlayfairDisplay_500Medium",
      source: PlayfairDisplay_500Medium,
    },
    "600": {
      familyName: "PlayfairDisplay_600SemiBold",
      source: PlayfairDisplay_600SemiBold,
    },
    "700": {
      familyName: "PlayfairDisplay_700Bold",
      source: PlayfairDisplay_700Bold,
    },
    "800": {
      familyName: "PlayfairDisplay_800ExtraBold",
      source: PlayfairDisplay_800ExtraBold,
    },
  },
  "Schibsted Grotesk": {
    "400": {
      familyName: "SchibstedGrotesk_400Regular",
      source: SchibstedGrotesk_400Regular,
    },
    "500": {
      familyName: "SchibstedGrotesk_500Medium",
      source: SchibstedGrotesk_500Medium,
    },
    "600": {
      familyName: "SchibstedGrotesk_600SemiBold",
      source: SchibstedGrotesk_600SemiBold,
    },
    "700": {
      familyName: "SchibstedGrotesk_700Bold",
      source: SchibstedGrotesk_700Bold,
    },
    "800": {
      familyName: "SchibstedGrotesk_800ExtraBold",
      source: SchibstedGrotesk_800ExtraBold,
    },
  },
  // Space Grotesk ships up to 700; map 800 to the heaviest available weight.
  "Space Grotesk": {
    "400": {
      familyName: "SpaceGrotesk_400Regular",
      source: SpaceGrotesk_400Regular,
    },
    "500": {
      familyName: "SpaceGrotesk_500Medium",
      source: SpaceGrotesk_500Medium,
    },
    "600": {
      familyName: "SpaceGrotesk_600SemiBold",
      source: SpaceGrotesk_600SemiBold,
    },
    "700": { familyName: "SpaceGrotesk_700Bold", source: SpaceGrotesk_700Bold },
    "800": { familyName: "SpaceGrotesk_700Bold", source: SpaceGrotesk_700Bold },
  },
  Sora: {
    "400": { familyName: "Sora_400Regular", source: Sora_400Regular },
    "500": { familyName: "Sora_500Medium", source: Sora_500Medium },
    "600": { familyName: "Sora_600SemiBold", source: Sora_600SemiBold },
    "700": { familyName: "Sora_700Bold", source: Sora_700Bold },
    "800": { familyName: "Sora_800ExtraBold", source: Sora_800ExtraBold },
  },
  // Oswald ships up to 700; map 800 to the heaviest available weight.
  Oswald: {
    "400": { familyName: "Oswald_400Regular", source: Oswald_400Regular },
    "500": { familyName: "Oswald_500Medium", source: Oswald_500Medium },
    "600": { familyName: "Oswald_600SemiBold", source: Oswald_600SemiBold },
    "700": { familyName: "Oswald_700Bold", source: Oswald_700Bold },
    "800": { familyName: "Oswald_700Bold", source: Oswald_700Bold },
  },
  Fraunces: {
    "400": { familyName: "Fraunces_400Regular", source: Fraunces_400Regular },
    "500": { familyName: "Fraunces_500Medium", source: Fraunces_500Medium },
    "600": { familyName: "Fraunces_600SemiBold", source: Fraunces_600SemiBold },
    "700": { familyName: "Fraunces_700Bold", source: Fraunces_700Bold },
    "800": {
      familyName: "Fraunces_800ExtraBold",
      source: Fraunces_800ExtraBold,
    },
  },
};

export const ONBORN_FONT_FAMILIES = Object.keys(
  FONT_ASSETS,
) as OnbornFontFamily[];

export function normalizeFontFamily(
  fontFamily: string | undefined,
): OnbornFontFamily | undefined {
  if (!fontFamily) {
    return undefined;
  }

  const normalized = fontFamily.trim().toLowerCase();
  return (
    FONT_FAMILY_ALIASES[normalized] ??
    FONT_FAMILY_ALIASES[normalized.replaceAll(/\s+/g, "")]
  );
}

export function normalizeFontWeight(
  fontWeight: OnbornFontWeight | undefined,
): NumericFontWeight {
  if (fontWeight === "bold") {
    return "700";
  }
  if (fontWeight === "normal" || !fontWeight) {
    return "400";
  }
  return fontWeight;
}

export function resolveTextFontStyle(options: {
  fontFamily?: string;
  fontWeight?: OnbornFontWeight;
}): { fontFamily?: string; fontWeight?: OnbornFontWeight } {
  const family = normalizeFontFamily(options.fontFamily);
  const weight = normalizeFontWeight(options.fontWeight);

  if (!family) {
    return { fontWeight: options.fontWeight };
  }

  if (Platform.OS === "web") {
    return {
      fontFamily: family,
      fontWeight: weight,
    };
  }

  return {
    fontFamily: FONT_ASSETS[family][weight].familyName,
  };
}

export function resolveTextLineHeight(
  fontSize: number,
  lineHeight?: OnbornLineHeight,
): number | undefined {
  // Missing lineHeight must still get a sane default. Returning undefined here
  // makes Tamagui fall back to the font's intrinsic (often cramped) metrics,
  // which renders titles/text visually squished even though the editor shows
  // "normal". Treat absent values as "normal" to match the editor + web preview.
  const multiplier =
    lineHeight === "tight" ? 1.08 : lineHeight === "relaxed" ? 1.36 : 1.2;
  return Math.round(fontSize * multiplier);
}

export function getOnbornFontAssets(
  fontFamilies?: Array<string | undefined>,
): Record<string, FontSource> {
  const requestedFamilies = fontFamilies
    ?.map((fontFamily) => normalizeFontFamily(fontFamily))
    .filter((fontFamily): fontFamily is OnbornFontFamily =>
      Boolean(fontFamily),
    );

  const families = fontFamilies
    ? Array.from(new Set(requestedFamilies))
    : ONBORN_FONT_FAMILIES;

  return families.reduce<Record<string, FontSource>>((assets, family) => {
    for (const font of Object.values(FONT_ASSETS[family])) {
      assets[font.familyName] = font.source;
    }
    return assets;
  }, {});
}

export function useOnbornFonts(
  fontFamilies?: Array<string | undefined>,
): [boolean, Error | null] {
  const fontKey = fontFamilies
    ?.map((fontFamily) => normalizeFontFamily(fontFamily))
    .filter(Boolean)
    .sort()
    .join("|");
  const fontMap = useMemo(() => getOnbornFontAssets(fontFamilies), [fontKey]);
  const fontNames = useMemo(() => Object.keys(fontMap), [fontMap]);
  const [loaded, setLoaded] = useState(() =>
    fontNames.every((fontName) => isLoaded(fontName)),
  );
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    if (fontNames.every((fontName) => isLoaded(fontName))) {
      setLoaded(true);
      setError(null);
      return () => {
        mounted = false;
      };
    }

    setLoaded(false);
    setError(null);
    loadAsync(fontMap)
      .then(() => {
        if (mounted) {
          setLoaded(true);
        }
      })
      .catch((loadError: Error) => {
        if (mounted) {
          setError(loadError);
        }
      });

    return () => {
      mounted = false;
    };
  }, [fontMap, fontNames]);

  return [loaded, error];
}
