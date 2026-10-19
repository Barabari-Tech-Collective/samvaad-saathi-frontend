"""Regression tests for the production release controls."""

import importlib.util
import os
import pathlib
import unittest
from unittest import mock


RELEASE_PATH = pathlib.Path(__file__).with_name("release.py")


def load_release_module():
    spec = importlib.util.spec_from_file_location("samvaad_frontend_release", RELEASE_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class HostedSmokeTest(unittest.TestCase):
    def test_health_probe_identifies_itself_to_edge_security(self):
        release = load_release_module()
        captured = {}

        class HealthyResponse:
            status = 200

            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

        def urlopen(request, *, timeout):
            captured["request"] = request
            captured["timeout"] = timeout
            return HealthyResponse()

        with mock.patch.dict(
            os.environ,
            {"HEALTH_URL": "https://practice.example.test/health"},
        ), mock.patch.object(release.urllib.request, "urlopen", urlopen):
            release.smoke()

        self.assertEqual(
            captured["request"].get_header("User-agent"),
            "Samvaad-Release-Health-Check/1.0",
        )
        self.assertEqual(
            captured["request"].get_header("Accept"),
            "application/json",
        )
        self.assertEqual(captured["timeout"], 30)


class DestinationAccountTest(unittest.TestCase):
    def test_matching_account(self):
        release = load_release_module()
        with mock.patch.dict(os.environ, {"AWS_EXPECTED_ACCOUNT_ID": "222222222222", "AWS_REGION": "eu-west-1"}), mock.patch.object(release, "command", return_value={"Account": "222222222222"}):
            self.assertEqual(release.verify_aws_destination(), "222222222222")

    def test_other_account_is_blocked(self):
        release = load_release_module()
        with mock.patch.dict(os.environ, {"AWS_EXPECTED_ACCOUNT_ID": "222222222222", "AWS_REGION": "eu-west-1"}), mock.patch.object(release, "command", return_value={"Account": "111111111111"}):
            with self.assertRaisesRegex(RuntimeError, "account mismatch"):
                release.verify_aws_destination()

    def test_missing_account_is_blocked_without_an_aws_call(self):
        release = load_release_module()
        with mock.patch.dict(os.environ, {}, clear=True), mock.patch.object(release, "command") as command:
            with self.assertRaisesRegex(RuntimeError, "AWS_EXPECTED_ACCOUNT_ID"):
                release.verify_aws_destination()
            command.assert_not_called()

    def test_malformed_account_is_blocked_without_an_aws_call(self):
        release = load_release_module()
        with mock.patch.dict(os.environ, {"AWS_EXPECTED_ACCOUNT_ID": "invalid", "AWS_REGION": "eu-west-1"}), mock.patch.object(release, "command") as command:
            with self.assertRaisesRegex(RuntimeError, "12 digits"):
                release.verify_aws_destination()
            command.assert_not_called()


if __name__ == "__main__":
    unittest.main()
