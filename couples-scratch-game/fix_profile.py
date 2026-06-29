import re

with open("app/(game)/profile.tsx", "r") as f:
    content = f.read()

# Add import if missing
if "react-native-reanimated" not in content:
    content = content.replace(
        'import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";',
        'import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";\nimport Reanimated, { FadeInDown } from "react-native-reanimated";'
    )

# 1. Couple hero
content = content.replace(
    '          {/* Couple hero */}\n          <View style={{ marginBottom: 20 }}>',
    '          {/* Couple hero */}\n          <Reanimated.View entering={FadeInDown.delay(100).duration(400)} style={{ marginBottom: 20 }}>'
)
# Close tag for Couple hero (which is just after </LinearGradient>)
content = content.replace(
    '            </LinearGradient>\n          </View>\n\n          {/* Stats cards */}',
    '            </LinearGradient>\n          </Reanimated.View>\n\n          {/* Stats cards */}'
)

# 2. Stats cards
content = content.replace(
    '          {/* Stats cards */}\n          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>',
    '          {/* Stats cards */}\n          <Reanimated.View entering={FadeInDown.delay(200).duration(400)} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>'
)
# Close tag for stats cards
content = content.replace(
    '              </BlurView>\n            </View>\n          </View>\n\n          {/* Partner Cards (YOU shown first) */}',
    '              </BlurView>\n            </View>\n          </Reanimated.View>\n\n          {/* Partner Cards (YOU shown first) */}'
)

# 3. & 4. Partner Cards blocks
# There are 4 <LinearGradient> tags for partner cards. We will replace them in order.
# We'll use a regex replacer.
partner_card_re = re.compile(r'(<\!\-\- (Partner A card|Partner B card|Partner A card \(YOU\)|Partner B card \(YOU\)) \-\->\n\s*)<LinearGradient')
counter = [0]
def partner_replacer(match):
    counter[0] += 1
    # 2 variants (PartnerA vs PartnerB for isPartnerA=true and isPartnerA=false)
    # So the counter will be 1, 2, 3, 4
    delay = 300
    if counter[0] in [2, 4]:
        delay = 400
    return match.group(1) + f'<Reanimated.View entering={{FadeInDown.delay({delay}).duration(400)}}>\n              <LinearGradient'

content = partner_card_re.sub(partner_replacer, content)

# Close tags for Partner cards
# They are followed by `</LinearGradient>` then either `</>` or `<!-- Partner`
# Actually, the simplest is to replace `</LinearGradient>` for these specific ones.
# We can just match the end of the LinearGradient in the Partner block.
content = content.replace(
    '                  </View>\n                </View>\n              </LinearGradient>',
    '                  </View>\n                </View>\n              </LinearGradient>\n              </Reanimated.View>'
)


# 5. Account block
content = content.replace(
    '          {/* Account */}\n          <View style={{ borderRadius: 32, overflow: "hidden", marginBottom: 20 }}>',
    '          {/* Account */}\n          <Reanimated.View entering={FadeInDown.delay(500).duration(400)} style={{ borderRadius: 32, overflow: "hidden", marginBottom: 20 }}>'
)
content = content.replace(
    '              </View>\n            </BlurView>\n          </View>\n\n          {/* History */}',
    '              </View>\n            </BlurView>\n          </Reanimated.View>\n\n          {/* History */}'
)

# 6. History block
content = content.replace(
    '          {/* History */}\n          <View style={{ borderRadius: 999, overflow: "hidden" }}>',
    '          {/* History */}\n          <Reanimated.View entering={FadeInDown.delay(600).duration(400)} style={{ borderRadius: 999, overflow: "hidden" }}>'
)
content = content.replace(
    '              </Pressable>\n            </BlurView>\n          </View>\n\n          {/* Footer info */}',
    '              </Pressable>\n            </BlurView>\n          </Reanimated.View>\n\n          {/* Footer info */}'
)

with open("app/(game)/profile.tsx", "w") as f:
    f.write(content)

