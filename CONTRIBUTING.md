# Contributing to Agentic Email System

First off, thank you for considering contributing to the Agentic Email System! 🎉

The following is a set of guidelines for contributing to this project. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Process](#development-process)
- [Style Guidelines](#style-guidelines)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

### Our Standards

- **Be Respectful**: Treat everyone with respect. We're all here to learn and grow.
- **Be Constructive**: Provide helpful feedback and accept criticism gracefully.
- **Be Inclusive**: Welcome newcomers and help them get started.
- **Be Professional**: Keep discussions focused on the project.

## Getting Started

### Prerequisites

Before contributing, make sure you have:

1. Node.js 18.0+ installed
2. Git configured with your GitHub account
3. A fork of the repository
4. The development environment set up

### Setting Up Your Development Environment

```bash
# Fork the repository on GitHub

# Clone your fork locally
git clone https://github.com/YOUR_USERNAME/agentic-email.git
cd agentic-email

# Add the upstream repository
git remote add upstream https://github.com/globalbusinessadvisors/agentic-email.git

# Install dependencies
npm install

# Create a branch for your work
git checkout -b feature/your-feature-name

# Set up your environment
cp .env.example .env
# Edit .env with your configuration
```

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

**When reporting a bug, include:**

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Screenshots if applicable
- Your environment details (OS, Node version, etc.)
- Any relevant error messages or logs

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:

- A clear and descriptive title
- Detailed description of the proposed feature
- Use cases and examples
- Mockups or diagrams if applicable
- Why this enhancement would be useful

### Your First Code Contribution

Unsure where to begin? Look for these labels:

- `good first issue` - Simple issues perfect for beginners
- `help wanted` - Issues where we need community help
- `documentation` - Documentation improvements needed

### Pull Requests

1. **Small, Focused Changes**: Keep PRs focused on a single feature or fix
2. **Include Tests**: Add tests for new functionality
3. **Update Documentation**: Update relevant documentation
4. **Follow Style Guidelines**: Ensure code follows our style guide
5. **Write Clear Descriptions**: Explain what and why in your PR

## Development Process

### Workflow

1. **Create a Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make Your Changes**
   - Write clean, documented code
   - Add/update tests as needed
   - Update documentation

3. **Test Your Changes**
   ```bash
   # Run tests
   npm test
   
   # Check types
   npm run typecheck
   
   # Lint your code
   npm run lint
   
   # Format code
   npm run format
   ```

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: Add amazing feature"
   ```

5. **Push to Your Fork**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template

### Testing

All code must be tested. We aim for >90% coverage.

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- campaign.service.test.ts
```

### Building

```bash
# Build the project
npm run build

# Clean build artifacts
npm run clean
```

## Style Guidelines

### TypeScript Style Guide

We use ESLint and Prettier for consistent code style.

**Key Guidelines:**

- Use TypeScript for all new code
- Prefer `const` over `let`
- Use async/await over promises
- Write self-documenting code
- Add JSDoc comments for public APIs
- Use meaningful variable names

**Example:**

```typescript
/**
 * Sends a personalized email to a recipient
 * @param recipient - The email recipient details
 * @param template - The email template to use
 * @returns Promise resolving to send result
 */
export async function sendPersonalizedEmail(
  recipient: Recipient,
  template: EmailTemplate
): Promise<SendResult> {
  const personalizedContent = await personalizeContent(recipient, template);
  return await emailService.send({
    to: recipient.email,
    content: personalizedContent
  });
}
```

### File Structure

```
src/
├── services/        # Business logic
├── models/          # Data models
├── api/            # API endpoints
├── utils/          # Utility functions
├── tests/          # Test files
└── types/          # TypeScript type definitions
```

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Build system changes
- `ci`: CI configuration changes
- `chore`: Other changes (updating dependencies, etc.)

### Examples

```bash
# Feature
git commit -m "feat(campaign): Add A/B testing support"

# Bug fix
git commit -m "fix(email): Resolve UTF-8 encoding issue"

# Documentation
git commit -m "docs(api): Update REST API documentation"

# Breaking change
git commit -m "feat(auth)!: Switch to OAuth 2.0

BREAKING CHANGE: API now requires OAuth 2.0 authentication"
```

## Pull Request Process

### Before Submitting

1. **Update from upstream**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run all checks**
   ```bash
   npm run precommit
   ```

3. **Update documentation** if needed

4. **Add tests** for new functionality

### PR Template

When creating a PR, you'll see a template. Please fill it out:

```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added new tests
- [ ] Updated existing tests

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
```

### Review Process

1. **Automated Checks**: CI will run tests and linting
2. **Code Review**: Maintainers will review your code
3. **Feedback**: Address any requested changes
4. **Merge**: Once approved, your PR will be merged

## Community

### Getting Help

- **Discord**: Join our [Discord server](https://discord.gg/agentic-email)
- **Discussions**: Use [GitHub Discussions](https://github.com/globalbusinessadvisors/agentic-email/discussions)
- **Issues**: Check [existing issues](https://github.com/globalbusinessadvisors/agentic-email/issues)

### Recognition

Contributors are recognized in several ways:

- Listed in our README
- Mentioned in release notes
- Special badges in Discord
- Contributor spotlight in our newsletter

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to contact the maintainers if you have any questions. We're here to help!

---

Thank you for contributing to the Agentic Email System! 🚀