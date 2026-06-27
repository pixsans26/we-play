const fs = require('fs');

function fixBorders(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix S.turnPill border by removing borderWidth
  content = content.replace(/turnPill: {[\s\S]*?borderWidth: 1.5,\n/, 'turnPill: {\n    borderRadius: 999,\n');
  
  // Replace the View wrappers for BlurView inside turnPillAbsolute
  // Before:
  // <View style={{ borderRadius: 999, overflow: "hidden" }}>
  //   <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={[S.turnPill, {
  //     backgroundColor: ...,
  //     borderColor: ...
  
  content = content.replace(/<View style={{ borderRadius: 999, overflow: "hidden"[^}]*}}>/g, (match) => {
    return `<View style={{ borderRadius: 999, overflow: "hidden", borderWidth: 1.5, borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(147,51,234,0.3)" }}>`;
  });
  
  // Remove borderColor from the BlurView inline style because we moved it to the wrapper
  content = content.replace(/borderColor: isDark \? "[^"]*" : "[^"]*",/g, '');
  
  // Put back BlurView if it was accidentally changed to View
  content = content.replace(/<View style={\[S.turnPill,/g, '<BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={[S.turnPill,');
  content = content.replace(/<\/View>\n(\s*)<\/View>\n(\s*)<\/View>\n(\s*)<\/View>\n(\s*)<Animated\.View style={\[S\.cardOuter/g, '</BlurView>\n$1</View>\n$2</View>\n$3</View>\n$4<Animated.View style={[S.cardOuter');

  fs.writeFileSync(filePath, content);
}

fixBorders('app/(game)/task-scratch.tsx');
fixBorders('app/(game)/image-scratch.tsx');

console.log("Fixed borders");
