declare module "lottie-react-native" {
  import type { ComponentType } from "react";
  import type { StyleProp, ViewStyle } from "react-native";

  const LottieView: ComponentType<{
    source: { uri: string } | object;
    autoPlay?: boolean;
    loop?: boolean;
    speed?: number;
    resizeMode?: "cover" | "contain" | "center";
    style?: StyleProp<ViewStyle>;
  }>;

  export default LottieView;
}
