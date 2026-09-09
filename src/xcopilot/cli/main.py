"""CLI main entry point — xcopilot command."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn

console = Console()


@click.group()
@click.version_option(version="0.1.0", prog_name="xcopilot")
@click.option("--project", "-p", type=click.Path(exists=True), help="Project root directory")
@click.option("--mode", type=click.Choice(["standard", "auto-ask", "plan", "bypass", "dont-ask"]), default="standard", help="Permission mode")
@click.pass_context
def cli(ctx, project, mode):
    """X-Copilot — Self-growing AI agent for Windows."""
    ctx.ensure_object(dict)
    ctx.obj["project_root"] = Path(project) if project else Path.cwd()
    ctx.obj["permission_mode"] = mode


@cli.command()
@click.option("--test-mode", is_flag=True, help="Run in test mode (no model API)")
@click.pass_context
def start(ctx, test_mode):
    """Start the X-Copilot agent REPL."""
    from xcopilot.memory import MemoryEngine
    from xcopilot.core.learner import LearnerEngine
    from xcopilot.core.planner import PlannerEngine
    from xcopilot.core.evaluator import Evaluator
    from xcopilot.permission.pipeline import PermissionPipeline, PermissionMode
    from xcopilot.tools import ShellTool, FileTool, SearchTool, WebTool
    
    project_root = ctx.obj["project_root"]
    perm_mode = getattr(PermissionMode, ctx.obj["permission_mode"].upper())
    
    console.print(Panel.fit(
        "[bold cyan]X-Copilot[/bold cyan] — Self-growing AI agent for Windows",
        subtitle="v0.1.0"
    ))
    
    # Initialize components
    memory = MemoryEngine(project_root=str(project_root))
    learner = LearnerEngine(memory)
    planner = PlannerEngine(memory)
    evaluator = Evaluator()
    pipeline = PermissionPipeline(perm_mode)
    
    tools = {
        "shell": ShellTool(pipeline),
        "file": FileTool(pipeline),
        "search": SearchTool(),
        "web": WebTool(pipeline),
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
                console.print("[yellow]Full agent loop not yet implemented. Use CLI subcommands.[/yellow]")
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
        ("exit/quit/q", "Exit the REPL"),
    ]
    for cmd, desc in commands:
        console.print(f"  [cyan]{cmd:<20}[/cyan] {desc}")
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


@cli.command()
def memory():
    """Show memory status."""
    from xcopilot.memory import MemoryEngine
    memory = MemoryEngine(project_root=Path.cwd())
    _show_memory_status(memory)


@cli.command()
def skills():
    """List available skills."""
    from xcopilot.memory import MemoryEngine
    memory = MemoryEngine(project_root=Path.cwd())
    _show_skills(memory)


@cli.command()
@click.option("--repo", help="Repository to search (e.g., addyosmani/agent-skills)")
@click.option("--install", help="Install a skill by name")
def skills_marketplace(repo, install):
    """Browse or install skills from marketplace."""
    from xcopilot.skills.marketplace import SkillsMarketplace
    marketplace = SkillsMarketplace()
    
    if install:
        project_root = Path.cwd()
        skill_path = marketplace.install(repo or "addyosmani/agent-skills", install, str(project_root))
        if skill_path:
            console.print(f"[green]✓[/green] Installed {install} to {skill_path}")
        else:
            console.print(f"[red]✗[/red] Failed to install {install}")
    else:
        skills = marketplace.list_marketplace()
        table = Table(title="Marketplace Skills")
        table.add_column("Name", style="cyan")
        table.add_column("Repo", style="dim")
        table.add_column("Description")
        for skill in skills:
            table.add_row(skill.name, skill.repo, skill.description)
        console.print(table)


@cli.command()
def graph():
    """Build knowledge graph for current project."""
    _build_graph(Path.cwd())


@cli.command()
def checkpoints():
    """List checkpoints for current session."""
    _show_checkpoints(Path.cwd())


@cli.command()
@click.argument("checkpoint_id")
def rewind(checkpoint_id):
    """Rewind to a checkpoint."""
    _rewind_checkpoint(checkpoint_id, Path.cwd())


@cli.command()
def update():
    """Check for and apply updates."""
    from xcopilot.core.updater import Updater
    updater = Updater()
    
    with console.status("[bold green]Checking for updates..."):
        info = updater.check()
    
    console.print(f"Current version: [cyan]0.1.0[/cyan]")
    console.print(f"Latest version: [cyan]{info.version}[/cyan]")
    console.print(f"Channel: [dim]{info.channel}[/dim]")
    
    if info.version != "0.1.0":
        if click.confirm("Update now?"):
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console,
            ) as progress:
                task = progress.add_task("Downloading...", total=None)
                path = updater.download(info)
                progress.update(task, description="Verifying...")
                if updater.verify(path, info.sha256):
                    progress.update(task, description="Installing...")
                    updater.install(info)
                    console.print("[green]✓[/green] Update installed! Restart X-Copilot.")
                else:
                    console.print("[red]✗[/red] Checksum verification failed")
    else:
        console.print("[green]Already up to date![/green]")


@cli.command()
@click.argument("checkpoint_id")
@click.argument("branch_name")
def fork(checkpoint_id, branch_name):
    """Create a new branch from a checkpoint."""
    from xcopilot.core.checkpoint import CheckpointManager
    cp_mgr = CheckpointManager(checkpoints_dir=str(Path.cwd() / ".xcopilot" / "checkpoints"))
    fork_id = cp_mgr.fork(checkpoint_id, branch_name)
    if fork_id:
        console.print(f"[green]✓[/green] Created branch: {fork_id}")
    else:
        console.print(f"[red]✗[/red] Checkpoint {checkpoint_id} not found")


@cli.command()
def tree():
    """Show checkpoint tree."""
    from xcopilot.core.checkpoint import CheckpointManager
    cp_mgr = CheckpointManager(checkpoints_dir=str(Path.cwd() / ".xcopilot" / "checkpoints"))
    checkpoints = cp_mgr.tree()
    if checkpoints:
        table = Table(title="Checkpoint Tree")
        table.add_column("ID", style="cyan")
        table.add_column("Timestamp", style="dim")
        table.add_column("Action", style="green")
        table.add_column("Target", style="yellow")
        for cp in checkpoints:
            table.add_row(cp["id"], cp["timestamp"], cp["action"], cp["target"])
        console.print(table)
    else:
        console.print("[yellow]No checkpoints[/yellow]")


@cli.command()
@click.option("--mode", type=click.Choice(["default", "fast"]), default="default", help="Compaction mode")
def compact(mode):
    """Compact conversation history."""
    from xcopilot.core.compaction import CompactionManager
    cm = CompactionManager()
    result = cm.compact(mode=mode)
    console.print(f"[green]✓[/green] Compacted ({mode} mode)")
    console.print(result)


@cli.command()
def context():
    """Show token budget breakdown."""
    from xcopilot.core.compaction import CompactionManager
    cm = CompactionManager()
    budget = cm.get_budget()
    console.print(f"Total: [cyan]{budget.total}[/cyan]")
    console.print(f"Used: [cyan]{budget.used}[/cyan]")
    console.print(f"  Memory: [dim]{budget.memory}[/dim]")
    console.print(f"  Skills: [dim]{budget.skills}[/dim]")
    console.print(f"  Conversation: [dim]{budget.conversation}[/dim]")
    pct = (budget.used / budget.total) * 100
    console.print(f"Usage: [cyan]{pct:.1f}%[/cyan]")


@cli.command()
def permissions():
    """Show current permission mode."""
    from xcopilot.permission.pipeline import PermissionPipeline, PermissionMode
    for mode in PermissionMode:
        pipeline = PermissionPipeline(mode)
        console.print(f"[cyan]{mode.value}[/cyan]: {mode.name}")


if __name__ == "__main__":
    cli()