with open("app/_layout.tsx", "r") as f:
    content = f.read()

import_statement = 'import { NotificationManager } from "@/components/NotificationManager";\n'
if import_statement not in content:
    content = content.replace(
        'import { usePushNotifications } from "@/hooks/usePushNotifications";',
        'import { usePushNotifications } from "@/hooks/usePushNotifications";\n' + import_statement
    )

content = content.replace(
    '<StatusBar style={isDark ? "light" : "dark"} />',
    '<StatusBar style={isDark ? "light" : "dark"} />\n      <NotificationManager />'
)

with open("app/_layout.tsx", "w") as f:
    f.write(content)
