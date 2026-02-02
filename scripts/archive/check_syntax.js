
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'teacher', 'dashboard.tsx');

try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    const stack = [];
    let inString = null;
    let inCommentLine = false;
    let inCommentBlock = false;
    let escape = false;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        inCommentLine = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (inString && escape) {
                escape = false;
                continue;
            }

            if (!inString && !inCommentBlock && !inCommentLine) {
                if (char === '/' && i + 1 < line.length) {
                    if (line[i + 1] === '/') {
                        inCommentLine = true;
                        i++;
                        continue;
                    } else if (line[i + 1] === '*') {
                        inCommentBlock = true;
                        i++;
                        continue;
                    }
                }
            }

            if (inCommentLine) continue;

            if (inCommentBlock) {
                if (char === '*' && i + 1 < line.length && line[i + 1] === '/') {
                    inCommentBlock = false;
                    i++;
                }
                continue;
            }

            if (inString) {
                if (char === '\\') {
                    escape = true;
                } else if (char === inString) {
                    inString = null;
                }
            } else {
                if (char === '"' || char === "'" || char === '`') {
                    inString = char;
                } else if (['{', '(', '['].includes(char)) {
                    stack.push({ char, line: lineIdx + 1 });
                } else if (['}', ')', ']'].includes(char)) {
                    if (stack.length === 0) {
                        console.log(`Error: Unmatched closing '${char}' at line ${lineIdx + 1}`);
                    } else {
                        const last = stack.pop();
                        const expected = { '}': '{', ')': '(', ']': '[' }[char];
                        if (last.char !== expected) {
                            console.log(`Error: Mismatched closing '${char}' at line ${lineIdx + 1}. Expected closing for '${last.char}' from line ${last.line}`);
                            process.exit(1);
                        }
                    }
                }
            }
        }
    }

    if (stack.length > 0) {
        console.log("Error: Unclosed blocks at EOF:");
        stack.slice(-5).forEach(item => {
            console.log(`  '${item.char}' from line ${item.line}`);
        });
    } else {
        console.log("No unclosed blocks found.");
    }

} catch (err) {
    console.error(err);
}
