"""CLI main entry point — xcopilot command."""

from __future__ import annotations

from pathlib import Path

import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from xcopilot.cli.commands import (
    checkpoints,
    config,
    doctor,
    graph,
    init,
    mcp,
    memory,
    model,
    run,
    skill,
    skills,
    update,
)

console = Console()


@click.group()
@click.version_option(version="0.1.0", prog_name="xcopilot")
@click.option("--project", "-p", type=click.Path(exists=True), help="Project root directory")
@click.option(
    "--mode",
    type=click.Choice(["standard", "auto-ask", "plan", "bypass", "dont-ask"]),
    default="standard",
    help="Permission mode",
)
@click.pass_context
def cli(ctx, project, mode):
    """X-Copilot — Self-growing AI agent for Windows."""
    ctx.ensure_object(dict)
    ctx.obj["project_root"] = Path(project) if project else Path.cwd()
    ctx.obj["permission_mode"] = mode


# Add all command groups
cli.add_command(memory)
cli.add_command(skills)
cli.add_command(checkpoints)
cli.add_command(graph)
cli.add_command(update)
cli.add_command(config)
cli.add_command(model)
cli.add_command(mcp)
cli.add_command(skill)
cli.add_command(init)
cli.add_command(doctor)
cli.add_command(run)


@cli.command()
@click.option("--test-mode", is_flag=True, help="Run in test mode (no model API)")
@click.pass_context
def start(ctx, test_mode):
    """Start the X-Copilot agent REPL."""
    from xcopilot.core.evaluator import Evaluator
    from xcopilot.core.learner import LearnerEngine
    from xcopilot.core.planner import PlannerEngine
    from xcopilot.memory import MemoryEngine
    from xcopilot.permission.pipeline import PermissionMode, PermissionPipeline
    from xcopilot.tools import FileTool, SearchTool, ShellTool, WebTool

    project_root = ctx.obj["project_root"]
    perm_mode = getattr(PermissionMode, ctx.obj["permission_mode"].upper())

    console.print(
        Panel.fit(
            "[bold cyan]X-Copilot[/bold cyan] — Self-growing AI agent for Windows",
            subtitle="v0.1.0",
        )
    )

    # Initialize components
    memory = MemoryEngine(project_root=str(project_root))
    _learner = LearnerEngine(memory)
    _planner = PlannerEngine(memory)
    _evaluator = Evaluator()
    _pipeline = PermissionPipeline(perm_mode)

    _tools = {
        "shell": ShellTool(_pipeline),
        "file": FileTool(_pipeline),
        "search": SearchTool(),
        "web": WebTool(_pipeline),
    }

    console.print("[green]✓[/green] Memory engine initialized")
    console.print("[green]✓[/green] Learner engine ready")
    console.print("[green]✓[/green] Planner engine ready")
    console.print("[green]✓[/green] Evaluator ready")
    console.print(f"[green]✓[/green] Permission mode: {perm_mode.value}")
    console.print("[green]✓[/green] Tools loaded: shell, file, search, web")

    if test_mode:
        console.print("[yellow]Test mode enabled - no model API calls[/yellow]")

    console.print("\n[bold]Ready for commands![/bold] Type 'help' for available commands.\n")

    # Simple REPL
    while True:
        try:
            user_input = console.input("[bold cyan]xcopilot>[/bold cyan] ").strip()
            if not user_input:
                continue
            if user_input.lower() in ("exit", "quit", "q"):
                console.print("[yellow]Goodbye![/yellow]")
                break
            elif user_input.lower() == "help":
                _print_help()
            elif user_input.lower() == "memory":
                _show_memory_status(memory)
            elif user_input.lower() == "skills":
                _show_skills(memory)
            elif user_input.lower() == "graph":
                _build_graph(project_root)
            elif user_input.lower() == "checkpoints":
                _show_checkpoints(project_root)
            elif user_input.lower().startswith("rewind "):
                _rewind_checkpoint(user_input.split(" ", 1)[1], project_root)
            elif user_input.lower() == "update":
                _check_update()
            else:
                console.print(f"[dim]Processing: {user_input}[/dim]")
                # In full implementation, would use learner/planner/evaluator
                console.print(
                    "[yellow]Full agent loop not yet implemented. Use CLI subcommands.[/yellow]"
                )
        except KeyboardInterrupt:
            console.print("\n[yellow]Interrupted. Type 'exit' to quit.[/yellow]")
        except EOFError:
            break


def _print_help():
    console.print("\n[bold]Available commands:[/bold]")
    commands = [
        ("help", "Show this help"),
        ("memory", "Show memory status"),
        ("skills", "List available skills"),
        ("graph", "Build knowledge graph"),
        ("checkpoints", "List checkpoints"),
        ("rewind <id>", "Rewind to checkpoint"),
        ("update", "Check for updates"),
        ("model list", "List available models"),
        ("model chat", "Quick chat with a model"),
        ("mcp list", "List MCP servers"),
        ("skill search", "Search skills marketplace"),
        ("init project", "Initialize new project"),
        ("doctor", "Run diagnostics"),
        ("run webapp", "Run WebApp (Next.js)"),
        ("run desktop", "Run Desktop App (Tauri)"),
        ("run all", "Run both WebApp and Desktop App"),
        ("exit/quit/q", "Exit the REPL"),
    ]
    for cmd, desc in commands:
        console.print(f"  [cyan]{cmd:<25}[/cyan] {desc}")
    console.print()


def _show_memory_status(memory):
    console.print("[blue]Memory Status:[/blue]")
    console.print(f"  Session: {len(memory.session._data)} items")
    console.print("  Episodic: connected")
    console.print("  Semantic: connected")
    console.print("  Procedural: connected")
    console.print("  Project: connected")


def _show_skills(memory):
    skills = memory.procedural.list_skills()
    if skills:
        console.print("[blue]Available Skills:[/blue]")
        for skill in skills:
            console.print(f"  [cyan]{skill.name}[/cyan]: {skill.description}")
    else:
        console.print("[yellow]No skills found[/yellow]")


def _build_graph(project_root):
    from xcopilot.core.graph import KnowledgeGraph

    graph = KnowledgeGraph()
    with console.status("[bold green]Building knowledge graph..."):
        graph.build(str(project_root))
    stats = graph.stats()
    console.print(f"[green]✓[/green] Graph built: {stats['nodes']} nodes, {stats['edges']} edges")


def _show_checkpoints(project_root):
    from xcopilot.core.checkpoint import CheckpointManager

    cp_mgr = CheckpointManager(checkpoints_dir=str(project_root / ".xcopilot" / "checkpoints"))
    checkpoints = cp_mgr.list_checkpoints()
    if checkpoints:
        table = Table(title="Checkpoints")
        table.add_column("ID", style="cyan")
        table.add_column("Timestamp", style="dim")
        table.add_column("Action", style="green")
        table.add_column("Target", style="yellow")
        for cp in checkpoints:
            table.add_row(cp["id"], cp["timestamp"], cp["action"], cp["target"])
        console.print(table)
    else:
        console.print("[yellow]No checkpoints yet[/yellow]")


def _rewind_checkpoint(checkpoint_id, project_root):
    from xcopilot.core.checkpoint import CheckpointManager

    cp_mgr = CheckpointManager(checkpoints_dir=str(project_root / ".xcopilot" / "checkpoints"))
    if cp_mgr.rewind(checkpoint_id):
        console.print(f"[green]✓[/green] Rewound to {checkpoint_id}")
    else:
        console.print(f"[red]✗[/red] Checkpoint {checkpoint_id} not found")


def _check_update():
    from xcopilot.core.updater import Updater

    updater = Updater()
    info = updater.check()
    console.print(f"[blue]Current: 0.1.0, Latest: {info.version}[/blue]")


if __name__ == "__main__":
    cli()
