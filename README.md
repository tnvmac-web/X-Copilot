# X-Copilot

X-Copilot is a Python 3.11+ command-line agent for Windows and Linux. It
provides project memory, skills, checkpoints, permissions, context budgeting,
and shell/file/search/web tools.

## Requirements

- Python 3.11 or newer
- Git
- Docker 20.10 or newer (optional)
- Node.js 18 or newer is only needed for the separate JavaScript wrapper in
	`package.json`

## Install From Source

```bash
git clone https://github.com/tnvmac-web/X-Copilot.git
cd X-Copilot
python -m venv .venv
```

Activate the virtual environment:

```bash
# Linux/macOS
source .venv/bin/activate

# Windows PowerShell
.venv\Scripts\Activate.ps1
```

Install the package and its development tools:

```bash
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
```

Verify the installation:

```bash
xcopilot --help
xcopilot --version
```

The Windows installer script is available at `installers/install.ps1`. Run it
from a checked-out copy of the repository:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\installers\install.ps1
```

## Run X-Copilot

Start the interactive agent in the current directory:

```bash
xcopilot start
```

Use test mode when no model API is configured:

```bash
xcopilot start --test-mode
```

Select a project and permission mode with the global options before the
command:

```bash
xcopilot --project path/to/project --mode standard start
```

Available permission modes are `standard`, `auto-ask`, `plan`, `bypass`, and
`dont-ask`. Use `bypass` only in a trusted environment.

Useful commands:

```text
xcopilot memory                         Show memory status
xcopilot skills                         List installed skills
xcopilot skills-marketplace             Browse marketplace skills
xcopilot skills-marketplace --install NAME
xcopilot graph                          Build the project knowledge graph
xcopilot checkpoints                    List checkpoints
xcopilot tree                           Show the checkpoint tree
xcopilot rewind CHECKPOINT_ID           Restore a checkpoint
xcopilot fork CHECKPOINT_ID BRANCH      Create a checkpoint branch
xcopilot compact --mode fast            Compact conversation history
xcopilot context                        Show token budget usage
xcopilot permissions                    Show permission modes
xcopilot update                         Check for updates
```

## Docker

Build the image locally:

```bash
docker build -t x-copilot:local .
```

Show the CLI help:

```bash
docker run --rm x-copilot:local --help
```

Run against a local project directory:

```bash
docker run --rm -it \
	-v "$(pwd):/workspace" \
	-w /workspace \
	x-copilot:local --project /workspace start --test-mode
```

## Development

Run the test suite and coverage gate:

```bash
pytest tests/ -v --tb=short
pytest tests/ --cov=src/xcopilot --cov-report=term --cov-fail-under=65
```

Run the same static checks used by CI:

```bash
ruff check src/ tests/
mypy src/
ruff format --check src/ tests/
```

Build the Python package:

```bash
python -m pip install build
python -m build
```

## CI/CD And Publishing

The workflow is `.github/workflows/ci-cd.yml`.

- Pushes to `main` and pull requests run tests, coverage, lint, type checks,
	formatting, and package build.
- Pushes to `develop` publish to TestPyPI.
- Publishing a GitHub release publishes to PyPI and pushes the Docker image.
- A weekly schedule checks for dependency updates.
- `workflow_dispatch` provides manual `publish_test`, `publish_prod`, and
	`publish_docker` inputs.

Configure these repository secrets before publishing:

```text
TEST_PYPI_TOKEN
PYPI_TOKEN
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
```

The PyPI and TestPyPI environments may also require environment approval in
GitHub repository settings.

Run the complete release path manually with GitHub CLI:

```bash
gh workflow run ci-cd.yml \
	-f publish_test=true \
	-f publish_prod=true \
	-f publish_docker=true
```

Check the run:

```bash
gh run list --workflow ci-cd.yml --limit 5
gh run watch
```

Production publishing is intentionally opt-in for manual runs. A normal push
to `main` does not publish to PyPI or Docker.

## Architecture

- **Memory**: session, episodic, semantic, procedural, and project memory
- **Learner**: observes signals and stores reusable patterns
- **Skills**: loads and creates `SKILL.md`-based skills
- **Planner**: learns project and user preferences
- **Evaluator**: scores output against configurable criteria
- **Checkpoints**: snapshot, rewind, fork, and inspect project state
- **Permissions**: deny, ask, and allow decisions for tool actions
- **Tools**: shell, file, search, and web operations

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).