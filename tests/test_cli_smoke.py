from typer.testing import CliRunner

from innoinvest.cli import app

runner = CliRunner()


def test_cli_help_lists_subcommands():
    result = runner.invoke(app, ["--help"])
    assert result.exit_code == 0
    for cmd in ["seed", "ingest", "serve"]:
        assert cmd in result.stdout
