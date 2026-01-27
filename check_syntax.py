
import re
import sys

def check_syntax(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"Error reading file: {e}")
        return

    stack = []
    
    in_string = None # ' or " or `
    in_comment_line = False
    in_comment_block = False
    escape = False

    for line_idx, line in enumerate(lines):
        i = 0
        in_comment_line = False 
        while i < len(line):
            char = line[i]
            
            # Handle escape inside strings
            if in_string and escape:
                escape = False
                i += 1
                continue

            # Handle comments (only if not in string)
            if not in_string and not in_comment_block and not in_comment_line:
                if char == '/' and i + 1 < len(line):
                    if line[i+1] == '/':
                        in_comment_line = True
                        i += 2
                        continue
                    elif line[i+1] == '*':
                        in_comment_block = True
                        i += 2
                        continue

            if in_comment_line:
                i += 1
                continue
                
            if in_comment_block:
                if char == '*' and i + 1 < len(line) and line[i+1] == '/':
                    in_comment_block = False
                    i += 2
                else:
                    i += 1
                continue

            # Handle strings
            if in_string:
                if char == '\\':
                    escape = True
                elif char == in_string:
                    in_string = None
                i += 1
                continue
            else:
                if char in ['"', "'", '`']:
                    in_string = char
                    i += 1
                    continue
            
            # Brackets 
            if char in ['{', '(', '[']:
                stack.append((char, line_idx + 1))
            elif char in ['}', ')', ']']:
                if not stack:
                    print(f"Error: Unmatched closing '{char}' at line {line_idx + 1}")
                    # continue checking? usually this is the culprit or a consequence.
                else:
                    last_char, last_line = stack.pop()
                    expected = {'}':'{', ')':'(', ']':'['}[char]
                    if last_char != expected:
                        print(f"Error: Mismatched closing '{char}' at line {line_idx + 1}. Expected closing for '{last_char}' from line {last_line}")
                        return
            
            i += 1

    if stack:
        print("Error: Unclosed blocks at EOF:")
        for char, line_num in stack[-5:]: # Show last 5
            print(f"  '{char}' form line {line_num}")
    else:
        print("No unclosed blocks found.")

if __name__ == "__main__":
    check_syntax(r'D:\GFM FINAL APP\GFM-record-management-app\app\teacher\dashboard.tsx')
