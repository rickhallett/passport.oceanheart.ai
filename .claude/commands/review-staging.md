# Review Staging Area
> Thoroughly review all changes in git staging area
> Develop plan before reviewing staging area
> Check with human before reviewing staging area

## Review Process:
```bash
# Show overview of staged files
git status -s

# Review each staged file's changes
git diff --staged --name-only | while read file; do
    echo "=== Changes in $file ==="
    git diff --staged "$file"
done

# Summary of changes by type
git diff --staged --stat
```