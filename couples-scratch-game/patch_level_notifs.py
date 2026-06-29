import re

files = [
    "app/(game)/task-scratch.tsx",
    "app/(game)/lottery.tsx"
]

for file in files:
    with open(file, "r") as f:
        content = f.read()
    
    if "useNotificationStore" not in content:
        # Import notification store
        content = content.replace(
            'import { useGameStore } from "@/store/gameStore";',
            'import { useGameStore } from "@/store/gameStore";\nimport { useNotificationStore } from "@/store/notificationStore";'
        )
        # Add hook usage in the component
        content = re.sub(
            r'(export default function [A-Za-z0-9_]+\(\) \{\n(?:.*\n)*?)(?=\s*const insets)',
            r'\1  const addNotification = useNotificationStore((s) => s.addNotification);\n',
            content
        )
        
        # Add the notification
        content = content.replace(
            'setNewLevelState(data.currentLevel);',
            'setNewLevelState(data.currentLevel);\n          addNotification({\n            id: `level_up_${data.currentLevel}_${Date.now()}`,\n            title: "Level Up! 🎉",\n            message: `Congratulations! You reached Level ${data.currentLevel}!`,\n            time: "Just now",\n            icon: "star",\n            iconColor: "#f59e0b",\n            bgColor: "rgba(245,158,11,0.15)",\n            isNew: true,\n          });'
        )
        
        with open(file, "w") as f:
            f.write(content)

