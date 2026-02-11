# Troubleshooting

## Common Issues

### funcflow is not found

**Problem:** Claude Code says "Tool funcflow not found"

**Solution:**

1. Check your config: `~/.claude/settings.json`
2. Ensure you have:
   ```json
   {
     "mcpServers": {
       "funcflow": {
         "command": "npx",
         "args": ["-y", "funcflow"]
       }
     }
   }
   ```
3. Restart Claude Code

### Function not found

**Problem:** "Function 'myFunction' not found"

**Solutions:**

- Ensure the function name is correct (case-sensitive)
- Check if the function is in your project root
- Try specifying the file path explicitly
- Ensure your project has a `tsconfig.json` or is JavaScript

### Analysis is slow

**Problem:** Analysis takes >10 seconds

**Solutions:**

- Reduce depth: Ask for "depth 1" or "depth 2"
- Specify file path to narrow search
- Large projects may take longer on first analysis

### Path errors

**Problem:** "projectRoot must be an absolute path"

**Solution:**

- Always use absolute paths (starting with `/` on Unix or `C:\` on Windows)
- Claude Code typically provides absolute paths automatically

### TypeScript errors

**Problem:** "Cannot read tsconfig.json"

**Solutions:**

- Ensure `tsconfig.json` exists in your project root
- Check for syntax errors in `tsconfig.json`
- funcflow will use default settings if no tsconfig found

## Debug Mode

Enable debug logging for more information:

```json
{
  "mcpServers": {
    "funcflow": {
      "command": "npx",
      "args": ["-y", "funcflow"],
      "env": {
        "FUNCFLOW_LOG_LEVEL": "debug"
      }
    }
  }
}
```

## Getting Help

If you're still stuck:

1. Check [existing issues](https://github.com/fairy-pitta/funcflow/issues)
2. Create a new issue with:
   - funcflow version: `npm list funcflow`
   - Node.js version: `node -v`
   - Operating system
   - Steps to reproduce
   - Error messages
