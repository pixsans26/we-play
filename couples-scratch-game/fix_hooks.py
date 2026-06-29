import re

files = [
    "app/(game)/task-scratch.tsx",
    "app/(game)/lottery.tsx"
]

for file in files:
    with open(file, "r") as f:
        content = f.read()
    
    # We will inject `const addNotification = useNotificationStore((s) => s.addNotification);` just before `const insets = useSafeAreaInsets();`
    if "const addNotification =" not in content:
        content = content.replace(
            "const insets = useSafeAreaInsets();",
            "const addNotification = useNotificationStore((s) => s.addNotification);\n  const insets = useSafeAreaInsets();"
        )
    
    with open(file, "w") as f:
        f.write(content)

