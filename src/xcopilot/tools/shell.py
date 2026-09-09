"""Shell tool — execute commands safely."""

from __future__ import annotations

import subprocess
from dataclasses import dataclass
from enum import Enum

from xcopilot.permission.pipeline import PermissionAction


class CommandResult(Enum):
    """Command execution result status."""

    SUCCESS = "success"
    TIMEOUT = "timeout"
    ERROR = "error"
    DENIED = "denied"


@dataclass
class ShellResult:
    """Result of a shell command execution."""

    returncode: int
    output: str
    error: str
    result_type: CommandResult


class ShellTool:
    """Execute shell commands with permission checks."""

    def __init__(self, pipeline, timeout: int = 30) -> None:
        self.pipeline = pipeline
        self.default_timeout = timeout

    def run(
        self,
        cmd: str,
        cwd: str | None = None,
        timeout: int | None = None,
    ) -> ShellResult:
        """
        Run a shell command. Returns ShellResult with returncode, output, error.
        Checks permissions before execution.
        """
        # Check permission
        action = self._get_action(cmd)
        result = self.pipeline.check(action, {"cmd": cmd})

        if result.value == "deny":
            return ShellResult(
                returncode=1,
                output="",
                error=f"Permission denied: {cmd}",
                result_type=CommandResult.DENIED,
            )

        try:
            timeout = timeout or self.default_timeout
            proc = subprocess.run(
                cmd,
                shell=True,
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=timeout,
                check=False,
            )
            return ShellResult(
                returncode=proc.returncode,
                output=proc.stdout,
                error=proc.stderr,
                result_type=CommandResult.SUCCESS if proc.returncode == 0 else CommandResult.ERROR,
            )
        except subprocess.TimeoutExpired:
            return ShellResult(
                returncode=-1,
                output="",
                error=f"Command timed out after {timeout}s",
                result_type=CommandResult.TIMEOUT,
            )
        except subprocess.CalledProcessError as e:
            return ShellResult(
                returncode=1,
                output="",
                error=str(e),
                result_type=CommandResult.ERROR,
            )

    def _get_action(self, cmd: str) -> PermissionAction:
        """Determine the permission action from the command."""
        return PermissionAction.SHELL_COMMAND
