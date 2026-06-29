import os
import re

dir_path = "/Users/nitishtao/Desktop/app/card/couples-scratch-game/app/(game)"

def replace_delay(match):
    delay_str = match.group(1)
    delay_val = int(delay_str)
    
    if delay_val == 100:
        new_delay = 100
    else:
        index = (delay_val // 100) - 1
        new_delay = 100 + (index * 400)
    
    return f"FadeInDown.delay({new_delay})"

def replace_delay_calendar(match):
    delay_str = match.group(1)
    delay_val = int(delay_str)
    
    if delay_val == 100:
        new_delay = 100
    else:
        index = (delay_val // 100) - 1
        new_delay = 100 + (index * 400)
    
    return f"FadeInDown.duration(600).delay({new_delay})"

for root, _, files in os.walk(dir_path):
    for file in files:
        if file.endswith(".tsx"):
            file_path = os.path.join(root, file)
            with open(file_path, "r") as f:
                content = f.read()
            
            # Match FadeInDown.delay(X)
            new_content = re.sub(r'FadeInDown\.delay\((\d+)\)', replace_delay, content)
            
            # Match FadeInDown.duration(600).delay(X) (for calendar.tsx)
            new_content = re.sub(r'FadeInDown\.duration\(600\)\.delay\((\d+)\)', replace_delay_calendar, new_content)
            
            if new_content != content:
                with open(file_path, "w") as f:
                    f.write(new_content)
                print(f"Updated {file}")

print("Done")
