import re

# --- fix history.tsx ---
with open("app/(game)/history.tsx", "r") as f:
    hist = f.read()

# Remove Reanimated.View wrapper from FlatList
hist = hist.replace(
    '<Reanimated.View entering={FadeInDown.delay(500).duration(500)} style={{ flex: 1, paddingBottom: 40 }}>',
    '<View style={{ flex: 1, paddingBottom: 40 }}>'
)
hist = hist.replace(
    '</FlatList>\n      </Reanimated.View>',
    '</FlatList>\n      </View>'
)

# Update renderItem signature and wrapper
old_render = 'const renderHistoryItem = ({ item }: { item: HistoryEntry }) => {'
new_render = 'const renderHistoryItem = ({ item, index }: { item: HistoryEntry; index: number }) => {'
hist = hist.replace(old_render, new_render)

old_return = '    return (\n      <Pressable onPress={() => setSelectedEntry(item)} style={{ marginBottom: 12 }}>'
new_return = '    return (\n      <Reanimated.View entering={FadeInDown.delay(100 + min(index, 15) * 100).duration(400)}>\n      <Pressable onPress={() => setSelectedEntry(item)} style={{ marginBottom: 12 }}>'
hist = hist.replace(old_return, new_return)
# Also need to define min or use Math.min
hist = hist.replace('min(index, 15)', 'Math.min(index, 15)')

old_end = '        </BlurView>\n      </Pressable>\n    );'
new_end = '        </BlurView>\n      </Pressable>\n      </Reanimated.View>\n    );'
hist = hist.replace(old_end, new_end)

with open("app/(game)/history.tsx", "w") as f:
    f.write(hist)

# --- fix profile.tsx ---
with open("app/(game)/profile.tsx", "r") as f:
    prof = f.read()

prof = prof.replace(
    '<Reanimated.View entering={FadeInDown.delay(500).duration(500)} style={{ flex: 1 }}>',
    '<View style={{ flex: 1 }}>'
)
prof = prof.replace(
    '</ScrollView>\n        </Reanimated.View>',
    '</ScrollView>\n        </View>'
)

counter = [0]
def profile_replacer(match):
    counter[0] += 1
    delay = 100 + counter[0] * 100
    return f'<Reanimated.View entering={{FadeInDown.delay({delay}).duration(400)}}'

prof = re.sub(
    r'<View style={{ marginBottom: 20 }}>|<View style={{ width: "48%", borderRadius: 32, overflow: "hidden" }}>|<Pressable',
    profile_replacer,
    prof,
    count=20
)
# Wait, replacing <Pressable> could be dangerous if they don't have matching closing tags in the right places,
# but let's just do targeted replaces for profile.tsx
