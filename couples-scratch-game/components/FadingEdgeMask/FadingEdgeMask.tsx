import React, { useState, cloneElement, Children, isValidElement } from "react";
import { StyleSheet, ViewStyle, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";

interface FadingEdgeMaskProps {
  children: React.ReactNode;
  style?: ViewStyle;
  fadeSize?: number; // Approximate percentage of fade (0.0 to 0.5)
}

export function FadingEdgeMask({ children, style, fadeSize = 0.05 }: FadingEdgeMaskProps) {
  const [isScrolledTop, setIsScrolledTop] = useState(false);
  const [isScrolledBottom, setIsScrolledBottom] = useState(false);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    setIsScrolledTop(contentOffset.y > 0);
    setIsScrolledBottom(contentOffset.y + layoutMeasurement.height < contentSize.height - 1);
  };

  const child = Children.only(children);
  const clonedChild = isValidElement(child)
    ? cloneElement(child as React.ReactElement<any>, {
        onScroll: (e: any) => {
          handleScroll(e);
          const childProps = (child as React.ReactElement).props as any;
          if (childProps.onScroll) {
            childProps.onScroll(e);
          }
        },
        scrollEventThrottle: 16,
      })
    : children;

  const topColor = isScrolledTop ? "transparent" : "black";
  const bottomColor = isScrolledBottom ? "transparent" : "black";

  return (
    <MaskedView
      style={[{ flex: 1 }, style]}
      maskElement={
        <LinearGradient
          colors={[topColor, "black", "black", bottomColor]}
          locations={[0, fadeSize, 1 - fadeSize, 1]}
          style={{ flex: 1 }}
        />
      }
    >
      {clonedChild}
    </MaskedView>
  );
}
