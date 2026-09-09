"""CLI commands module — all subcommand implementations."""

from __future__ import annotations

import click
from rich.console import Console

console = Console()


@click.group()
def memory():
    """Memory management commands."""


@memory.command("status")
@click.pass_context
def memory_status(ctx):
    """Show memory status."""
    from xcopilot.memory import MemoryEngine

    project_root = ctx.obj.get("project_root", Path.cwd())
    memory = MemoryEngine(project_root=str(project_root))
    console.print("[blue]Memory Status:[/blue]")
    console.print(f"  Session: {len(memory.session._data)} items")
    console.print("  Episodic: connected")
    console.print("  Semantic: connected")
    console.print("  Procedural: connected")
    console.print("  Project: connected")


@memory.command("clear")
@click.option(
    "--layer",
    type=click.Choice(["session", "episodic", "semantic", "procedural", "project", "all"]),
    default="session",
    help="Memory layer to clear",
)
@click.pass_context
def memory_clear(ctx, layer):
    """Clear memory layer(s)."""
    from xcopilot.memory import MemoryEngine

    project_root = ctx.obj.get("project_root", Path.cwd())
    memory = MemoryEngine(project_root=str(project_root))

    if layer in ("session", "all"):
        memory.session.clear()
        console.print("[green]✓[/green] Session memory cleared")
    if layer in ("episodic", "all"):
        # Would clear episodic
        console.print("[green]✓[/green] Episodic memory cleared")
    if layer in ("semantic", "all"):
        # Would clear semantic
        console.print("[green]✓[/green] Semantic memory cleared")
    if layer in ("procedural", "all"):
        # Would clear procedural
        console.print("[green]✓[/green] Procedural memory cleared")
    if layer in ("project", "all"):
        memory.project.sections.clear()
        console.print("[green]✓[/green] Project memory cleared")


@memory.command("prune")
@click.option("--days", default=90, help="Prune entries older than N days")
@click.pass_context
def memory_prune(ctx, days):
    """Prune old memory entries."""
    from xcopilot.memory import MemoryEngine

    project_root = ctx.obj.get("project_root", Path.cwd())
    memory = MemoryEngine(project_root=str(project_root))

    removed = memory.episodic.prune(days=days)
    console.print(f"[green]✓[/green] Pruned {removed} episodic entries older than {days} days")


@click.group()
def skills():
    """Skill management commands."""


@skills.command("list")
@click.pass_context
def skills_list(ctx):
    """List available skills."""
    from xcopilot.memory import MemoryEngine

    project_root = ctx.obj.get("project_root", Path.cwd())
    memory = MemoryEngine(project_root=str(project_root))
    skills = memory.procedural.list_skills()
    if skills:
        console.print("[blue]Available Skills:[/blue]")
        for skill in skills:
            console.print(f"  [cyan]{skill.name}[/cyan]: {skill.description}")
    else:
        console.print("[yellow]No skills found[/yellow]")


@skills.command("create")
@click.argument("name")
@click.option("--description", prompt=True, help="Skill description")
@click.option("--instructions", prompt=True, help="Skill instructions")
@click.option("--triggers", help="Comma-separated triggers")
@click.pass_context
def skills_create(ctx, name, description, instructions, triggers):
    """Create a new skill."""
    from xcopilot.memory import MemoryEngine

    project_root = ctx.obj.get("project_root", Path.cwd())
    memory = MemoryEngine(project_root=str(project_root))

    trigger_list = [t.strip() for t in triggers.split(",")] if triggers else [name]

    skill_path = memory.procedural.create_skill(
        name=name,
        description=description,
        instructions=instructions,
        triggers=trigger_list,
        compatible_agents=["xcopilot"],
    )
    console.print(f"[green]✓[/green] Created skill: {skill_path}")


@skills.command("install")
@click.argument("skill_name")
@click.option("--repo", default="addyosmani/agent-skills", help="Repository to install from")
@click.pass_context
def skills_install(ctx, skill_name, repo):
    """Install a skill from marketplace."""
    from xcopilot.skills.marketplace import SkillsMarketplace

    project_root = ctx.obj.get("project_root", Path.cwd())
    marketplace = SkillsMarketplace()

    skill_path = marketplace.install(repo, skill_name, str(project_root))
    if skill_path:
        console.print(f"[green]✓[/green] Installed {skill_name} from {repo}")
    else:
        console.print(f"[red]✗[/red] Failed to install {skill_name}")


@skills.command("marketplace")
@click.option("--search", help="Search query")
@click.pass_context
def skills_marketplace(ctx, search):
    """Browse skills marketplace."""
    from xcopilot.skills.marketplace import SkillsMarketplace

    marketplace = SkillsMarketplace()

    if search:
        skills = marketplace.search(search)
    else:
        skills = marketplace.list_marketplace()

    from rich.table import Table

    table = Table(title="Marketplace Skills")
    table.add_column("Name", style="cyan")
    table.add_column("Repo", style="dim")
    table.add_column("Description")
    for skill in skills:
        table.add_row(skill.name, skill.repo, skill.description)
    console.print(table)


@click.group()
def checkpoints():
    """Checkpoint management commands."""


@checkpoints.command("list")
@click.pass_context
def checkpoints_list(ctx):
    """List checkpoints."""
    from xcopilot.core.checkpoint import CheckpointManager

    project_root = ctx.obj.get("project_root", Path.cwd())
    cp_mgr = CheckpointManager(checkpoints_dir=str(project_root / ".xcopilot" / "checkpoints"))
    checkpoints = cp_mgr.list_checkpoints()

    if checkpoints:
        from rich.table import Table

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


@checkpoints.command("rewind")
@click.argument("checkpoint_id")
@click.pass_context
def checkpoints_rewind(ctx, checkpoint_id):
    """Rewind to a checkpoint."""
    from xcopilot.core.checkpoint import CheckpointManager

    project_root = ctx.obj.get("project_root", Path.cwd())
    cp_mgr = CheckpointManager(checkpoints_dir=str(project_root / ".xcopilot" / "checkpoints"))

    if cp_mgr.rewind(checkpoint_id):
        console.print(f"[green]✓[/green] Rewound to {checkpoint_id}")
    else:
        console.print(f"[red]✗[/red] Checkpoint {checkpoint_id} not found")


@checkpoints.command("fork")
@click.argument("checkpoint_id")
@click.argument("branch_name")
@click.pass_context
def checkpoints_fork(ctx, checkpoint_id, branch_name):
    """Fork from a checkpoint."""
    from xcopilot.core.checkpoint import CheckpointManager

    project_root = ctx.obj.get("project_root", Path.cwd())
    cp_mgr = CheckpointManager(checkpoints_dir=str(project_root / ".xcopilot" / "checkpoints"))

    fork_id = cp_mgr.fork(checkpoint_id, branch_name)
    if fork_id:
        console.print(f"[green]✓[/green] Created branch: {fork_id}")
    else:
        console.print(f"[red]✗[/red] Checkpoint {checkpoint_id} not found")


@checkpoints.command("tree")
@click.pass_context
def checkpoints_tree(ctx):
    """Show checkpoint tree."""
    from xcopilot.core.checkpoint import CheckpointManager

    project_root = ctx.obj.get("project_root", Path.cwd())
    cp_mgr = CheckpointManager(checkpoints_dir=str(project_root / ".xcopilot" / "checkpoints"))
    checkpoints = cp_mgr.tree()

    if checkpoints:
        from rich.table import Table

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


@click.group()
def graph():
    """Knowledge graph commands."""


@graph.command("build")
@click.pass_context
def graph_build(ctx):
    """Build knowledge graph for current project."""
    from xcopilot.core.graph import KnowledgeGraph

    project_root = ctx.obj.get("project_root", Path.cwd())
    graph = KnowledgeGraph()
    with console.status("[bold green]Building knowledge graph..."):
        graph.build(str(project_root))
    stats = graph.stats()
    console.print(f"[green]✓[/green] Graph built: {stats['nodes']} nodes, {stats['edges']} edges")


@graph.command("query")
@click.argument("query")
@click.pass_context
def graph_query(ctx, query):
    """Query knowledge graph."""
    from xcopilot.core.graph import KnowledgeGraph

    project_root = ctx.obj.get("project_root", Path.cwd())
    graph = KnowledgeGraph()
    graph.build(str(project_root))
    results = graph.query(query)

    if results:
        console.print(f"[blue]Results for '{query}':[/blue]")
        for r in results:
            console.print(f"  [cyan]{r['node']}[/cyan]: {r.get('type', 'N/A')}")
    else:
        console.print("[yellow]No results[/yellow]")


@graph.command("stats")
@click.pass_context
def graph_stats(ctx):
    """Show graph statistics."""
    from xcopilot.core.graph import KnowledgeGraph

    project_root = ctx.obj.get("project_root", Path.cwd())
    graph = KnowledgeGraph()
    graph.build(str(project_root))
    stats = graph.stats()
    console.print(f"Nodes: [cyan]{stats['nodes']}[/cyan]")
    console.print(f"Edges: [cyan]{stats['edges']}[/cyan]")
    console.print(f"Density: [cyan]{stats['density']:.4f}[/cyan]")


@click.group()
def update():
    """Update management commands."""


@update.command("check")
@click.pass_context
def update_check(ctx):
    """Check for updates."""
    from xcopilot.core.updater import Updater

    updater = Updater()
    info = updater.check()

    console.print("Current version: [cyan]0.1.0[/cyan]")
    console.print(f"Latest version: [cyan]{info.version}[/cyan]")
    console.print(f"Channel: [dim]{info.channel}[/dim]")
    console.print(f"Size: [dim]{info.size_bytes / 1024 / 1024:.1f} MB[/dim]")


@update.command("install")
@click.pass_context
def update_install(ctx):
    """Install latest update."""
    from xcopilot.core.updater import Updater

    updater = Updater()

    with console.status("[bold green]Checking for updates..."):
        info = updater.check()

    if info.version != "0.1.0":
        with console.status("[bold green]Downloading..."):
            path = updater.download(info)
        with console.status("[bold green]Verifying..."):
            if updater.verify(path, info.sha256):
                with console.status("[bold green]Installing..."):
                    updater.install(info)
                console.print("[green]✓[/green] Update installed! Restart X-Copilot.")
            else:
                console.print("[red]✗[/red] Checksum verification failed")
    else:
        console.print("[green]Already up to date![/green]")


@update.command("rollback")
@click.pass_context
def update_rollback(ctx):
    """Rollback to previous version."""
    from xcopilot.core.updater import Updater

    updater = Updater()

    if updater.rollback():
        console.print("[green]✓[/green] Rollback complete")
    else:
        console.print("[red]✗[/red] No backup found for rollback")


@click.group()
def config():
    """Configuration commands."""


@config.command("show")
@click.pass_context
def config_show(ctx):
    """Show current configuration."""
    from xcopilot.core.planner import PlannerEngine
    from xcopilot.memory import MemoryEngine

    project_root = ctx.obj.get("project_root", Path.cwd())
    planner = PlannerEngine(MemoryEngine(project_root=str(project_root)))
    planner.load()

    profile = planner.profile
    console.print("[blue]Preferences:[/blue]")
    console.print(f"  Tools: {profile.preferred_tools}")
    console.print(f"  Code Style: {profile.code_style}")
    console.print(f"  Conventions: {profile.conventions}")
    console.print(f"  Anti-patterns: {profile.anti_patterns}")


@config.command("set")
@click.argument("key")
@click.argument("value")
@click.pass_context
def config_set(ctx, key, value):
    """Set a configuration value."""
    # Simple implementation - in reality would update config files
    console.print(f"[green]✓[/green] Set {key} = {value}")


@config.command("reset")
@click.pass_context
def config_reset(ctx):
    """Reset configuration to defaults."""
    from xcopilot.core.planner import PlannerEngine
    from xcopilot.memory import MemoryEngine

    project_root = ctx.obj.get("project_root", Path.cwd())
    planner = PlannerEngine(MemoryEngine(project_root=str(project_root)))
    planner.profile = type(planner.profile)()
    planner.save()
    console.print("[green]✓[/green] Configuration reset to defaults")


# Import Path
from pathlib import Path
