import sys

with open("app/(game)/profile.tsx", "r") as f:
    content = f.read()

if "import Reanimated, { FadeInDown }" not in content:
    content = content.replace(
        'import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";',
        'import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";\nimport Reanimated, { FadeInDown } from "react-native-reanimated";'
    )

# 1. Hero
content = content.replace(
    '{/* Couple hero */}\n          <View style={{ marginBottom: 20 }}>',
    '{/* Couple hero */}\n          <Reanimated.View entering={FadeInDown.delay(100).duration(400)} style={{ marginBottom: 20 }}>'
)
content = content.replace(
    '</LinearGradient>\n          </View>\n\n          {/* Stats cards */}',
    '</LinearGradient>\n          </Reanimated.View>\n\n          {/* Stats cards */}'
)

# 2. Stats
content = content.replace(
    '{/* Stats cards */}\n          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>',
    '{/* Stats cards */}\n          <Reanimated.View entering={FadeInDown.delay(200).duration(400)} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>'
)
content = content.replace(
    '</BlurView>\n            </View>\n          </View>\n\n          {/* Partner Cards',
    '</BlurView>\n            </View>\n          </Reanimated.View>\n\n          {/* Partner Cards'
)

# 3. Account
content = content.replace(
    '{/* Account */}\n          <View style={{ borderRadius: 32, overflow: "hidden", marginBottom: 20 }}>',
    '{/* Account */}\n          <Reanimated.View entering={FadeInDown.delay(500).duration(400)} style={{ borderRadius: 32, overflow: "hidden", marginBottom: 20 }}>'
)
content = content.replace(
    '</BlurView>\n          </View>\n\n          {/* History */}',
    '</BlurView>\n          </Reanimated.View>\n\n          {/* History */}'
)

# 4. History
content = content.replace(
    '{/* History */}\n          <View style={{ borderRadius: 999, overflow: "hidden" }}>',
    '{/* History */}\n          <Reanimated.View entering={FadeInDown.delay(600).duration(400)} style={{ borderRadius: 999, overflow: "hidden" }}>'
)
content = content.replace(
    '</Pressable>\n            </BlurView>\n          </View>\n\n          {/* Footer',
    '</Pressable>\n            </BlurView>\n          </Reanimated.View>\n\n          {/* Footer'
)

# Partner cards (I will wrap the fragments)
# We have `isPartnerA ? ( <> ... </> ) : ( <> ... </> )`
content = content.replace(
    '{isPartnerA ? (\n            <>\n              {/* Partner A card (YOU) */}',
    '{isPartnerA ? (\n            <Reanimated.View entering={FadeInDown.delay(300).duration(400)}>\n              {/* Partner A card (YOU) */}'
)
content = content.replace(
    '</LinearGradient>\n            </>\n          ) : (\n            <>\n              {/* Partner B card (YOU) */}',
    '</LinearGradient>\n            </Reanimated.View>\n          ) : (\n            <Reanimated.View entering={FadeInDown.delay(300).duration(400)}>\n              {/* Partner B card (YOU) */}'
)
content = content.replace(
    '</LinearGradient>\n            </>\n          )}\n\n          {/* Account */}',
    '</LinearGradient>\n            </Reanimated.View>\n          )}\n\n          {/* Account */}'
)


with open("app/(game)/profile.tsx", "w") as f:
    f.write(content)
