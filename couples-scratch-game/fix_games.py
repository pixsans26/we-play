import re

files = [
    "app/(game)/task-scratch.tsx",
    "app/(game)/lottery.tsx"
]

for file in files:
    with open(file, "r") as f:
        content = f.read()

    # 1. Add import
    if "useNotificationStore" not in content:
        content = content.replace(
            'import { useGameStore } from "@/store/gameStore";',
            'import { useGameStore } from "@/store/gameStore";\nimport { useNotificationStore } from "@/store/notificationStore";'
        )

    # 2. Add hook initialization near the top of the component
    # We find `const router = useRouter();` and add it below
    if "const addNotification =" not in content:
        content = content.replace(
            'const router = useRouter();',
            'const router = useRouter();\n  const addNotification = useNotificationStore((s) => s.addNotification);'
        )

    # 3. Add notification logic when level changes
    content = content.replace(
        'setNewLevelState(data.currentLevel);\n                setShowLevelUp(true);',
        'setNewLevelState(data.currentLevel);\n                addNotification({\n                  id: `level_up_${data.currentLevel}_${Date.now()}`,\n                  title: "Level Up! 🎉",\n                  message: `Congratulations! You reached Level ${data.currentLevel}!`,\n                  time: "Just now",\n                  icon: "star",\n                  iconColor: "#f59e0b",\n                  bgColor: "rgba(245,158,11,0.15)",\n                  isNew: true,\n                });\n                setShowLevelUp(true);'
    )
    
    content = content.replace(
        'setNewLevelState(data.currentLevel);\n          setShowLevelUp(true);',
        'setNewLevelState(data.currentLevel);\n          addNotification({\n            id: `level_up_${data.currentLevel}_${Date.now()}`,\n            title: "Level Up! 🎉",\n            message: `Congratulations! You reached Level ${data.currentLevel}!`,\n            time: "Just now",\n            icon: "star",\n            iconColor: "#f59e0b",\n            bgColor: "rgba(245,158,11,0.15)",\n            isNew: true,\n          });\n          setShowLevelUp(true);'
    )

    with open(file, "w") as f:
        f.write(content)

