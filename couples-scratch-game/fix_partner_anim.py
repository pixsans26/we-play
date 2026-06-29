import re

with open("app/(game)/partner.tsx", "r") as f:
    content = f.read()

# Replace the Reanimated.ScrollView wrapper with regular ScrollView
content = content.replace(
    '<Reanimated.ScrollView entering={FadeInDown.delay(500).duration(500)} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 80, paddingBottom: 120, paddingHorizontal: 22 }}>',
    '<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 80, paddingBottom: 120, paddingHorizontal: 22 }}>'
)
content = content.replace('</Reanimated.ScrollView>', '</ScrollView>')

# Now wrap the main top-level sections inside ScrollView
# Looking at partner.tsx:
# - <View style={{ alignItems: "center", marginBottom: 40 }}> (Hero)
# - <Pressable onPress={() => router.push("/calendar")}> (Calendar card)
# - <View style={{ marginTop: 24, gap: 16 }}> (Insights)

counter = [0]
def replacer(match):
    counter[0] += 1
    delay = 100 + counter[0] * 100
    return f'<Reanimated.View entering={{FadeInDown.delay({delay}).duration(400)}}>\n' + match.group(0)

# Replace the exact opening tags we care about with a Reanimated.View wrapper. Wait, this will mean they don't have matching closing tags.
# This approach is too error prone. I will use manual multi_replace_file_content.
