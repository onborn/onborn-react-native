import type { InitialLoadingComponentProps } from "@onborn/rn-sdk";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function DemoInitialLoading({
  flowId,
  kind,
  paywallId,
}: InitialLoadingComponentProps) {
  const target = kind === "flow" ? flowId : paywallId;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.indicatorShell}>
          <ActivityIndicator color="#38BDF8" size="large" />
        </View>
        <Text style={styles.title}>Loading ONBORN {kind}</Text>
        <Text style={styles.subtitle}>
          Fetching initial runtime JSON{target ? ` for ${target}` : ""}.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#090D14",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  indicatorShell: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    marginBottom: 22,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0,
    textAlign: "center",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    maxWidth: 300,
    textAlign: "center",
  },
});
