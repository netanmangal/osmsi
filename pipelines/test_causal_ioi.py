import importlib.util
import unittest

from build_ioi_cases import cases


class FrozenCausalCases(unittest.TestCase):
    def test_discovery_and_evaluation_are_disjoint_and_balanced(self):
        document = cases()
        discovery = [r for r in document["cases"] if r["split"] == "discovery"]
        evaluation = [r for r in document["cases"] if r["split"] == "evaluation"]
        self.assertEqual((len(discovery), len(evaluation)), (64, 128))
        self.assertEqual(len({r["id"] for r in document["cases"]}), 192)
        self.assertFalse({r[k] for r in discovery for k in ("io", "subject")}
                         & {r[k] for r in evaluation for k in ("io", "subject")})
        for rows in (discovery, evaluation):
            self.assertEqual(sum(r["template"] == 0 for r in rows), len(rows)//2)


@unittest.skipUnless(importlib.util.find_spec("torch") and importlib.util.find_spec("transformers"),
                     "Optional weight-access dependencies are not installed.")
class CausalBackendTests(unittest.TestCase):
    def test_positive_self_and_unchanged_prefix_controls(self):
        import torch
        from transformers import GPT2Config, GPT2LMHeadModel
        from evaluate_causal_ioi import forward
        torch.manual_seed(1)
        config = GPT2Config(n_layer=2, n_head=2, n_embd=16, vocab_size=32, n_positions=16)
        config._attn_implementation = "eager"
        model = GPT2LMHeadModel(config).eval()
        clean = {"input_ids": torch.tensor([[1, 2, 3, 4, 5], [1, 3, 2, 4, 5]]),
                 "attention_mask": torch.ones((2, 5), dtype=torch.long)}
        corrupt = {k: v.clone() for k, v in clean.items()}
        corrupt["input_ids"][:, 2] = torch.tensor([7, 8])
        pos, final = torch.tensor([2, 2]), torch.tensor([4, 4])
        io, subject = torch.tensor([10, 11]), torch.tensor([11, 10])
        clean_gap, clean_cache = forward(model, clean, pos, final, io, subject, cache=True)
        corrupt_gap, corrupt_cache = forward(model, corrupt, pos, final, io, subject, cache=True)
        for patch, expected in [
            ((1, final, clean_cache[1]["final"]), clean_gap),
            ((0, pos, corrupt_cache[0]["subject"]), corrupt_gap),
            ((0, torch.zeros_like(pos), clean_cache[0]["prefix"]), corrupt_gap),
        ]:
            actual, _ = forward(model, corrupt, pos, final, io, subject, patch=patch)
            self.assertTrue(torch.allclose(torch.tensor(actual), torch.tensor(expected), atol=1e-6))
        self.assertTrue(all(not block._forward_hooks for block in model.transformer.h))
