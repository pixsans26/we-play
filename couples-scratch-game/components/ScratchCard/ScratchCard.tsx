import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Image,
  StyleSheet,
  LayoutChangeEvent,
  ImageSourcePropType,
  PanResponder,
  GestureResponderEvent,
  Animated,
  Text,
} from "react-native";
import Svg, { Path, Mask, Rect, LinearGradient, Stop, Defs } from "react-native-svg";

export interface ScratchCardProps {
  onScratchComplete: () => void;
  overlayImage?: ImageSourcePropType;
  brushSize?: number;
  threshold?: number;
  children: React.ReactNode;
}

const DEFAULT_BRUSH_SIZE = 50;
const DEFAULT_THRESHOLD = 0.35;
const GRID_CELL_SIZE = 8;

/**
 * ScratchCard with smooth SVG path scratching.
 * Draws a continuous smooth path where the user scratches,
 * revealing content underneath through the path.
 */
export function ScratchCard({
  onScratchComplete,
  overlayImage,
  brushSize = DEFAULT_BRUSH_SIZE,
  threshold = DEFAULT_THRESHOLD,
  children,
}: ScratchCardProps) {
  const [revealed, setRevealed] = useState(false);
  const revealedRef = useRef(false);
  const gridRef = useRef<boolean[][]>([]);
  const dimensionsRef = useRef({ width: 0, height: 0, cols: 0, rows: 0 });
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // SVG path data for smooth scratch trail
  const [pathData, setPathData] = useState("");

  // Animated overlay opacity for final reveal
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  const initializeGrid = useCallback((width: number, height: number) => {
    const cols = Math.ceil(width / GRID_CELL_SIZE);
    const rows = Math.ceil(height / GRID_CELL_SIZE);
    dimensionsRef.current = { width, height, cols, rows };
    gridRef.current = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => false)
    );
  }, []);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      if (width > 0 && height > 0) {
        initializeGrid(width, height);
      }
    },
    [initializeGrid]
  );

  const markCellsScratched = useCallback(
    (x: number, y: number) => {
      const { cols, rows } = dimensionsRef.current;
      const grid = gridRef.current;
      if (cols === 0 || rows === 0) return;

      const halfBrush = brushSize / 2;
      const startCol = Math.max(0, Math.floor((x - halfBrush) / GRID_CELL_SIZE));
      const endCol = Math.min(cols - 1, Math.floor((x + halfBrush) / GRID_CELL_SIZE));
      const startRow = Math.max(0, Math.floor((y - halfBrush) / GRID_CELL_SIZE));
      const endRow = Math.min(rows - 1, Math.floor((y + halfBrush) / GRID_CELL_SIZE));

      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          grid[row][col] = true;
        }
      }
    },
    [brushSize]
  );

  const calculatePercentage = useCallback((): number => {
    const { cols, rows } = dimensionsRef.current;
    const grid = gridRef.current;
    if (cols === 0 || rows === 0) return 0;

    let scratchedCount = 0;
    const totalCells = rows * cols;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (grid[row][col]) scratchedCount++;
      }
    }

    return scratchedCount / totalCells;
  }, []);

  const triggerReveal = useCallback(() => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    setRevealed(true);

    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    onScratchComplete();
  }, [onScratchComplete, overlayOpacity]);

  const handleScratchPoint = useCallback(
    (x: number, y: number) => {
      if (revealedRef.current) return;

      const lastPoint = lastPointRef.current;

      // Build smooth SVG path
      if (lastPoint) {
        // Line to current point
        setPathData((prev) => prev + ` L ${x} ${y}`);

        // Mark grid cells along the line for percentage calculation
        const dx = x - lastPoint.x;
        const dy = y - lastPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.max(1, Math.floor(distance / (brushSize * 0.3)));
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          markCellsScratched(lastPoint.x + dx * t, lastPoint.y + dy * t);
        }
      } else {
        // Move to first point (start new sub-path)
        setPathData((prev) => prev + ` M ${x} ${y}`);
        markCellsScratched(x, y);
      }

      lastPointRef.current = { x, y };

      const percentage = calculatePercentage();
      if (percentage >= threshold) {
        triggerReveal();
      }
    },
    [markCellsScratched, calculatePercentage, threshold, triggerReveal, brushSize]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (event: GestureResponderEvent) => {
        lastPointRef.current = null;
        const { locationX, locationY } = event.nativeEvent;
        handleScratchPoint(locationX, locationY);
      },
      onPanResponderMove: (event: GestureResponderEvent) => {
        const { locationX, locationY } = event.nativeEvent;
        handleScratchPoint(locationX, locationY);
      },
      onPanResponderRelease: () => {
        lastPointRef.current = null;
      },
    })
  ).current;

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {/* Revealed content underneath */}
      <View style={styles.contentContainer}>
        {children}
      </View>

      {/* Overlay with scratch path cut-out */}
      {!revealed && (
        <Animated.View
          style={[styles.overlay, { opacity: overlayOpacity }]}
          {...panResponder.panHandlers}
        >
          {/* SVG masking to draw real scratch card effect with a gradient overlay */}
          <View style={styles.svgContainer}>
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id="scratchGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#f43f5e" />
                  <Stop offset="50%" stopColor="#ec4899" />
                  <Stop offset="100%" stopColor="#a855f7" />
                </LinearGradient>
                <Mask id="scratchMask" x="0" y="0" width="100%" height="100%" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
                  <Rect x="0" y="0" width="100%" height="100%" fill="white" />
                  {pathData.length > 0 && (
                    <Path
                      d={pathData}
                      stroke="black"
                      strokeWidth={brushSize}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  )}
                </Mask>
              </Defs>
              <Rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="url(#scratchGradient)"
                mask="url(#scratchMask)"
              />
            </Svg>
          </View>

          {/* Hint text */}
          {pathData.length === 0 && (
            <View style={styles.hintContainer} pointerEvents="none">
              <Text style={styles.hintText}>Scratch to Reveal ❤️</Text>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
    width: "100%",
    aspectRatio: 4 / 5,
  },
  contentContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    overflow: "hidden",
  },
  overlayImage: {
    width: "100%",
    height: "100%",
  },
  svgContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  hintContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  hintText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 18,
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

export default ScratchCard;
