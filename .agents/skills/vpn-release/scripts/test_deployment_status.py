import json
import unittest

from deployment_status import snapshot


class DeploymentEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.sha = 'a' * 40
        self.data = {
            'id': 'dpl_example', 'name': 'vpn-site', 'projectId': 'prj_site',
            'readyState': 'READY', 'target': 'production',
            'meta': {'githubCommitSha': self.sha},
            'alias': ['vpn.example.com'], 'url': 'deployment.example.com',
        }

    def check(self, **kwargs):
        return snapshot(self.data, 'vpn-site', 'production', self.sha, **kwargs)

    def test_ready_is_platform_evidence_not_browser_evidence(self):
        code, result = self.check(domain='vpn.example.com')
        self.assertEqual(code, 0)
        self.assertTrue(result['commitVerified'])
        self.assertFalse(result['uiVerified'])

    def test_success_message_cannot_override_initializing_state(self):
        self.data.update(readyState='INITIALIZING', message='Deployment ready', status='ok')
        self.assertEqual(self.check()[0], 2)

    def test_different_commit_is_refused(self):
        self.data['meta']['githubCommitSha'] = 'b' * 40
        self.assertEqual(self.check()[1]['result'], 'COMMIT_MISMATCH')

    def test_different_project_is_refused(self):
        self.data.update(name='vpn-news', projectId='prj_news')
        self.assertEqual(self.check()[1]['result'], 'PROJECT_MISMATCH')

    def test_unexpected_production_is_refused_for_preview(self):
        self.assertEqual(snapshot(self.data, 'vpn-site', 'preview')[1]['result'], 'TARGET_MISMATCH')

    def test_null_target_is_ordinary_preview(self):
        self.data['target'] = None
        self.assertEqual(snapshot(self.data, 'vpn-site', 'preview', self.sha)[0], 0)

    def test_custom_environment_is_not_mistaken_for_preview(self):
        self.data.update(target=None, customEnvironment={'id': 'env_custom'})
        self.assertEqual(snapshot(self.data, 'vpn-site', 'preview')[0], 1)

    def test_domain_can_still_be_pending_after_ready(self):
        self.data['alias'] = []
        self.assertEqual(self.check(domain='vpn.example.com')[1]['result'], 'WAITING_ALIAS')

    def test_ready_without_expected_commit_is_not_proof(self):
        self.data['meta'] = {}
        self.assertEqual(self.check()[1]['result'], 'COMMIT_UNVERIFIED')

    def test_build_error_is_terminal(self):
        self.data['readyState'] = 'ERROR'
        self.assertEqual(self.check()[1]['result'], 'FAILED')

    def test_private_response_fields_are_not_printed(self):
        self.data['env'] = {'SECRET': 'do-not-print-this'}
        self.data['meta']['privateValue'] = 'also-private'
        serialized = json.dumps(self.check()[1])
        self.assertNotIn('do-not-print-this', serialized)
        self.assertNotIn('also-private', serialized)


if __name__ == '__main__':
    unittest.main()
