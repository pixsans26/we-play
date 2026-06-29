with open("components/NotificationManager.tsx", "r") as f:
    content = f.read()

# Fix the hook imports and usages
content = content.replace(
    '  const { scratchLimits, limitsNextReset } = useGameStore();\n  const coupleProfile = useAuthStore((s) => s.coupleProfile);\n  const previousLevel = useRef(coupleProfile?.level || 1);\n\n  // Watch for level up\n  useEffect(() => {\n    if (coupleProfile?.level && coupleProfile.level > previousLevel.current) {\n      addNotification({\n        id: `level_up_${coupleProfile.level}`,\n        title: "Level Up! 🎉",\n        message: `Congratulations! You and your partner have reached Level ${coupleProfile.level}!`,\n        time: "Just now",\n        icon: "star",\n        iconColor: "#f59e0b",\n        bgColor: "rgba(245,158,11,0.15)",\n        isNew: true,\n      });\n      previousLevel.current = coupleProfile.level;\n    }\n  }, [coupleProfile?.level, addNotification]);\n',
    '  const { spinCount } = useGameStore();\n  const SPIN_LIMIT = 5; // Default limit for Spin Wheel\n'
)

# Fix the dependency array and the limit check
content = content.replace(
    '          // 2. Game Limit Notification (Fate Wheel example)\n          // If spin wheel limit is greater than 0, they can play\n          if (scratchLimits["lottery"] > 0) {\n',
    '          // 2. Game Limit Notification (Fate Wheel example)\n          if (spinCount < SPIN_LIMIT) {\n'
)
content = content.replace(
    '              message: `You have ${scratchLimits["lottery"]} spins available today. Tap to play!`,\n',
    '              message: `You have ${SPIN_LIMIT - spinCount} spins available today. Tap to play!`,\n'
)
content = content.replace(
    '  }, [cycleConfig, scratchLimits, addNotification]);',
    '  }, [cycleConfig, spinCount, addNotification]);'
)

with open("components/NotificationManager.tsx", "w") as f:
    f.write(content)
