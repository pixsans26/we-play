import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Dimensions,
  Animated,
  Easing,
  Alert,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Modal,
  TextInput,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import ConfettiCannon from "react-native-confetti-cannon";

import { useThemeStore, getTheme } from "@/store/themeStore";
import { useAuthStore } from "@/store/authStore";
import { env } from "@/lib/env";
import { apiFetch, getAvatarSource } from "@/lib/apiClient";
import { CustomAlertModal } from "@/components/CustomAlertModal";
import { useSound } from "@/hooks/useSound";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BOARD_FRAME_SIZE = Math.min(SCREEN_WIDTH - 16, 420);
const BOARD_PADDING = 6;
const BOARD_GRID_SIZE = BOARD_FRAME_SIZE - BOARD_PADDING * 2;
const CELL_SIZE = BOARD_GRID_SIZE / 15;
const CARD_ROW_WIDTH = Math.min(SCREEN_WIDTH - 16, 420);
const BUBBLE_WIDTH = 48;
const BUBBLE_HEIGHT = 44;
const CARD_WIDTH = Math.floor((CARD_ROW_WIDTH - BUBBLE_WIDTH * 2 - 12) / 2);

const BG_IMAGE = require("@/assets/images/ludo-bg.jpg");
const DICE_IMAGE = require("@/assets/images/ludo-dice.png");

// Colors matching the visual design
const PLAYER_COLORS: Record<string, { bg: string; border: string; glow: string; text: string; lightBg: string; dark: string; light: string }> = {
  red: { bg: "#FF1744", border: "#D50000", glow: "rgba(255, 23, 68, 0.6)", text: "#ffffff", lightBg: "#FFEBEE", dark: "#B71C1C", light: "#FF5252" },
  green: { bg: "#00C853", border: "#009624", glow: "rgba(0, 200, 83, 0.6)", text: "#ffffff", lightBg: "#E8F5E9", dark: "#007E33", light: "#69F0AE" },
  yellow: { bg: "#FFD600", border: "#FFAB00", glow: "rgba(255, 214, 0, 0.6)", text: "#ffffff", lightBg: "#FFFDE7", dark: "#FF8F00", light: "#FFE57F" },
  blue: { bg: "#00B0FF", border: "#0091EA", glow: "rgba(0, 176, 255, 0.6)", text: "#ffffff", lightBg: "#E1F5FE", dark: "#0277BD", light: "#80D8FF" },
};

// 52 Perimeter Track Coordinates [col, row] (0-14 grid)
const TRACK_COORDS: Array<[number, number]> = [
  [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],  // 0-4
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], // 5-10
  [0, 7],                                        // 11 (Step 12: Red Gateway)
  [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], // 12-17 (Step 14: [1, 6] is Red Start)
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], // 18-23 (Step 22: [6, 2] is Red Star)
  [7, 0],                                        // 24 (Step 25: Green Gateway)
  [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], // 25-30 (Step 27: [8, 1] is Green Start)
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], // 31-36 (Step 35: [12, 6] is Green Star)
  [14, 7],                                       // 37 (Step 38: Yellow Gateway)
  [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], // 38-43 (Step 40: [13, 8] is Yellow Start)
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], // 44-49 (Step 48: [8, 12] is Yellow Star)
  [7, 14],                                       // 50 (Step 51: Blue Gateway)
  [6, 14]                                        // 51
];

// Safe Star Track Indices (0-indexed on track)
const SAFE_STAR_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

// Player start & home entry indices on track (0-51)
const PLAYER_TRACK_CONFIG: Record<string, { startIdx: number; homeEntryIdx: number }> = {
  red: { startIdx: 13, homeEntryIdx: 11 },
  green: { startIdx: 26, homeEntryIdx: 24 },
  yellow: { startIdx: 39, homeEntryIdx: 37 },
  blue: { startIdx: 0, homeEntryIdx: 50 },
};

// Home Run Paths [col, row] for 5 steps (indices 0..4) leading to home center
const HOME_RUN_COORDS: Record<string, Array<[number, number]>> = {
  red: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  green: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  yellow: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
  blue: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
};

// Base positions inside 4 corners for chips waiting in yard (in grid units 0..14)
const BASE_GRID_SPOTS: Record<string, Array<[number, number]>> = {
  red: [[1.75, 1.75], [4.25, 1.75], [1.75, 4.25], [4.25, 4.25]],
  green: [[10.75, 1.75], [13.25, 1.75], [10.75, 4.25], [13.25, 4.25]],
  blue: [[1.75, 10.75], [4.25, 10.75], [1.75, 13.25], [4.25, 13.25]],
  yellow: [[10.75, 10.75], [13.25, 10.75], [10.75, 13.25], [13.25, 13.25]],
};

// Center Home positions (where chips land when winning / completing home stretch)
const HOME_GRID_SPOTS: Record<string, [number, number]> = {
  red: [6.85, 7.5],
  green: [7.5, 6.85],
  yellow: [8.15, 7.5],
  blue: [7.5, 8.15],
};

interface LudoPlayer {
  id: string;
  name: string;
  color: "red" | "green" | "yellow" | "blue";
  avatar: string | null;
  completedTokens: number;
}

interface LudoToken {
  id: number;
  state: "base" | "track" | "home_run" | "home";
  position: number; // -1 for base; 0..51 for track; 0..4 for home_run; 999 for home
}

interface LudoTask {
  id: number;
  stepNumber: number | null;
  stepType: "normal" | "star" | "home_entry" | "home_stretch" | "home";
  title: string;
  description: string;
  category: string;
  performer: "lander" | "partner" | "both";
  timerSeconds: number;
  imageUrl?: string | null;
  categoryImageUrl?: string | null;
}

const SpeechBubble: React.FC<{
  direction: "left" | "right";
  player: LudoPlayer | null;
  slotColor?: string;
  isActive: boolean;
  canRoll: boolean;
  isRolling: boolean;
  isMovingToken: boolean;
  diceRoll: number | null;
  diceAnim: Animated.Value;
  onPress: () => void;
}> = ({
  direction,
  player,
  slotColor = "#ffffff",
  isActive,
  canRoll,
  isRolling,
  isMovingToken,
  diceRoll,
  diceAnim,
  onPress,
}) => {
  const themeCol = player ? (PLAYER_COLORS[player.color] || PLAYER_COLORS.red) : null;
  const strokeColor = player
    ? (isActive ? (themeCol?.bg || "#00A859") : (themeCol?.border || "#94a3b8"))
    : `${slotColor}70`;
  const isLeft = direction === "left";

  return (
    <Pressable
      disabled={!player || !isActive || !canRoll || isRolling || isMovingToken}
      onPress={onPress}
      style={({ pressed }) => ({
        width: BUBBLE_WIDTH,
        height: BUBBLE_HEIGHT,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        opacity: player ? (isActive ? (pressed ? 0.88 : 1) : 0.8) : 0.45,
        transform: [
          {
            scale: isActive && canRoll && !isRolling && !isMovingToken && pressed ? 0.92 : 1,
          },
        ],
      })}
    >
      {/* Speech Bubble Card */}
      <View
        style={{
          width: BUBBLE_WIDTH - 8,
          height: BUBBLE_HEIGHT,
          borderRadius: 12,
          backgroundColor: player ? "#ffffff" : "rgba(255, 255, 255, 0.4)",
          borderWidth: isActive ? 2.5 : 1.5,
          borderColor: strokeColor,
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          shadowColor: strokeColor,
          shadowOpacity: isActive ? 0.35 : 0.1,
          shadowRadius: 4,
          elevation: isActive ? 4 : 1,
        }}
      >
        {/* Pointer Arrow Border */}
        <View
          style={{
            position: "absolute",
            top: (BUBBLE_HEIGHT - 12) / 2,
            ...(isLeft
              ? {
                  left: -7,
                  width: 0,
                  height: 0,
                  borderTopWidth: 6,
                  borderBottomWidth: 6,
                  borderRightWidth: 7,
                  borderTopColor: "transparent",
                  borderBottomColor: "transparent",
                  borderRightColor: strokeColor,
                }
              : {
                  right: -7,
                  width: 0,
                  height: 0,
                  borderTopWidth: 6,
                  borderBottomWidth: 6,
                  borderLeftWidth: 7,
                  borderTopColor: "transparent",
                  borderBottomColor: "transparent",
                  borderLeftColor: strokeColor,
                }),
          }}
        />
        {/* Pointer Arrow Inner Fill */}
        <View
          style={{
            position: "absolute",
            top: (BUBBLE_HEIGHT - 10) / 2,
            ...(isLeft
              ? {
                  left: -5,
                  width: 0,
                  height: 0,
                  borderTopWidth: 5,
                  borderBottomWidth: 5,
                  borderRightWidth: 6,
                  borderTopColor: "transparent",
                  borderBottomColor: "transparent",
                  borderRightColor: player ? "#ffffff" : "rgba(255, 255, 255, 0.4)",
                }
              : {
                  right: -5,
                  width: 0,
                  height: 0,
                  borderTopWidth: 5,
                  borderBottomWidth: 5,
                  borderLeftWidth: 6,
                  borderTopColor: "transparent",
                  borderBottomColor: "transparent",
                  borderLeftColor: player ? "#ffffff" : "rgba(255, 255, 255, 0.4)",
                }),
          }}
        />

        {/* Dice content inside bubble */}
        {isActive && (
          <Animated.View
            style={{
              width: 32,
              height: 32,
              alignItems: "center",
              justifyContent: "center",
              transform: [
                {
                  rotate: diceAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "720deg"],
                  }),
                },
              ],
            }}
          >
            {diceRoll ? (
              <MaterialCommunityIcons
                name={
                  diceRoll === 1
                    ? "dice-1"
                    : diceRoll === 2
                    ? "dice-2"
                    : diceRoll === 3
                    ? "dice-3"
                    : diceRoll === 4
                    ? "dice-4"
                    : diceRoll === 5
                    ? "dice-5"
                    : "dice-6"
                }
                size={28}
                color={themeCol?.bg || "#0f172a"}
              />
            ) : (
              <Image source={DICE_IMAGE} style={{ width: 26, height: 26 }} resizeMode="contain" />
            )}
          </Animated.View>
        )}
      </View>
    </Pressable>
  );
};

const LudoYard: React.FC<{
  color: "red" | "green" | "yellow" | "blue";
  size: number;
  player?: LudoPlayer | null;
  isActiveTurn: boolean;
}> = ({ color, size, player, isActiveTurn }) => {
  const themeC = PLAYER_COLORS[color];
  const dockSize = (size / 6) * 1.35;
  const dockRadius = dockSize / 2;
  const isRedOrYellow = color === "red" || color === "yellow";

  // Exact symmetrical dock centers in yard coordinates (0 to size):
  // Distance from edge = 1.75 * (size / 6)
  // Distance between docks = 2.50 * (size / 6)
  // Distance to far edge = 1.75 * (size / 6)
  // 1.75 + 2.50 + 1.75 = 6.00 (Equal distance & perfect alignment!)
  const c1 = size * (1.75 / 6);
  const c2 = size * (4.25 / 6);

  // Inner center card (centered)
  const innerCardSize = size * 0.44;
  const innerCardOffset = (size - innerCardSize) / 2;

  // Middle lighter card inset (centered)
  const inset = size * 0.045;
  const midCardSize = size - inset * 2;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 18,
        backgroundColor: themeC.bg,
        position: "relative",
      }}
    >
      {/* Lighter middle card (perfectly centered) */}
      <View
        style={{
          position: "absolute",
          left: inset,
          top: inset,
          width: midCardSize,
          height: midCardSize,
          borderRadius: 14,
          backgroundColor: themeC.light,
        }}
      />

      {/* Darker inner center square (perfectly centered) */}
      <View
        style={{
          position: "absolute",
          left: innerCardOffset,
          top: innerCardOffset,
          width: innerCardSize,
          height: innerCardSize,
          borderRadius: 10,
          backgroundColor: themeC.dark,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: isActiveTurn ? 2 : 0,
          borderColor: "#fbbf24",
        }}
      >
        {player && (
          <Text
            numberOfLines={1}
            style={{
              color: "#ffffff",
              fontSize: Math.max(size * 0.08, 10),
              fontFamily: "DynaPuff_700Bold",
              opacity: 0.9,
            }}
          >
            {(player.name || "P").substring(0, 6)}
          </Text>
        )}
      </View>

      {/* 4 Circular Docks (Positioned with exact equal distances and dead-center aligned with base chips) */}
      {[
        { cx: c1, cy: c1 },
        { cx: c2, cy: c1 },
        { cx: c1, cy: c2 },
        { cx: c2, cy: c2 },
      ].map((dock, idx) => (
        <View
          key={`dock-${color}-${idx}`}
          style={{
            position: "absolute",
            left: dock.cx - dockRadius,
            top: dock.cy - dockRadius,
            width: dockSize,
            height: dockSize,
            borderRadius: dockRadius,
            backgroundColor: "#ffffff",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowRadius: 2,
            elevation: 2,
          }}
        >
          {isRedOrYellow && (
            <View
              style={{
                width: dockSize * 0.72,
                height: dockSize * 0.72,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: themeC.bg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="flower-outline" size={dockSize * 0.45} color={themeC.bg} />
            </View>
          )}
        </View>
      ))}
    </View>
  );
};

const LudoCenter: React.FC<{ size: number }> = ({ size }) => {
  const halfSize = size / 2;
  return (
    <View
      style={{
        position: "absolute",
        left: size * 2,
        top: size * 2,
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 5,
      }}
    >
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: halfSize,
          borderRightWidth: halfSize,
          borderTopWidth: halfSize,
          borderBottomWidth: halfSize,
          borderLeftColor: PLAYER_COLORS.red.bg,
          borderTopColor: PLAYER_COLORS.green.bg,
          borderRightColor: PLAYER_COLORS.yellow.bg,
          borderBottomColor: PLAYER_COLORS.blue.bg,
        }}
      />
      <View
        style={{
          position: "absolute",
          width: size * 0.38,
          height: size * 0.38,
          borderRadius: 999,
          backgroundColor: "#ffffff",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 4,
          borderWidth: 1.5,
          borderColor: "#f59e0b",
        }}
      >
        <Ionicons name="trophy" size={size * 0.22} color="#f59e0b" />
      </View>
    </View>
  );
};

const PlayerCard: React.FC<{
  player: LudoPlayer | null;
  slotTheme: { bg: string; border: string; glow: string; text: string; lightBg: string; dark: string };
  isActive: boolean;
  canRoll: boolean;
  onPress: () => void;
  tokens: LudoToken[];
  coupleProfile: any;
}> = ({ player, slotTheme, isActive, canRoll, onPress, tokens, coupleProfile }) => {
  if (!player) {
    return (
      <View
        style={{
          width: CARD_WIDTH,
          height: 56,
          borderRadius: 14,
          backgroundColor: slotTheme.bg,
          opacity: 0.45,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 7,
          paddingVertical: 5,
          borderWidth: 1.5,
          borderColor: "rgba(255, 255, 255, 0.35)",
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(255, 255, 255, 0.3)",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: "#ffffff",
            marginRight: 6,
          }}
        >
          <Ionicons name="person-outline" size={18} color="#ffffff" />
        </View>

        <View style={{ flex: 1, justifyContent: "center" }}>
          <View
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 10,
              paddingHorizontal: 6,
              paddingVertical: 2,
              alignSelf: "flex-start",
              maxWidth: CARD_WIDTH - 52,
            }}
          >
            <Text
              numberOfLines={1}
              style={{ fontSize: 11, fontFamily: "Nunito_700Bold", color: "#94a3b8" }}
            >
              Waiting...
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 }}>
            {[0, 1, 2, 3].map((sIdx) => (
              <Ionicons
                key={`empty-star-${sIdx}`}
                name="sparkles-outline"
                size={10}
                color="rgba(255, 255, 255, 0.35)"
              />
            ))}
          </View>
        </View>
      </View>
    );
  }

  const themeCol = PLAYER_COLORS[player.color] || slotTheme;
  const homeCount = tokens.filter((t) => t.state === "home").length;

  return (
    <Pressable
      disabled={!isActive || !canRoll}
      onPress={onPress}
      style={({ pressed }) => ({
        width: CARD_WIDTH,
        height: 56,
        borderRadius: 14,
        backgroundColor: themeCol.bg,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 7,
        paddingVertical: 5,
        borderWidth: isActive ? 2.5 : 1.5,
        borderColor: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.35)",
        shadowColor: themeCol.bg,
        shadowOpacity: isActive ? 0.6 : 0.25,
        shadowRadius: isActive ? 10 : 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: isActive ? 6 : 3,
        transform: [{ scale: isActive && pressed ? 0.96 : 1 }],
      })}
    >
      {/* Avatar Container */}
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: "#ffffff",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 2,
          borderColor: "#ffffff",
          overflow: "hidden",
          marginRight: 6,
        }}
      >
        {getAvatarSource(
          player.avatar ||
            (player.id === "player_0"
              ? coupleProfile?.partnerAAvatar
              : coupleProfile?.partnerBAvatar)
        ) ? (
          <Image
            source={
              getAvatarSource(
                player.avatar ||
                  (player.id === "player_0"
                    ? coupleProfile?.partnerAAvatar
                    : coupleProfile?.partnerBAvatar)
              )!
            }
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: themeCol.dark,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#ffffff", fontSize: 13, fontFamily: "DynaPuff_700Bold" }}>
              {(player.name || "P").charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Name Pill & Stars */}
      <View style={{ flex: 1, justifyContent: "center" }}>
        <View
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 10,
            paddingHorizontal: 6,
            paddingVertical: 2,
            alignSelf: "flex-start",
            maxWidth: CARD_WIDTH - 52,
          }}
        >
          <Text
            numberOfLines={1}
            style={{ fontSize: 11, fontFamily: "Nunito_700Bold", color: "#0f172a" }}
          >
            {player.name}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 }}>
          {[0, 1, 2, 3].map((sIdx) => {
            const hasMadeIt = sIdx < homeCount;
            return (
              <Ionicons
                key={`star-${player.id}-${sIdx}`}
                name={hasMadeIt ? "sparkles" : "sparkles-outline"}
                size={10}
                color={hasMadeIt ? "#ffffff" : "rgba(255, 255, 255, 0.45)"}
              />
            );
          })}
        </View>
      </View>
    </Pressable>
  );
};

export default function LudoGameScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const coupleProfile = useAuthStore((s) => s.coupleProfile);
  const isDark = useThemeStore((s) => s.isDark);
  const theme = getTheme(isDark);

  // Loading & Session State
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);

  // Custom Player Setup
  interface CustomPlayerSetup {
    name: string;
    color: "red" | "green" | "yellow" | "blue";
  }

  const COLOR_OPTIONS: Array<{ key: "red" | "green" | "yellow" | "blue"; label: string; hex: string }> = [
    { key: "red", label: "Red", hex: "#ef4444" },
    { key: "green", label: "Green", hex: "#10b981" },
    { key: "yellow", label: "Yellow", hex: "#f59e0b" },
    { key: "blue", label: "Blue", hex: "#3b82f6" },
  ];

  // Game Config Settings
  const [setupPlayerCount, setSetupPlayerCount] = useState<2 | 3 | 4>(2);
  const [customPlayers, setCustomPlayers] = useState<CustomPlayerSetup[]>([
    { name: "Player 1", color: "red" },
    { name: "Player 2", color: "yellow" },
    { name: "Player 3", color: "green" },
    { name: "Player 4", color: "blue" },
  ]);

  // Sync couple names into P1 and P2 initially
  useEffect(() => {
    setCustomPlayers((prev) => {
      const updated = [...prev];
      if (coupleProfile?.partnerAName && (updated[0].name === "Player 1" || !updated[0].name)) {
        updated[0] = { ...updated[0], name: coupleProfile.partnerAName };
      }
      if (coupleProfile?.partnerBName && (updated[1].name === "Player 2" || !updated[1].name)) {
        updated[1] = { ...updated[1], name: coupleProfile.partnerBName };
      }
      return updated;
    });
  }, [coupleProfile]);

  const handleSelectColor = (playerIdx: number, selectedColor: "red" | "green" | "yellow" | "blue") => {
    setCustomPlayers((prev) => {
      const updated = [...prev];
      const oldColor = updated[playerIdx].color;
      if (oldColor === selectedColor) return prev;

      // Swap if another active player already holds selectedColor
      const conflictIdx = updated.findIndex((p, idx) => idx !== playerIdx && idx < setupPlayerCount && p.color === selectedColor);
      if (conflictIdx !== -1) {
        updated[conflictIdx] = { ...updated[conflictIdx], color: oldColor };
      }
      updated[playerIdx] = { ...updated[playerIdx], color: selectedColor };
      return updated;
    });
  };

  const handleUpdatePlayerName = (playerIdx: number, newName: string) => {
    setCustomPlayers((prev) => {
      const updated = [...prev];
      updated[playerIdx] = { ...updated[playerIdx], name: newName };
      return updated;
    });
  };

  // Active Game In-Memory State
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [players, setPlayers] = useState<LudoPlayer[]>([]);
  const [tokens, setTokens] = useState<Record<string, LudoToken[]>>({});
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<"roll" | "move" | "task">("roll");
  const [diceRoll, setDiceRoll] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isMovingToken, setIsMovingToken] = useState(false);
  const [movingTokenId, setMovingTokenId] = useState<number | null>(null);
  const [movableTokenIds, setMovableTokenIds] = useState<number[]>([]);
  const [winner, setWinner] = useState<LudoPlayer | null>(null);

  // Sound effects
  const { playDiceRoll, playChipStep, playWin, playPopup } = useSound();

  // Task Overlay Modal State
  const [activeTask, setActiveTask] = useState<LudoTask | null>(null);
  const [allTasks, setAllTasks] = useState<LudoTask[]>([]);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Animations & Initialization
  const diceAnim = useRef(new Animated.Value(0)).current;
  const hasInitializedRef = useRef(false);

  // Smooth Modal Entrance Animations
  const taskModalScale = useRef(new Animated.Value(0.85)).current;
  const taskModalOpacity = useRef(new Animated.Value(0)).current;

  const resumeModalScale = useRef(new Animated.Value(0.85)).current;
  const resumeModalOpacity = useRef(new Animated.Value(0)).current;

  const setupModalScale = useRef(new Animated.Value(0.85)).current;
  const setupModalOpacity = useRef(new Animated.Value(0)).current;

  const winnerModalScale = useRef(new Animated.Value(0.85)).current;
  const winnerModalOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (activeTask) {
      taskModalScale.setValue(0.92);
      taskModalOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(taskModalScale, { toValue: 1, friction: 9, tension: 35, useNativeDriver: true }),
        Animated.timing(taskModalOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]).start();
    }
  }, [activeTask]);

  useEffect(() => {
    if (showResumeModal) {
      resumeModalScale.setValue(0.85);
      resumeModalOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(resumeModalScale, { toValue: 1, friction: 8, tension: 70, useNativeDriver: true }),
        Animated.timing(resumeModalOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [showResumeModal]);

  useEffect(() => {
    if (showSetupModal) {
      setupModalScale.setValue(0.85);
      setupModalOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(setupModalScale, { toValue: 1, friction: 8, tension: 70, useNativeDriver: true }),
        Animated.timing(setupModalOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [showSetupModal]);

  useEffect(() => {
    if (winner) {
      winnerModalScale.setValue(0.85);
      winnerModalOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(winnerModalScale, { toValue: 1, friction: 8, tension: 70, useNativeDriver: true }),
        Animated.timing(winnerModalOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [winner]);

  // 1. Initial Load: Fetch All Tasks & Check Active Session ONLY ON MOUNT
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    initScreen();
  }, []);

  const initScreen = async () => {
    // If a session is already active in memory, NEVER re-prompt resume!
    if (sessionId !== null) return;

    setLoading(true);
    try {
      // Fetch tasks
      const tasksRes = await apiFetch(`${env.EXPO_PUBLIC_API_URL}/api/ludo/tasks`);
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setAllTasks(Array.isArray(tasksData) ? tasksData : []);
      }

      // Check active session (only on fresh app / screen load)
      const uid = user?.uid || "";
      const coupleId = coupleProfile?.id ? String(coupleProfile.id) : "";
      const sessionRes = await apiFetch(`${env.EXPO_PUBLIC_API_URL}/api/ludo/session/active?uid=${uid}&coupleId=${coupleId}`);

      if (sessionRes.ok) {
        const { session } = await sessionRes.json();
        if (session && session.status === "in_progress") {
          setActiveSession(session);
          setShowResumeModal(true);
          setLoading(false);
          return;
        }
      }

      // No active session found -> open setup modal
      setShowSetupModal(true);
    } catch (err) {
      console.error("[Ludo] Init error:", err);
      setShowSetupModal(true);
    } finally {
      setLoading(false);
    }
  };

  // 2. Resume Existing Session
  const handleResumeSession = (sessionToResume = activeSession) => {
    if (!sessionToResume) return;

    setSessionId(sessionToResume.id);
    setPlayers(sessionToResume.players || []);
    setTokens(sessionToResume.tokens || {});
    setCurrentTurn(sessionToResume.currentTurn ?? 0);
    setCurrentStep(sessionToResume.currentStep || "roll");
    setDiceRoll(sessionToResume.lastDiceRoll ?? null);

    if (sessionToResume.activeTask) {
      setActiveTask(sessionToResume.activeTask);
      setTimerSecondsLeft(sessionToResume.activeTask.timerSeconds || 0);
    } else {
      setActiveTask(null);
    }

    setShowResumeModal(false);
  };

  const handleStartNewGameFromResume = async () => {
    if (activeSession?.id) {
      try {
        await apiFetch(`${env.EXPO_PUBLIC_API_URL}/api/ludo/session/${activeSession.id}/end`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "abandoned" }),
        });
      } catch (e) {
        console.warn("Failed to abandon previous session", e);
      }
    }
    setActiveSession(null);
    setShowResumeModal(false);
    setShowSetupModal(true);
  };

  // 3. Start New Session
  const handleStartNewSession = async () => {
    setLoading(true);
    try {
      const chosenPlayers = customPlayers.slice(0, setupPlayerCount);
      const initialPlayers: LudoPlayer[] = chosenPlayers.map((p, idx) => ({
        id: `player_${idx}`,
        name: p.name.trim() || `Player ${idx + 1}`,
        color: p.color,
        avatar: null,
        completedTokens: 0,
      }));

      const res = await apiFetch(`${env.EXPO_PUBLIC_API_URL}/api/ludo/session/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coupleId: coupleProfile?.id || null,
          creatorUid: user?.uid || "anon",
          playerCount: setupPlayerCount,
          players: initialPlayers,
          tokensPerPlayer: 4, // 4 chips standard per color
        }),
      });

      if (!res.ok) throw new Error("Failed to start session");
      const { session } = await res.json();

      setSessionId(session.id);
      setPlayers(session.players);
      setTokens(session.tokens);
      setCurrentTurn(0);
      setCurrentStep("roll");
      setDiceRoll(null);
      setActiveTask(null);
      setWinner(null);

      setShowSetupModal(false);
      setShowResumeModal(false);
    } catch (err) {
      Alert.alert("Error", "Could not start game session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSetupModal = () => {
    setShowSetupModal(false);
    if (!sessionId && !activeSession) {
      router.replace("/(game)");
    }
  };

  const handleSaveSettingsAndContinue = () => {
    if (sessionId) {
      setPlayers((prev) =>
        prev.map((p, idx) => {
          const custom = customPlayers[idx];
          if (custom && custom.name.trim()) {
            return { ...p, name: custom.name.trim() };
          }
          return p;
        })
      );
    }
    setShowSetupModal(false);
  };

  const handleConfirmRestartGame = () => {
    Alert.alert(
      "Restart Game?",
      "Are you sure you want to start a new game? Current game progress will be reset.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Restart", style: "destructive", onPress: handleStartNewSession },
      ]
    );
  };

  const handlePassTurn = (roll: number) => {
    const nextT = (currentTurn + 1) % players.length;
    setCurrentStep("roll");
    setMovableTokenIds([]);
    setCurrentTurn(nextT);

    // Sync to server
    if (sessionId) {
      apiFetch(`${env.EXPO_PUBLIC_API_URL}/api/ludo/session/${sessionId}/sync`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentTurn: nextT,
          currentStep: "roll",
          lastDiceRoll: roll,
          tokens,
        }),
      });
    }
  };

  // 4. Dice Rolling Animation & Logic
  const handleRollDice = () => {
    if (isRolling || isMovingToken || currentStep !== "roll") return;

    playDiceRoll();
    setIsRolling(true);
    Animated.sequence([
      Animated.timing(diceAnim, { toValue: 1, duration: 400, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(diceAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();

    setTimeout(async () => {
      const roll = Math.floor(Math.random() * 6) + 1;
      setDiceRoll(roll);
      setIsRolling(false);

      const currentPlayer = players[currentTurn];
      if (!currentPlayer) return;

      const playerTokens = tokens[currentPlayer.color] || [];
      const baseTokens = playerTokens.filter((tok) => tok.state === "base");
      const activeMovableTokens = playerTokens.filter(
        (tok) => (tok.state === "track" || tok.state === "home_run") && canTokenMove(tok, roll, currentPlayer.color)
      );

      if (roll === 6) {
        // Auto-start if all chips are in yard/dom and none are active on track/home_run!
        if (activeMovableTokens.length === 0 && baseTokens.length > 0) {
          const spawnTokenId = baseTokens[0].id;
          setMovableTokenIds([spawnTokenId]);
          setTimeout(() => {
            moveToken(spawnTokenId, 6, currentPlayer.color);
          }, 350);
          return;
        }

        // Multiple choices: player can either take out another chip from yard (baseTokens[0])
        // OR move any of the chips already active on the board!
        const movable: number[] = activeMovableTokens.map((t) => t.id);
        if (baseTokens.length > 0) {
          movable.push(baseTokens[0].id);
        }

        if (movable.length === 0) {
          handlePassTurn(roll);
        } else if (movable.length === 1) {
          setMovableTokenIds(movable);
          setTimeout(() => {
            moveToken(movable[0], 6, currentPlayer.color);
          }, 350);
        } else {
          // Highlight all movable options & allow user to choose any chip
          setMovableTokenIds(movable);
          setCurrentStep("move");
        }
      } else {
        // roll 1-5: only active tokens on track or home_run can advance
        const movable = activeMovableTokens.map((t) => t.id);

        if (movable.length === 0) {
          handlePassTurn(roll);
        } else if (movable.length === 1) {
          setMovableTokenIds(movable);
          setTimeout(() => {
            moveToken(movable[0], roll, currentPlayer.color);
          }, 350);
        } else {
          setMovableTokenIds(movable);
          setCurrentStep("move");
        }
      }
    }, 450);
  };

  // 5. Token Movement Rules
  const canTokenMove = (token: LudoToken, roll: number, color: string): boolean => {
    if (token.state === "home") return false;
    if (token.state === "base") {
      return roll === 6; // Requires a 6 to release from base
    }
    const config = PLAYER_TRACK_CONFIG[color];
    if (token.state === "track") {
      const distToHomeEntry = (config.homeEntryIdx - token.position + 52) % 52;
      const totalDistToHome = distToHomeEntry + 6;
      return roll <= totalDistToHome;
    }
    if (token.state === "home_run") {
      const distToHome = 5 - token.position;
      return roll <= distToHome;
    }
    return false;
  };

  // Helper: compute discrete path of positions step-by-step
  interface StepTarget {
    state: "base" | "track" | "home_run" | "home";
    position: number;
  }

  const computeStepPath = (token: LudoToken, roll: number, color: string): StepTarget[] => {
    const config = PLAYER_TRACK_CONFIG[color];
    const path: StepTarget[] = [];

    if (token.state === "base") {
      // 1 step: exit yard onto start tile
      path.push({ state: "track", position: config.startIdx });
      return path;
    }

    if (token.state === "track") {
      let currentPos = token.position;
      let inHomeRun = false;
      let hrPos = -1;

      for (let s = 1; s <= roll; s++) {
        if (!inHomeRun) {
          if (currentPos === config.homeEntryIdx) {
            inHomeRun = true;
            hrPos = 0;
            path.push({ state: "home_run", position: 0 });
          } else {
            currentPos = (currentPos + 1) % 52;
            path.push({ state: "track", position: currentPos });
          }
        } else {
          hrPos += 1;
          if (hrPos >= 5) {
            path.push({ state: "home", position: 999 });
            break;
          } else {
            path.push({ state: "home_run", position: hrPos });
          }
        }
      }
      return path;
    }

    if (token.state === "home_run") {
      let hrPos = token.position;
      for (let s = 1; s <= roll; s++) {
        hrPos += 1;
        if (hrPos >= 5) {
          path.push({ state: "home", position: 999 });
          break;
        } else {
          path.push({ state: "home_run", position: hrPos });
        }
      }
      return path;
    }

    return path;
  };

  const moveToken = async (tokenId: number, roll: number, color: string) => {
    if (isMovingToken) return;

    const playerTokens = [...(tokens[color] || [])];
    const tokenIndex = playerTokens.findIndex((t) => t.id === tokenId);
    if (tokenIndex === -1) return;

    const token = { ...playerTokens[tokenIndex] };
    const config = PLAYER_TRACK_CONFIG[color];
    const steps = computeStepPath(token, roll, color);
    if (steps.length === 0) return;

    setIsMovingToken(true);
    setMovableTokenIds([]);
    setMovingTokenId(tokenId);

    let currentWorkingTokens: Record<string, LudoToken[]> = { ...tokens };

    // Step-by-step seamless animation: chip moves one tile at a time
    for (let i = 0; i < steps.length; i++) {
      const stepTarget = steps[i];
      token.state = stepTarget.state;
      token.position = stepTarget.position;

      const updatedPlayerList = [...(currentWorkingTokens[color] || [])];
      updatedPlayerList[tokenIndex] = { ...token };
      currentWorkingTokens = { ...currentWorkingTokens, [color]: updatedPlayerList };

      setTokens({ ...currentWorkingTokens });
      playChipStep();

      // Slower, smooth step-by-step movement interval
      await new Promise((resolve) => setTimeout(resolve, 260));
    }

    setMovingTokenId(null);
    setIsMovingToken(false);

    // Final Landing Calculations
    let landedStepType: "normal" | "star" | "home_entry" | "home_stretch" | "home" = "normal";
    let landedStepNumber: number = 0;

    const GATEWAY_STEP_TO_COLOR: Record<number, string> = {
      12: "red",
      25: "green",
      38: "yellow",
      51: "blue",
    };

    if (token.state === "track") {
      landedStepNumber = token.position + 1;
      if (SAFE_STAR_INDICES.includes(token.position)) {
        landedStepType = "star";
      } else if (GATEWAY_STEP_TO_COLOR[landedStepNumber]) {
        landedStepType = "home_entry";
        const gwOwnerColor = GATEWAY_STEP_TO_COLOR[landedStepNumber];
        const isOwnGateway = color === gwOwnerColor;
        // Own color uses 12, 25, 38, 51. Other color uses 120, 250, 380, 510.
        if (!isOwnGateway) {
          landedStepNumber = landedStepNumber * 10;
        }
      } else {
        landedStepType = "normal";
      }

      // Check if captured an opponent chip!
      if (!SAFE_STAR_INDICES.includes(token.position)) {
        let capturedAny = false;
        Object.keys(currentWorkingTokens).forEach((otherColor) => {
          if (otherColor !== color) {
            currentWorkingTokens[otherColor] = (currentWorkingTokens[otherColor] || []).map((oppToken) => {
              if (oppToken.state === "track" && oppToken.position === token.position) {
                capturedAny = true;
                return { ...oppToken, state: "base", position: -1 };
              }
              return oppToken;
            });
          }
        });
        if (capturedAny) {
          playPopup();
          setTokens({ ...currentWorkingTokens });
        }
      }
    } else if (token.state === "home_run") {
      landedStepType = "home_stretch";
      landedStepNumber = 101 + token.position;
    } else if (token.state === "home") {
      landedStepType = "home";
      const finalPlayerTokens = currentWorkingTokens[color] || [];
      const homeChipsCount = finalPlayerTokens.filter((t) => t.state === "home").length;
      if (homeChipsCount === 1) {
        landedStepNumber = 901;
      } else if (homeChipsCount === 2) {
        landedStepNumber = 902;
      } else if (homeChipsCount === 3) {
        landedStepNumber = 903;
      } else {
        landedStepNumber = 904;
      }
    }

    // Trigger Couple Task on Landing
    const matchedTask = resolveTaskForStep(landedStepType, landedStepNumber);
    setActiveTask(matchedTask);
    playPopup();
    setCurrentStep("task");
    setTimerSecondsLeft(matchedTask.timerSeconds || 0);

    // Sync state with server
    if (sessionId) {
      apiFetch(`${env.EXPO_PUBLIC_API_URL}/api/ludo/session/${sessionId}/sync`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentTurn,
          currentStep: "task",
          lastDiceRoll: roll,
          tokens: currentWorkingTokens,
          activeTask: matchedTask,
        }),
      });
    }
  };

  // 6. Match Task from Seed/Admin List
  const resolveTaskForStep = (
    stepType: "normal" | "star" | "home_entry" | "home_stretch" | "home",
    stepNumber: number
  ): LudoTask => {
    // 1. Try exact stepNumber match
    let match = allTasks.find((t) => t.stepNumber === stepNumber);
    if (match) return match;

    // 2. Try stepType match
    const typeMatches = allTasks.filter((t) => t.stepType === stepType);
    if (typeMatches.length > 0) {
      return typeMatches[Math.floor(Math.random() * typeMatches.length)];
    }

    // 3. Fallback intimate task
    return {
      id: 9999,
      stepNumber,
      stepType,
      title: "Intimate Kiss & Caress",
      description: "Pull your partner close for a deep 20-second French kiss and gently nibble their lower lip.",
      category: "Intimate",
      performer: "both",
      timerSeconds: 20,
    };
  };

  // 7. Complete Task & Advance Turn
  const handleCompleteTask = async () => {
    setIsTimerRunning(false);
    setActiveTask(null);

    // If active player has all chips in Home, celebrate Victory!
    const currentPlayerTokens = tokens[players[currentTurn]?.color] || [];
    const allHome = currentPlayerTokens.length > 0 && currentPlayerTokens.every((t) => t.state === "home");
    if (allHome) {
      const winPlayer = players[currentTurn];
      setWinner(winPlayer);
      playWin();
      if (sessionId) {
        apiFetch(`${env.EXPO_PUBLIC_API_URL}/api/ludo/session/${sessionId}/end`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed", winnerId: winPlayer.color }),
        });
      }
      return;
    }

    // Rule: Rolling a 6 gives another turn!
    const gotSix = diceRoll === 6;
    const nextTurn = gotSix ? currentTurn : (currentTurn + 1) % players.length;

    setCurrentTurn(nextTurn);
    setCurrentStep("roll");
    setDiceRoll(null);

    if (sessionId) {
      apiFetch(`${env.EXPO_PUBLIC_API_URL}/api/ludo/session/${sessionId}/task-complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nextTurn,
          currentStep: "roll",
          tokens,
        }),
      });
    }
  };

  // 8. Timer Handling
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSecondsLeft > 0) {
      interval = setInterval(() => {
        setTimerSecondsLeft((s) => {
          if (s <= 1) {
            setIsTimerRunning(false);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSecondsLeft]);

  // 9. Leave Game (Preserves Server State) vs End Game (Terminates)
  const handleLeaveGame = () => {
    router.replace("/(game)");
  };

  const handleEndGame = () => {
    Alert.alert(
      "End Game Session?",
      "Are you sure you want to end this game? The session will be closed on the server.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Game",
          style: "destructive",
          onPress: async () => {
            if (sessionId) {
              await apiFetch(`${env.EXPO_PUBLIC_API_URL}/api/ludo/session/${sessionId}/end`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "abandoned" }),
              });
            }
            router.replace("/(game)");
          },
        },
      ]
    );
  };

  // Calculate cell occupancy to avoid overlap when multiple chips share a square
  const cellOccupants: Record<string, Array<{ color: string; tokenId: number }>> = {};
  Object.keys(tokens).forEach((col) => {
    (tokens[col] || []).forEach((t) => {
      if (t.state === "track") {
        const key = `track_${t.position}`;
        if (!cellOccupants[key]) cellOccupants[key] = [];
        cellOccupants[key].push({ color: col, tokenId: t.id });
      } else if (t.state === "home_run") {
        const key = `hr_${col}_${t.position}`;
        if (!cellOccupants[key]) cellOccupants[key] = [];
        cellOccupants[key].push({ color: col, tokenId: t.id });
      }
    });
  });

  const getTokenCoordinates = (color: string, tok: LudoToken): { cx: number; cy: number; isStacked: boolean } => {
    if (tok.state === "base") {
      const baseSpots = BASE_GRID_SPOTS[color] || BASE_GRID_SPOTS.red;
      const spot = baseSpots[tok.id % baseSpots.length];
      return {
        cx: spot[0] * CELL_SIZE,
        cy: spot[1] * CELL_SIZE,
        isStacked: false,
      };
    }
    if (tok.state === "track") {
      const trackCoord = TRACK_COORDS[tok.position] || [0, 0];
      const key = `track_${tok.position}`;
      const occupants = cellOccupants[key] || [];
      const occIdx = occupants.findIndex((o) => o.color === color && o.tokenId === tok.id);
      let dx = 0;
      let dy = 0;
      const isStacked = occupants.length > 1;
      if (isStacked) {
        const offsetDist = CELL_SIZE * 0.22;
        if (occupants.length === 2) {
          dx = occIdx === 0 ? -offsetDist : offsetDist;
          dy = occIdx === 0 ? -offsetDist : offsetDist;
        } else if (occupants.length === 3) {
          if (occIdx === 0) { dx = -offsetDist; dy = -offsetDist; }
          else if (occIdx === 1) { dx = offsetDist; dy = -offsetDist; }
          else { dx = 0; dy = offsetDist; }
        } else {
          const cornerOffsets = [
            [-offsetDist, -offsetDist],
            [offsetDist, -offsetDist],
            [-offsetDist, offsetDist],
            [offsetDist, offsetDist],
          ];
          dx = cornerOffsets[occIdx % 4][0];
          dy = cornerOffsets[occIdx % 4][1];
        }
      }
      return {
        cx: (trackCoord[0] + 0.5) * CELL_SIZE + dx,
        cy: (trackCoord[1] + 0.5) * CELL_SIZE + dy,
        isStacked,
      };
    }
    if (tok.state === "home_run") {
      const hrCoords = HOME_RUN_COORDS[color] || [];
      const coord = hrCoords[tok.position] || [7, 7];
      return {
        cx: (coord[0] + 0.5) * CELL_SIZE,
        cy: (coord[1] + 0.5) * CELL_SIZE,
        isStacked: false,
      };
    }
    if (tok.state === "home") {
      const hc = HOME_GRID_SPOTS[color] || [7.5, 7.5];
      const offset = ((tok.id % 4) - 1.5) * (CELL_SIZE * 0.18);
      return {
        cx: hc[0] * CELL_SIZE + offset,
        cy: hc[1] * CELL_SIZE + offset,
        isStacked: true,
      };
    }
    return { cx: 0, cy: 0, isStacked: false };
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#ef4444" />
        <Text style={{ marginTop: 14, color: "#0f172a", fontFamily: "Nunito_700Bold", fontSize: 16 }}>
          Loading Couples Ludo...
        </Text>
      </View>
    );
  }

  const activePlayer = players[currentTurn] || { name: "Player 1", color: "red" };
  const activeColorTheme = PLAYER_COLORS[activePlayer.color] || PLAYER_COLORS.red;

  // Player slot mapping matching Gameludo.svg 4-corner layout
  let pTopLeft: LudoPlayer | null = null;
  let pTopRight: LudoPlayer | null = null;
  let pBottomLeft: LudoPlayer | null = null;
  let pBottomRight: LudoPlayer | null = null;

  if (players.length >= 4) {
    pTopLeft = players.find((p) => p.color === "yellow") || players[0];
    pTopRight = players.find((p) => p.color === "green") || players[1];
    pBottomLeft = players.find((p) => p.color === "blue") || players[2];
    pBottomRight = players.find((p) => p.color === "red") || players[3];
  } else if (players.length === 3) {
    pTopLeft = players[0] || null;
    pTopRight = players[1] || null;
    pBottomLeft = players[2] || null;
    pBottomRight = null;
  } else if (players.length === 2) {
    pTopLeft = players[0] || null;
    pBottomRight = players[1] || null;
  } else if (players.length === 1) {
    pTopLeft = players[0] || null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#1e102d" }}>
      {/* ── 1. EXACT WALLPAPER BACKGROUND FROM GAMELUDO.SVG ── */}
      <Image
        source={BG_IMAGE}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />

      {/* ── 2. TOP NAVIGATION BAR (Settings & Exit Only, Matching Gameludo.svg) ── */}
      <View
        style={{
          paddingTop: 50,
          paddingHorizontal: 20,
          paddingBottom: 6,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 10,
        }}
      >
        {/* Settings Button (Matching Pink Rounded Icon in Gameludo.svg) */}
        <Pressable
          onPress={() => {
            if (players.length > 0) {
              setSetupPlayerCount(players.length as any);
              setCustomPlayers((prev) => {
                const next = [...prev];
                players.forEach((p, idx) => {
                  if (idx < next.length) {
                    next[idx] = { name: p.name, color: p.color };
                  }
                });
                return next;
              });
            }
            setShowSetupModal(true);
          }}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: "#FF4B81",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#FF4B81",
            shadowOpacity: 0.5,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
            elevation: 5,
            borderWidth: 1.5,
            borderColor: "rgba(255, 255, 255, 0.4)",
            transform: [{ scale: pressed ? 0.94 : 1 }],
          })}
        >
          <Ionicons name="settings-sharp" size={22} color="#ffffff" />
        </Pressable>

        {/* Exit / Save Game Button (Matching Pink Rounded Icon in Gameludo.svg) */}
        <Pressable
          onPress={handleLeaveGame}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: "#FF4B81",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#FF4B81",
            shadowOpacity: 0.5,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
            elevation: 5,
            borderWidth: 1.5,
            borderColor: "rgba(255, 255, 255, 0.4)",
            transform: [{ scale: pressed ? 0.94 : 1 }],
          })}
        >
          <Ionicons name="exit-outline" size={22} color="#ffffff" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ alignItems: "center", paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* ── 3. TOP PLAYER CARDS & SPEECH BUBBLE DICE ── */}
        <View
          style={{
            width: CARD_ROW_WIDTH,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginVertical: 10,
            zIndex: 10,
          }}
        >
          {/* Top-Left Card */}
          <PlayerCard
            player={pTopLeft}
            slotTheme={PLAYER_COLORS.yellow}
            isActive={pTopLeft?.id === activePlayer.id}
            canRoll={currentStep === "roll" && !isRolling && !isMovingToken}
            onPress={handleRollDice}
            tokens={pTopLeft ? tokens[pTopLeft.color] || [] : []}
            coupleProfile={coupleProfile}
          />

          {/* Top-Left Speech Bubble (points Left) */}
          <SpeechBubble
            direction="left"
            player={pTopLeft}
            slotColor={PLAYER_COLORS.yellow.bg}
            isActive={pTopLeft?.id === activePlayer.id}
            canRoll={currentStep === "roll"}
            isRolling={isRolling}
            isMovingToken={isMovingToken}
            diceRoll={diceRoll}
            diceAnim={diceAnim}
            onPress={handleRollDice}
          />

          {/* Top-Right Speech Bubble (points Right) */}
          <SpeechBubble
            direction="right"
            player={pTopRight}
            slotColor={PLAYER_COLORS.green.bg}
            isActive={pTopRight?.id === activePlayer.id}
            canRoll={currentStep === "roll"}
            isRolling={isRolling}
            isMovingToken={isMovingToken}
            diceRoll={diceRoll}
            diceAnim={diceAnim}
            onPress={handleRollDice}
          />

          {/* Top-Right Card */}
          <PlayerCard
            player={pTopRight}
            slotTheme={PLAYER_COLORS.green}
            isActive={pTopRight?.id === activePlayer.id}
            canRoll={currentStep === "roll" && !isRolling && !isMovingToken}
            onPress={handleRollDice}
            tokens={pTopRight ? tokens[pTopRight.color] || [] : []}
            coupleProfile={coupleProfile}
          />
        </View>

        {/* ── 4. 100% PURE CODE-BASED LUDO BOARD ── */}
        <View
          style={{
            width: BOARD_FRAME_SIZE,
            height: BOARD_FRAME_SIZE,
            borderRadius: 24,
            backgroundColor: "#16193b",
            borderWidth: 3,
            borderColor: "rgba(255, 255, 255, 0.35)",
            padding: BOARD_PADDING,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOpacity: 0.4,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: 10,
          }}
        >
          <View
            style={{
              width: BOARD_GRID_SIZE,
              height: BOARD_GRID_SIZE,
              position: "relative",
              overflow: "hidden",
              borderRadius: 16,
              backgroundColor: "#0d1029",
            }}
          >
            {/* 4 Corner Yards */}
            <View style={{ position: "absolute", left: 0, top: 0 }}>
              <LudoYard
                color="red"
                size={CELL_SIZE * 6}
                player={players.find((p) => p.color === "red")}
                isActiveTurn={activePlayer.color === "red"}
              />
            </View>

            <View style={{ position: "absolute", left: CELL_SIZE * 9, top: 0 }}>
              <LudoYard
                color="green"
                size={CELL_SIZE * 6}
                player={players.find((p) => p.color === "green")}
                isActiveTurn={activePlayer.color === "green"}
              />
            </View>

            <View style={{ position: "absolute", left: 0, top: CELL_SIZE * 9 }}>
              <LudoYard
                color="blue"
                size={CELL_SIZE * 6}
                player={players.find((p) => p.color === "blue")}
                isActiveTurn={activePlayer.color === "blue"}
              />
            </View>

            <View style={{ position: "absolute", left: CELL_SIZE * 9, top: CELL_SIZE * 9 }}>
              <LudoYard
                color="yellow"
                size={CELL_SIZE * 6}
                player={players.find((p) => p.color === "yellow")}
                isActiveTurn={activePlayer.color === "yellow"}
              />
            </View>

            {/* 52 Perimeter Track Cells */}
            {TRACK_COORDS.map(([col, row], idx) => {
              const isSafeStar =
                (col === 6 && row === 2) ||
                (col === 2 && row === 8) ||
                (col === 12 && row === 6) ||
                (col === 8 && row === 12);

              const isRedGateway = col === 0 && row === 7;
              const isGreenGateway = col === 7 && row === 0;
              const isYellowGateway = col === 14 && row === 7;
              const isBlueGateway = col === 7 && row === 14;

              const isRedStart = col === 1 && row === 6;
              const isGreenStart = col === 8 && row === 1;
              const isYellowStart = col === 13 && row === 8;
              const isBlueStart = col === 6 && row === 13;

              return (
                <View
                  key={`track-cell-${idx}-${col}-${row}`}
                  style={{
                    position: "absolute",
                    left: col * CELL_SIZE,
                    top: row * CELL_SIZE,
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View
                    style={{
                      width: CELL_SIZE - 2,
                      height: CELL_SIZE - 2,
                      borderRadius: 4,
                      backgroundColor: "#ffffff",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 0.5,
                      borderColor: "rgba(0, 0, 0, 0.08)",
                    }}
                  >
                    {isSafeStar && (
                      <Ionicons
                        name="star"
                        size={CELL_SIZE * 0.58}
                        color={
                          col === 6 && row === 2
                            ? PLAYER_COLORS.red.bg
                            : col === 2 && row === 8
                            ? PLAYER_COLORS.blue.bg
                            : col === 12 && row === 6
                            ? PLAYER_COLORS.green.bg
                            : PLAYER_COLORS.yellow.bg
                        }
                      />
                    )}

                    {isRedGateway && (
                      <Ionicons name="play" size={CELL_SIZE * 0.42} color={PLAYER_COLORS.red.bg} />
                    )}
                    {isGreenGateway && (
                      <Ionicons
                        name="play"
                        size={CELL_SIZE * 0.42}
                        color={PLAYER_COLORS.green.bg}
                        style={{ transform: [{ rotate: "90deg" }] }}
                      />
                    )}
                    {isYellowGateway && (
                      <Ionicons
                        name="play"
                        size={CELL_SIZE * 0.42}
                        color={PLAYER_COLORS.yellow.bg}
                        style={{ transform: [{ rotate: "180deg" }] }}
                      />
                    )}
                    {isBlueGateway && (
                      <Ionicons
                        name="play"
                        size={CELL_SIZE * 0.42}
                        color={PLAYER_COLORS.blue.bg}
                        style={{ transform: [{ rotate: "270deg" }] }}
                      />
                    )}

                    {(isRedStart || isGreenStart || isYellowStart || isBlueStart) && (
                      <View
                        style={{
                          width: CELL_SIZE * 0.28,
                          height: CELL_SIZE * 0.28,
                          borderRadius: 999,
                          backgroundColor: isRedStart
                            ? PLAYER_COLORS.red.bg
                            : isGreenStart
                            ? PLAYER_COLORS.green.bg
                            : isYellowStart
                            ? PLAYER_COLORS.yellow.bg
                            : PLAYER_COLORS.blue.bg,
                        }}
                      />
                    )}
                  </View>
                </View>
              );
            })}

            {/* 4 Home Stretches (5 Cells Each) */}
            {(["red", "green", "yellow", "blue"] as const).map((colorKey) => {
              const coords = HOME_RUN_COORDS[colorKey];
              const themeC = PLAYER_COLORS[colorKey];
              return coords.map(([col, row], sIdx) => (
                <View
                  key={`home-stretch-${colorKey}-${sIdx}`}
                  style={{
                    position: "absolute",
                    left: col * CELL_SIZE,
                    top: row * CELL_SIZE,
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View
                    style={{
                      width: CELL_SIZE - 2,
                      height: CELL_SIZE - 2,
                      borderRadius: 4,
                      backgroundColor: themeC.bg,
                      borderWidth: 0.5,
                      borderColor: "rgba(255, 255, 255, 0.45)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {sIdx === 4 && (
                      <Ionicons name="sparkles" size={CELL_SIZE * 0.42} color="#ffffff" />
                    )}
                  </View>
                </View>
              ));
            })}

            {/* 3x3 Center Home Triangles */}
            <LudoCenter size={CELL_SIZE * 3} />

            {/* All Tokens on Board */}
            {Object.keys(tokens).map((color) => {
              const playerTokens = tokens[color] || [];
              const themeC = PLAYER_COLORS[color] || PLAYER_COLORS.red;

              return playerTokens.map((tok) => {
                if (tok.state === "home") return null;

                const { cx, cy, isStacked } = getTokenCoordinates(color, tok);
                const isMovable = movableTokenIds.includes(tok.id) && color === activePlayer.color;
                const isMovingThis = movingTokenId === tok.id && color === activePlayer.color;
                const chipDiameter = isStacked ? Math.max(CELL_SIZE * 0.72, 16) : Math.max(CELL_SIZE * 0.92, 20);

                return (
                  <View
                    key={`chip-${color}-${tok.id}`}
                    pointerEvents={isMovable ? "box-none" : "none"}
                    style={{
                      position: "absolute",
                      left: cx - chipDiameter / 2,
                      top: cy - chipDiameter / 2,
                      width: chipDiameter,
                      height: chipDiameter,
                      zIndex: isMovingThis ? 30 : isMovable ? 25 : 20,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {/* Glowing gold halo if movable */}
                    {isMovable && !isMovingToken && (
                      <View
                        style={{
                          position: "absolute",
                          width: chipDiameter + 8,
                          height: chipDiameter + 8,
                          borderRadius: 999,
                          borderWidth: 2.5,
                          borderColor: "#fbbf24",
                          shadowColor: "#fbbf24",
                          shadowOpacity: 0.85,
                          shadowRadius: 6,
                          elevation: 4,
                        }}
                      />
                    )}

                    {/* Active moving hop ring */}
                    {isMovingThis && (
                      <View
                        style={{
                          position: "absolute",
                          width: chipDiameter + 10,
                          height: chipDiameter + 10,
                          borderRadius: 999,
                          borderWidth: 3,
                          borderColor: "#38bdf8",
                        }}
                      />
                    )}

                    {/* Outer Chip Body */}
                    <View
                      style={{
                        width: chipDiameter,
                        height: chipDiameter,
                        borderRadius: chipDiameter / 2,
                        backgroundColor: themeC.bg,
                        borderWidth: 2,
                        borderColor: "#ffffff",
                        alignItems: "center",
                        justifyContent: "center",
                        shadowColor: "#000",
                        shadowOpacity: 0.35,
                        shadowRadius: 3,
                        elevation: 4,
                      }}
                    >
                      {/* Inner 3D disc */}
                      <View
                        style={{
                          width: chipDiameter * 0.65,
                          height: chipDiameter * 0.65,
                          borderRadius: 999,
                          backgroundColor: themeC.dark || themeC.bg,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: "#ffffff",
                            fontSize: isStacked ? 8 : 10,
                            fontFamily: "DynaPuff_700Bold",
                            textAlign: "center",
                          }}
                        >
                          {tok.id + 1}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              });
            })}

            {/* Touchable Overlay for Movable Tokens */}
            {currentStep === "move" && !isMovingToken &&
              movableTokenIds.map((tokId) => {
                const playerTokens = tokens[activePlayer.color] || [];
                const tok = playerTokens.find((t) => t.id === tokId);
                if (!tok) return null;

                const { cx, cy, isStacked } = getTokenCoordinates(activePlayer.color, tok);
                const touchDiameter = isStacked ? CELL_SIZE * 1.1 : CELL_SIZE * 1.35;

                return (
                  <Pressable
                    key={`touch-tok-${tokId}`}
                    onPress={() => moveToken(tokId, diceRoll || 1, activePlayer.color)}
                    style={{
                      position: "absolute",
                      left: cx - touchDiameter / 2,
                      top: cy - touchDiameter / 2,
                      width: touchDiameter,
                      height: touchDiameter,
                      backgroundColor: "rgba(251, 191, 36, 0.35)",
                      borderRadius: 999,
                      borderWidth: 2,
                      borderColor: "#fbbf24",
                      zIndex: 40,
                    }}
                  />
                );
              })}
          </View>
        </View>

        {/* ── 5. BOTTOM PLAYER CARDS & SPEECH BUBBLES ── */}
        <View
          style={{
            width: CARD_ROW_WIDTH,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginVertical: 10,
            zIndex: 10,
          }}
        >
          {/* Bottom-Left Card */}
          <PlayerCard
            player={pBottomLeft}
            slotTheme={PLAYER_COLORS.blue}
            isActive={pBottomLeft?.id === activePlayer.id}
            canRoll={currentStep === "roll" && !isRolling && !isMovingToken}
            onPress={handleRollDice}
            tokens={pBottomLeft ? tokens[pBottomLeft.color] || [] : []}
            coupleProfile={coupleProfile}
          />

          {/* Bottom-Left Speech Bubble (points Left) */}
          <SpeechBubble
            direction="left"
            player={pBottomLeft}
            slotColor={PLAYER_COLORS.blue.bg}
            isActive={pBottomLeft?.id === activePlayer.id}
            canRoll={currentStep === "roll"}
            isRolling={isRolling}
            isMovingToken={isMovingToken}
            diceRoll={diceRoll}
            diceAnim={diceAnim}
            onPress={handleRollDice}
          />

          {/* Bottom-Right Speech Bubble (points Right) */}
          <SpeechBubble
            direction="right"
            player={pBottomRight}
            slotColor={PLAYER_COLORS.red.bg}
            isActive={pBottomRight?.id === activePlayer.id}
            canRoll={currentStep === "roll"}
            isRolling={isRolling}
            isMovingToken={isMovingToken}
            diceRoll={diceRoll}
            diceAnim={diceAnim}
            onPress={handleRollDice}
          />

          {/* Bottom-Right Card */}
          <PlayerCard
            player={pBottomRight}
            slotTheme={PLAYER_COLORS.red}
            isActive={pBottomRight?.id === activePlayer.id}
            canRoll={currentStep === "roll" && !isRolling && !isMovingToken}
            onPress={handleRollDice}
            tokens={pBottomRight ? tokens[pBottomRight.color] || [] : []}
            coupleProfile={coupleProfile}
          />
        </View>
      </ScrollView>

      {/* ─── COUPLE TASK MODAL (Smooth Animated Pop-in) ─── */}
      {activeTask && (
        <Modal visible={true} transparent={true} animationType="fade">
          <View style={{ flex: 1, backgroundColor: "rgba(15, 23, 42, 0.45)", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <Animated.View
              style={{
                transform: [{ scale: taskModalScale }],
                opacity: taskModalOpacity,
                width: "100%",
                maxWidth: 360,
                backgroundColor: "#ffffff",
                borderRadius: 32,
                padding: 24,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#f1f5f9",
                shadowColor: "#0f172a",
                shadowOpacity: 0.15,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 10 },
                elevation: 10,
              }}
            >
              {/* Header Icon / Badge */}
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: "#fff1f2",
                  borderWidth: 1.5,
                  borderColor: "#ffe4e6",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                  shadowColor: "#e11d48",
                  shadowOpacity: 0.18,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 3 },
                }}
              >
                {activeTask.categoryImageUrl ? (
                  <Image
                    source={{
                      uri: activeTask.categoryImageUrl.startsWith("http")
                        ? activeTask.categoryImageUrl
                        : `${env.EXPO_PUBLIC_API_URL}${activeTask.categoryImageUrl}`,
                    }}
                    style={{ width: 44, height: 44, borderRadius: 22 }}
                    resizeMode="cover"
                  />
                ) : activeTask.stepType === "home" ? (
                  <Ionicons name="trophy" size={32} color="#d97706" />
                ) : activeTask.category === "Dare" ? (
                  <Ionicons name="flame" size={32} color="#ea580c" />
                ) : activeTask.category === "Truth" ? (
                  <Ionicons name="chatbubble-ellipses" size={30} color="#7c3aed" />
                ) : activeTask.category === "Lick" || activeTask.category === "Kiss" || activeTask.category === "Intimate" ? (
                  <Ionicons name="heart" size={32} color="#e11d48" />
                ) : activeTask.stepType === "star" ? (
                  <Ionicons name="star" size={32} color="#f59e0b" />
                ) : activeTask.stepType === "home_entry" ? (
                  <MaterialCommunityIcons name="flag-checkered" size={32} color="#10b981" />
                ) : (
                  <MaterialCommunityIcons name="cards-playing-heart-multiple-outline" size={32} color="#ef4444" />
                )}
              </View>

              {/* Task Tag */}
              {(() => {
                const isDare = activeTask.category === "Dare";
                const isTruth = activeTask.category === "Truth";
                const isLick = activeTask.category === "Lick";
                const isKiss = activeTask.category === "Kiss";
                const tagBg = isDare ? "#fff7ed" : isTruth ? "#f5f3ff" : "#fff1f2";
                const tagBorder = isDare ? "#fed7aa" : isTruth ? "#ddd6fe" : "#fecdd3";
                const tagColor = isDare ? "#ea580c" : isTruth ? "#7c3aed" : isLick ? "#be123c" : isKiss ? "#e11d48" : "#e11d48";
                return (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                      borderRadius: 12,
                      backgroundColor: tagBg,
                      borderWidth: 1,
                      borderColor: tagBorder,
                      marginBottom: 10,
                    }}
                  >
                    {activeTask.categoryImageUrl ? (
                      <Image
                        source={{
                          uri: activeTask.categoryImageUrl.startsWith("http")
                            ? activeTask.categoryImageUrl
                            : `${env.EXPO_PUBLIC_API_URL}${activeTask.categoryImageUrl}`,
                        }}
                        style={{ width: 14, height: 14, borderRadius: 7, marginRight: 6 }}
                        resizeMode="cover"
                      />
                    ) : null}
                    <Text style={{ fontSize: 11, fontFamily: "Nunito_700Bold", color: tagColor, textTransform: "uppercase" }}>
                      {activeTask.category} •{" "}
                      {activeTask.performer === "lander"
                        ? `${activePlayer.name} Performs`
                        : activeTask.performer === "partner"
                        ? "Partner Performs"
                        : "Both Perform Together"}
                    </Text>
                  </View>
                );
              })()}

              {/* Task Title */}
              <Text
                style={{
                  fontSize: 20,
                  fontFamily: "DynaPuff_700Bold",
                  color: "#0f172a",
                  textAlign: "center",
                  marginBottom: 12,
                }}
              >
                {activeTask.title}
              </Text>

              {/* Step / Task Image (if uploaded) */}
              {activeTask.imageUrl ? (
                <View
                  style={{
                    width: "100%",
                    height: 160,
                    borderRadius: 20,
                    overflow: "hidden",
                    marginBottom: 14,
                    backgroundColor: "#f1f5f9",
                    borderWidth: 1.5,
                    borderColor: "#e2e8f0",
                    shadowColor: "#0f172a",
                    shadowOpacity: 0.08,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                  }}
                >
                  <Image
                    source={{
                      uri: activeTask.imageUrl.startsWith("http")
                        ? activeTask.imageUrl
                        : `${env.EXPO_PUBLIC_API_URL}${activeTask.imageUrl}`,
                    }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                </View>
              ) : null}

              {/* Task Prompt / Description */}
              <View
                style={{
                  width: "100%",
                  backgroundColor: "#f8fafc",
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "#f1f5f9",
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    color: "#334155",
                    textAlign: "center",
                    lineHeight: 23,
                    fontFamily: "Nunito_700Bold",
                  }}
                >
                  {activeTask.description}
                </Text>
              </View>

              {/* Timer Section (if applicable) */}
              {activeTask.timerSeconds > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#fff1f2",
                    borderWidth: 1,
                    borderColor: "#fecdd3",
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    borderRadius: 20,
                    marginBottom: 20,
                    gap: 12,
                  }}
                >
                  <Ionicons name="timer-outline" size={22} color="#e11d48" />
                  <Text style={{ fontSize: 20, fontFamily: "DynaPuff_700Bold", color: "#e11d48" }}>
                    {timerSecondsLeft}s
                  </Text>
                  <Pressable
                    onPress={() => setIsTimerRunning(!isTimerRunning)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                      borderRadius: 10,
                      backgroundColor: "#e11d48",
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 12, fontFamily: "Nunito_700Bold" }}>
                      {isTimerRunning ? "Pause" : "Start Timer"}
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Done Button */}
              <Pressable
                onPress={handleCompleteTask}
                style={({ pressed }) => ({
                  width: "100%",
                  paddingVertical: 14,
                  borderRadius: 20,
                  backgroundColor: "#10b981",
                  alignItems: "center",
                  opacity: pressed ? 0.85 : 1,
                  shadowColor: "#10b981",
                  shadowOpacity: 0.35,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                })}
              >
                <Text style={{ color: "#ffffff", fontSize: 16, fontFamily: "DynaPuff_700Bold" }}>
                  Task Done! Next Turn ➔
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </Modal>
      )}

      {/* ─── RESUME SESSION MODAL (Smooth Animated Pop-in) ─── */}
      {showResumeModal && activeSession && (
        <Modal visible={true} transparent={true} animationType="fade">
          <View style={{ flex: 1, backgroundColor: "rgba(15, 23, 42, 0.45)", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <Animated.View
              style={{
                transform: [{ scale: resumeModalScale }],
                opacity: resumeModalOpacity,
                width: "100%",
                maxWidth: 340,
                backgroundColor: "#ffffff",
                borderRadius: 28,
                padding: 24,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#f1f5f9",
                shadowColor: "#0f172a",
                shadowOpacity: 0.15,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 10 },
                elevation: 10,
              }}
            >
              {/* 3D Dice Icon Badge */}
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: "#fee2e2",
                  borderWidth: 2,
                  borderColor: "#fecaca",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                  shadowColor: "#ef4444",
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                }}
              >
                <MaterialCommunityIcons name="dice-multiple" size={34} color="#ef4444" />
              </View>

              <Text style={{ fontSize: 20, fontFamily: "DynaPuff_700Bold", color: "#0f172a", marginBottom: 6 }}>
                Active Game Found!
              </Text>
              <Text style={{ fontSize: 14, color: "#64748b", textAlign: "center", marginBottom: 20, lineHeight: 20 }}>
                You have a game in progress. Would you like to resume where you left off or start a new game?
              </Text>

              <Pressable
                onPress={() => handleResumeSession()}
                style={({ pressed }) => ({
                  width: "100%",
                  paddingVertical: 14,
                  borderRadius: 18,
                  backgroundColor: "#ef4444",
                  alignItems: "center",
                  marginBottom: 10,
                  opacity: pressed ? 0.85 : 1,
                  shadowColor: "#ef4444",
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 3 },
                })}
              >
                <Text style={{ color: "#ffffff", fontSize: 16, fontFamily: "DynaPuff_700Bold" }}>
                  Resume Game
                </Text>
              </Pressable>

              <Pressable
                onPress={handleStartNewGameFromResume}
                style={({ pressed }) => ({
                  width: "100%",
                  paddingVertical: 12,
                  borderRadius: 18,
                  backgroundColor: "#f1f5f9",
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                  alignItems: "center",
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ color: "#334155", fontSize: 14, fontFamily: "Nunito_700Bold" }}>
                  Start New Game
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </Modal>
      )}

      {/* ─── NEW GAME SETUP / SETTINGS MODAL (Smooth Animated Pop-in) ─── */}
      {showSetupModal && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={handleCloseSetupModal}
        >
          <View style={{ flex: 1, backgroundColor: "rgba(15, 23, 42, 0.5)", alignItems: "center", justifyContent: "center", padding: 20 }}>
            {/* Backdrop tap to close */}
            <Pressable
              style={StyleSheet.absoluteFillObject}
              onPress={handleCloseSetupModal}
            />

            <Animated.View
              style={{
                transform: [{ scale: setupModalScale }],
                opacity: setupModalOpacity,
                width: "100%",
                maxWidth: 380,
                maxHeight: "90%",
                backgroundColor: "#ffffff",
                borderRadius: 28,
                padding: 22,
                borderWidth: 1,
                borderColor: "#f1f5f9",
                shadowColor: "#0f172a",
                shadowOpacity: 0.18,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 12 },
                elevation: 12,
                position: "relative",
              }}
            >
              {/* Close Button (X) */}
              <Pressable
                onPress={handleCloseSetupModal}
                hitSlop={12}
                style={({ pressed }) => ({
                  position: "absolute",
                  top: 16,
                  right: 16,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "#f1f5f9",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 30,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Ionicons name="close" size={20} color="#475569" />
              </Pressable>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                {/* 3D Gamepad / Settings Icon Badge */}
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: "#fee2e2",
                    borderWidth: 2,
                    borderColor: "#fecaca",
                    alignItems: "center",
                    justifyContent: "center",
                    alignSelf: "center",
                    marginBottom: 10,
                    shadowColor: "#ef4444",
                    shadowOpacity: 0.2,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 3 },
                  }}
                >
                  <MaterialCommunityIcons
                    name={sessionId ? "cog-outline" : "gamepad-variant"}
                    size={30}
                    color="#ef4444"
                  />
                </View>

                <Text style={{ fontSize: 22, fontFamily: "DynaPuff_700Bold", color: "#0f172a", textAlign: "center", marginBottom: 4 }}>
                  {sessionId ? "Game Settings" : "Couples Ludo Setup"}
                </Text>
                <Text style={{ fontSize: 13, color: "#64748b", textAlign: "center", marginBottom: 18 }}>
                  {sessionId
                    ? "Customize player names or restart game"
                    : "Pass & Play • Customize player names & colors"}
                </Text>

                {/* Player Count Selection */}
                <Text style={{ fontSize: 13, fontFamily: "Nunito_700Bold", color: "#334155", marginBottom: 8 }}>
                  Number of Players:
                </Text>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 18 }}>
                  {[2, 3, 4].map((count) => {
                    const isSel = setupPlayerCount === count;
                    return (
                      <Pressable
                        key={`p-count-${count}`}
                        onPress={() => setSetupPlayerCount(count as any)}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 16,
                          backgroundColor: isSel ? "#ef4444" : "#f8fafc",
                          alignItems: "center",
                          borderWidth: 1,
                          borderColor: isSel ? "#ef4444" : "#e2e8f0",
                        }}
                      >
                        <Text style={{ fontSize: 15, fontFamily: "DynaPuff_700Bold", color: isSel ? "#fff" : "#334155" }}>
                          {count} Players
                        </Text>
                        <Text style={{ fontSize: 10, color: isSel ? "rgba(255,255,255,0.85)" : "#64748b", marginTop: 2 }}>
                          {count === 2 ? "Duel" : count === 3 ? "Trio" : "Party"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Player Cards (Custom Name & Color Selection) */}
                <Text style={{ fontSize: 13, fontFamily: "Nunito_700Bold", color: "#334155", marginBottom: 8 }}>
                  Player Names & Colors:
                </Text>

                <View style={{ gap: 10, marginBottom: 18 }}>
                  {Array.from({ length: setupPlayerCount }).map((_, idx) => {
                    const player = customPlayers[idx] || { name: `Player ${idx + 1}`, color: "red" };
                    const themeCol = PLAYER_COLORS[player.color];

                    return (
                      <View
                        key={`player-card-${idx}`}
                        style={{
                          backgroundColor: "#f8fafc",
                          borderRadius: 18,
                          padding: 12,
                          borderWidth: 1.5,
                          borderColor: themeCol.border + "40",
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: themeCol.bg, marginRight: 6 }} />
                            <Text style={{ fontSize: 13, fontFamily: "Nunito_700Bold", color: "#1e293b" }}>
                              Player {idx + 1}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 11, fontFamily: "Nunito_700Bold", color: themeCol.border, textTransform: "capitalize" }}>
                            {player.color}
                          </Text>
                        </View>

                        {/* Name Input */}
                        <TextInput
                          value={player.name}
                          onChangeText={(text) => handleUpdatePlayerName(idx, text)}
                          placeholder={`Enter Player ${idx + 1} name`}
                          placeholderTextColor="#94a3b8"
                          style={{
                            backgroundColor: "#ffffff",
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            fontSize: 14,
                            color: "#0f172a",
                            borderWidth: 1,
                            borderColor: "#e2e8f0",
                            marginBottom: 10,
                          }}
                        />

                        {/* Color Selector */}
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                          <Text style={{ fontSize: 11, color: "#64748b", fontFamily: "Nunito_700Bold" }}>
                            Pick Color:
                          </Text>
                          <View style={{ flexDirection: "row", gap: 10 }}>
                            {COLOR_OPTIONS.map((c) => {
                              const isPicked = player.color === c.key;
                              return (
                                <Pressable
                                  key={`p${idx}-col-${c.key}`}
                                  onPress={() => handleSelectColor(idx, c.key)}
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor: c.hex,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderWidth: isPicked ? 3 : 1,
                                    borderColor: isPicked ? "#0f172a" : "#ffffff",
                                    shadowColor: c.hex,
                                    shadowOpacity: isPicked ? 0.4 : 0.1,
                                    shadowRadius: 4,
                                    shadowOffset: { width: 0, height: 2 },
                                  }}
                                >
                                  {isPicked && (
                                    <Ionicons name="checkmark" size={18} color="#ffffff" />
                                  )}
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* 4 Chips Standard Indicator */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#f0fdf4",
                    borderRadius: 16,
                    padding: 12,
                    marginBottom: 20,
                    borderWidth: 1,
                    borderColor: "#bbf7d0",
                  }}
                >
                  <MaterialCommunityIcons name="layers-triple" size={24} color="#166534" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontFamily: "DynaPuff_700Bold", color: "#166534" }}>
                      4 Chips per Player (Standard Ludo)
                    </Text>
                    <Text style={{ fontSize: 11, color: "#15803d", marginTop: 2 }}>
                      Each player gets 4 chips. Roll 6 to auto-start from yard or advance chips!
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                {sessionId ? (
                  <View style={{ gap: 10 }}>
                    {/* Save & Keep Playing */}
                    <Pressable
                      onPress={handleSaveSettingsAndContinue}
                      style={({ pressed }) => ({
                        width: "100%",
                        paddingVertical: 14,
                        borderRadius: 18,
                        backgroundColor: "#00A859",
                        alignItems: "center",
                        opacity: pressed ? 0.85 : 1,
                        shadowColor: "#00A859",
                        shadowOpacity: 0.35,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 4 },
                      })}
                    >
                      <Text style={{ color: "#ffffff", fontSize: 16, fontFamily: "DynaPuff_700Bold" }}>
                        Save & Keep Playing ✓
                      </Text>
                    </Pressable>

                    {/* Restart New Game */}
                    <Pressable
                      onPress={handleConfirmRestartGame}
                      style={({ pressed }) => ({
                        width: "100%",
                        paddingVertical: 12,
                        borderRadius: 16,
                        backgroundColor: "#fee2e2",
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: "#fecaca",
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <Text style={{ color: "#ef4444", fontSize: 14, fontFamily: "Nunito_700Bold" }}>
                        Restart New Game ➔
                      </Text>
                    </Pressable>

                    {/* Close Modal */}
                    <Pressable
                      onPress={handleCloseSetupModal}
                      style={({ pressed }) => ({
                        paddingVertical: 8,
                        alignItems: "center",
                        opacity: pressed ? 0.6 : 1,
                      })}
                    >
                      <Text style={{ color: "#64748b", fontSize: 13, fontFamily: "Nunito_700Bold" }}>
                        Cancel / Close
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    <Pressable
                      onPress={handleStartNewSession}
                      style={({ pressed }) => ({
                        width: "100%",
                        paddingVertical: 14,
                        borderRadius: 18,
                        backgroundColor: "#ef4444",
                        alignItems: "center",
                        opacity: pressed ? 0.85 : 1,
                        shadowColor: "#ef4444",
                        shadowOpacity: 0.35,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 4 },
                      })}
                    >
                      <Text style={{ color: "#ffffff", fontSize: 16, fontFamily: "DynaPuff_700Bold" }}>
                        Start Playing ➔
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={handleCloseSetupModal}
                      style={({ pressed }) => ({
                        paddingVertical: 8,
                        alignItems: "center",
                        opacity: pressed ? 0.6 : 1,
                      })}
                    >
                      <Text style={{ color: "#64748b", fontSize: 13, fontFamily: "Nunito_700Bold" }}>
                        Exit to Games
                      </Text>
                    </Pressable>
                  </View>
                )}
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>
      )}

      {/* ─── VICTORY / WINNER CONFETTI (Smooth Animated Pop-in) ─── */}
      {winner && (
        <Modal visible={true} transparent={true} animationType="fade">
          <View style={{ flex: 1, backgroundColor: "rgba(15, 23, 42, 0.45)", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <ConfettiCannon count={150} origin={{ x: SCREEN_WIDTH / 2, y: -20 }} />
            <Animated.View
              style={{
                transform: [{ scale: winnerModalScale }],
                opacity: winnerModalOpacity,
                width: "100%",
                maxWidth: 340,
                backgroundColor: "#ffffff",
                borderRadius: 28,
                padding: 26,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#f1f5f9",
                shadowColor: "#0f172a",
                shadowOpacity: 0.15,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 10 },
                elevation: 10,
              }}
            >
              {/* 3D Crown Icon Badge */}
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: "#fef3c7",
                  borderWidth: 2,
                  borderColor: "#fde68a",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                  shadowColor: "#f59e0b",
                  shadowOpacity: 0.35,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                }}
              >
                <MaterialCommunityIcons name="crown" size={42} color="#f59e0b" />
              </View>

              <Text style={{ fontSize: 24, fontFamily: "DynaPuff_700Bold", color: "#0f172a", textAlign: "center", marginBottom: 6 }}>
                {winner.name} Wins!
              </Text>
              
              <View
                style={{
                  width: "100%",
                  backgroundColor: "#fff1f2",
                  borderRadius: 18,
                  padding: 14,
                  borderWidth: 1.5,
                  borderColor: "#fecdd3",
                  marginBottom: 18,
                  alignItems: "center",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <Ionicons name="flame" size={18} color="#e11d48" />
                  <Text style={{ fontSize: 13, fontFamily: "Nunito_700Bold", color: "#e11d48", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Ultimate Sex Reward
                  </Text>
                </View>
                <Text style={{ fontSize: 14, fontFamily: "Nunito_700Bold", color: "#881337", textAlign: "center", lineHeight: 20 }}>
                  Your chip made it home! The winner can demand <Text style={{ fontFamily: "Nunito_800ExtraBold", color: "#e11d48" }}>ANY sexual desire in ANY style</Text> (any sex position, oral, fantasy, or roleplay) and partner MUST fulfill it
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  setWinner(null);
                  router.replace("/(game)");
                }}
                style={({ pressed }) => ({
                  width: "100%",
                  paddingVertical: 14,
                  borderRadius: 18,
                  backgroundColor: "#ef4444",
                  alignItems: "center",
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#ffffff", fontSize: 16, fontFamily: "DynaPuff_700Bold" }}>
                    Celebrate & Finish
                  </Text>
                  <Ionicons name="trophy" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
                </View>
              </Pressable>
            </Animated.View>
          </View>
        </Modal>
      )}
    </View>
  );
}

