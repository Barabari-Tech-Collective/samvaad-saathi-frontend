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


if __name__ == "__main__":
    unittest.main()
