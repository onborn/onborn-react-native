import React, { createContext, useContext, useMemo, useState } from "react";
import {
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";

type CarouselRuntimeContextValue = {
  activeIndex: SharedValue<number>;
  count: number;
  setCount: (count: number) => void;
};

const CarouselRuntimeContext =
  createContext<CarouselRuntimeContextValue | null>(null);

export function CarouselRuntimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const activeIndex = useSharedValue(0);
  const [count, setCount] = useState(0);
  const value = useMemo(
    () => ({
      activeIndex,
      count,
      setCount,
    }),
    [activeIndex, count],
  );

  return (
    <CarouselRuntimeContext.Provider value={value}>
      {children}
    </CarouselRuntimeContext.Provider>
  );
}

export function useCarouselRuntime() {
  return useContext(CarouselRuntimeContext);
}
