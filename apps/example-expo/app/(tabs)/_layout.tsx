import { Tabs } from "expo-router";
import React from "react";

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Flow" }} />
      <Tabs.Screen name="paywall" options={{ title: "Paywall" }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
