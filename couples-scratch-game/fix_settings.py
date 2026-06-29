import re

with open("app/(game)/settings.tsx", "r") as f:
    content = f.read()

# 1. Remove the outer Reanimated.View
content = content.replace(
    '<Reanimated.View entering={FadeInDown.delay(500).duration(500)} style={{ flex: 1 }}>',
    '<View style={{ flex: 1 }}>'
)
content = content.replace(
    '</ScrollView>\n        </Reanimated.View>',
    '</ScrollView>\n        </View>'
)

# 2. Update SettingRow signature
content = content.replace(
    '  isDark?: boolean;\n}',
    '  isDark?: boolean;\n  index?: number;\n}'
)
content = content.replace(
    'function SettingRow({ icon, iconColor, label, sublabel, right, onPress, theme, danger, isDark }: SettingRowProps) {',
    'function SettingRow({ icon, iconColor, label, sublabel, right, onPress, theme, danger, isDark, index = 0 }: SettingRowProps) {'
)

old_return = '''  return (
    <Pressable'''
new_return = '''  return (
    <Reanimated.View entering={FadeInDown.delay(100 + index * 100).duration(400)}>
    <Pressable'''
content = content.replace(old_return, new_return)

content = content.replace(
    '</BlurView>\n    </Pressable>\n  );',
    '</BlurView>\n    </Pressable>\n    </Reanimated.View>\n  );'
)

# 3. Add indices to SettingRows
# We can just use a regex substitution with a counter
counter = [0]
def add_index(match):
    counter[0] += 1
    return match.group(0) + f' index={{{counter[0]}}}'

content = re.sub(r'<SettingRow', add_index, content)

with open("app/(game)/settings.tsx", "w") as f:
    f.write(content)
print("Updated settings.tsx")
