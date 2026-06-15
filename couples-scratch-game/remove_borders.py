import os
import re
import glob

def remove_borders_from_blurviews(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # We want to find BlurView tags and remove their border-related styles.
    # To be safe and since React Native styles are mostly inline dictionaries here,
    # let's just globally replace borderWidth and borderColor inside BlurView styles.
    # Actually, a simpler approach is to use a regex that matches `borderWidth: ..., borderColor: ...,`
    # only within BlurView elements.
    
    # Let's split by <BlurView and process each part
    parts = content.split('<BlurView')
    if len(parts) == 1:
        return
        
    new_parts = [parts[0]]
    for part in parts[1:]:
        # Find the end of the BlurView opening tag
        end_idx = part.find('>')
        if end_idx == -1:
            new_parts.append('<BlurView' + part)
            continue
            
        tag_content = part[:end_idx]
        rest = part[end_idx:]
        
        # Remove borderWidth: <value>,
        tag_content = re.sub(r'borderWidth:\s*[\d.]+\s*,?\s*', '', tag_content)
        # Remove borderColor: <value>, where value can be a string, ternary, etc.
        # It's tricky because of ternary operators like `isDark ? "rgba..." : "rgba..."`
        # Let's use a simpler regex: match `borderColor:` up to the next comma or closing brace
        # Wait, ternary has colons. 
        # Better: match `borderColor:.*?,\s*` where `.*?` matches non-greedily, 
        # but we need to balance parentheses or just remove specific known patterns.
        # Since the code is mostly formatted uniformly:
        tag_content = re.sub(r'borderColor:\s*(?:isDark \? "[^"]*" : "[^"]*"|"[^"]*"|[^,]+)\s*,?\s*', '', tag_content)
        
        # Just in case there's an ending comma before }
        tag_content = tag_content.replace(', }', ' }')
        
        new_parts.append('<BlurView' + tag_content + rest)
        
    new_content = ''.join(new_parts)
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {file_path}")

# Run on all files
for file_path in glob.glob('/Users/nitishtao/Desktop/app/card/couples-scratch-game/app/(game)/*.tsx'):
    remove_borders_from_blurviews(file_path)
