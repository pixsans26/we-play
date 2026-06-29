with open("components/NotificationManager.tsx", "r") as f:
    content = f.read()

import_auth = 'import { useAuthStore } from "@/store/authStore";'
if import_auth not in content:
    content = content.replace(
        'import { useGameStore } from "@/store/gameStore";',
        'import { useGameStore } from "@/store/gameStore";\n' + import_auth
    )

content = content.replace(
    '  const { scratchLimits, limitsNextReset } = useGameStore();',
    '  const { scratchLimits, limitsNextReset } = useGameStore();\n  const coupleProfile = useAuthStore((s) => s.coupleProfile);\n  const previousLevel = useRef(coupleProfile?.level || 1);\n\n  // Watch for level up\n  useEffect(() => {\n    if (coupleProfile?.level && coupleProfile.level > previousLevel.current) {\n      addNotification({\n        id: `level_up_${coupleProfile.level}`,\n        title: "Level Up! 🎉",\n        message: `Congratulations! You and your partner have reached Level ${coupleProfile.level}!`,\n        time: "Just now",\n        icon: "star",\n        iconColor: "#f59e0b",\n        bgColor: "rgba(245,158,11,0.15)",\n        isNew: true,\n      });\n      previousLevel.current = coupleProfile.level;\n    }\n  }, [coupleProfile?.level, addNotification]);\n'
)

with open("components/NotificationManager.tsx", "w") as f:
    f.write(content)

