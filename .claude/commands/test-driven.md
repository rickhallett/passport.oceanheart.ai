# Test-Driven Development
> Implement features using TDD with autonomous testing
> Develop plan before implementing features
> Check with human before implementing features

## Process:
1. Write test first
2. Run test (expect failure)
3. Implement minimal code to pass
4. Refactor if needed
5. Commit atomically

```bash
# Example for Python
uv run pytest tests/test_feature.py -v

# Example for TypeScript/Bun
bun test feature.test.ts
```