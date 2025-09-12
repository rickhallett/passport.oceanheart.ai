# Analyze Project Structure
> Comprehensive project analysis and documentation
> Develop plan before analyzing project
> Check with human before analyzing project

## Commands to run:
```bash
# Tree view (if eza available)
eza . --tree --git-ignore --level 3

# Alternative with standard tools
find . -type f -name "*.md" -o -name "*.json" -o -name "*.ts" -o -name "*.py" | head -20

# Check for key files
ls -la README.md package.json pyproject.toml .env .gitignore
```

## Files to read in parallel:
- README.md
- package.json / pyproject.toml
- Any .claude/CLAUDE.md file
- Key source files in src/ or lib/