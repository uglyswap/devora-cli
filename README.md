# Devora CLI

![Devora CLI](./docs/assets/gemini-screenshot.png)

Devora CLI is an open-source AI agent that brings the power of Zai GLM directly
into your terminal. It provides lightweight access to advanced AI capabilities,
giving you the most direct path from your prompt to powerful models.

## 🚀 Why Devora CLI?

- **🎯 Powered by Zai GLM-4.7**: Advanced reasoning with Zai's state-of-the-art model
- **🧠 High Performance**: Optimized for coding tasks with 1M+ token context window
- **🔧 Built-in tools**: File operations, shell commands, web fetching, and more
- **🔌 Extensible**: MCP (Model Context Protocol) support for custom integrations
- **💻 Terminal-first**: Designed for developers who live in the command line
- **🛡️ Open source**: Apache 2.0 licensed, forked from Google Gemini CLI

## 📦 Installation

### Pre-requisites

- Node.js version 20 or higher
- macOS, Linux, or Windows
- Zai API key from [z.ai](https://z.ai)

### Quick Install

#### Run instantly with npx

```bash
# Using npx (no installation required)
npx @devora/cli
```

#### Install globally with npm

```bash
npm install -g @devora/cli
```

#### Build from source

```bash
git clone https://github.com/uglyswap/devora-cli.git
cd devora-cli
npm install
npm run build
npm link
```

## 🔐 Authentication

Devora CLI uses Zai API key authentication:

```bash
# Get your API key from https://z.ai
export ZAI_API_KEY="your_api_key_here"

# Start Devora CLI
devora
```

The CLI will automatically use your Zai API key to authenticate with GLM-4.7.

## 📋 Key Features

### Code Understanding & Generation

- Query and edit large codebases
- Generate new apps from PDFs, images, or sketches using multimodal capabilities
- Debug issues and troubleshoot with natural language

### Automation & Integration

- Automate operational tasks like querying pull requests or handling complex rebases
- Use MCP servers to connect new capabilities
- Run non-interactively in scripts for workflow automation

### Advanced Capabilities

- Ground your queries with built-in web search for real-time information
- Conversation checkpointing to save and resume complex sessions
- Custom context files (DEVORA.md) to tailor behavior for your projects

## 🚀 Getting Started

### Basic Usage

#### Start in current directory

```bash
devora
```

#### Include multiple directories

```bash
devora --include-directories ../lib,../docs
```

#### Non-interactive mode for scripts

Get a simple text response:

```bash
devora -p "Explain the architecture of this codebase"
```

For more advanced scripting, including how to parse JSON and handle errors, use
the `--output-format json` flag to get structured output:

```bash
devora -p "Explain the architecture of this codebase" --output-format json
```

For real-time event streaming (useful for monitoring long-running operations),
use `--output-format stream-json` to get newline-delimited JSON events:

```bash
devora -p "Run tests and deploy" --output-format stream-json
```

### Quick Examples

#### Start a new project

```bash
cd new-project/
devora
> Write me a Discord bot that answers questions using a FAQ.md file I will provide
```

#### Analyze existing code

```bash
git clone https://github.com/uglyswap/devora-cli
cd devora-cli
devora
> Give me a summary of all of the changes that went in yesterday
```

## 🔧 Configuration

Create a `~/.devora/settings.json` file to customize Devora CLI:

```json
{
  "apiKey": "${ZAI_API_KEY}",
  "model": "GLM-4.7",
  "temperature": 0.7,
  "maxTokens": 4096
}
```

### Environment Variables

- `ZAI_API_KEY`: Your Zai API key (required)
- `DEVORA_MODEL`: Model to use (default: GLM-4.7)
- `DEVORA_TEMPERATURE`: Response randomness (0-1, default: 0.7)
- `DEVORA_MAX_TOKENS`: Maximum response tokens (default: 4096)

## 📚 Documentation

### Getting Started

- **[Quickstart Guide](./docs/get-started/index.md)** - Get up and running quickly
- **[Authentication Setup](./docs/get-started/authentication.md)** - Detailed auth configuration
- **[Configuration Guide](./docs/get-started/configuration.md)** - Settings and customization
- **[Keyboard Shortcuts](./docs/cli/keyboard-shortcuts.md)** - Productivity tips

### Core Features

- **[Commands Reference](./docs/cli/commands.md)** - All slash commands (`/help`, `/chat`, etc)
- **[Custom Commands](./docs/cli/custom-commands.md)** - Create your own reusable commands
- **[Context Files (DEVORA.md)](./docs/cli/gemini-md.md)** - Provide persistent context
- **[Checkpointing](./docs/cli/checkpointing.md)** - Save and resume conversations
- **[Token Caching](./docs/cli/token-caching.md)** - Optimize token usage

### Tools & Extensions

- **[Built-in Tools Overview](./docs/tools/index.md)**
  - [File System Operations](./docs/tools/file-system.md)
  - [Shell Commands](./docs/tools/shell.md)
  - [Web Fetch & Search](./docs/tools/web-fetch.md)
- **[MCP Server Integration](./docs/tools/mcp-server.md)** - Extend with custom tools
- **[Custom Extensions](./docs/extensions/index.md)** - Build and share your own commands

## 🤝 Contributing

We welcome contributions! Devora CLI is fully open source (Apache 2.0), and we
encourage the community to:

- Report bugs and suggest features
- Improve documentation
- Submit code improvements
- Share your MCP servers and extensions

See our [Contributing Guide](./CONTRIBUTING.md) for development setup, coding
standards, and how to submit pull requests.

## 🔍 Troubleshooting

### Common Issues

**"ZAI_API_KEY not found"**
- Make sure you've set your ZAI_API_KEY environment variable
- Get your API key from https://z.ai

**"Module not found" errors after installation**
- Try reinstalling with `npm install -g @devora/cli --force`
- Make sure Node.js 20+ is installed: `node --version`

**Build fails from source**
- Ensure all dependencies are installed: `npm install`
- Check that TypeScript compiles: `npm run typecheck`

## 📖 Resources

- **[NPM Package](https://www.npmjs.com/package/@devora/cli)** - Package registry
- **[GitHub Repository](https://github.com/uglyswap/devora-cli)** - Source code
- **[GitHub Issues](https://github.com/uglyswap/devora-cli/issues)** - Report bugs or request features
- **[Zai Documentation](https://docs.z.ai)** - Zai API documentation

## 📄 Legal

- **License**: [Apache License 2.0](LICENSE)
- **Original Project**: Forked from [Google Gemini CLI](https://github.com/google-gemini/gemini-cli)
- **Security**: [Security Policy](SECURITY.md)

## 🙏 Acknowledgments

Devora CLI is a fork of Google's excellent Gemini CLI project, adapted to work
with Zai's GLM-4.7 model. We thank the original Gemini CLI team for building
such a solid foundation.

---

<p align="center">
  Built with ❤️ by the open source community | Powered by Zai GLM-4.7
</p>
