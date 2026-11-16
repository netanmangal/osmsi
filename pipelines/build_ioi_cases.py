"""Freeze disjoint discovery/evaluation prompts for a narrow causal IOI study."""

import json
from pathlib import Path
import random

TEMPLATES = [
    "When {io} and {subject} went to the store, {repeat} gave a book to",
    "After {subject} and {io} arrived at the park, {repeat} handed a drink to",
]
DISCOVERY_NAMES = ["John", "Mary", "Alice", "Bob", "David", "Sarah", "Tom", "James"]
EVALUATION_NAMES = ["Michael", "Robert", "Emma", "Daniel", "Laura", "Peter",
                    "Anna", "Paul", "Mark", "Susan", "Lisa", "George"]


def cases():
    rng = random.Random(93)
    result = []
    for split, names, per_template in [
        ("discovery", DISCOVERY_NAMES, 32), ("evaluation", EVALUATION_NAMES, 64)
    ]:
        selected = []
        for number, template in enumerate(TEMPLATES):
            pairs = [(io, subject) for io in names for subject in names if io != subject]
            rng.shuffle(pairs)
            for io, subject in pairs[:per_template]:
                selected.append({"id": f"{split}-{number}-{io.lower()}-{subject.lower()}",
                                 "split": split, "template": number, "io": io, "subject": subject,
                                 "clean": template.format(io=io, subject=subject, repeat=subject),
                                 "corrupt": template.format(io=io, subject=subject, repeat=io)})
        rng.shuffle(selected)
        result.extend(selected)
    return {"version": "1.0.0", "seed": 93, "license": "Apache-2.0", "cases": result}


if __name__ == "__main__":
    path = Path("suites/causal-ioi-v1/cases.json")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(cases(), indent=2) + "\n")
    print(f"Frozen {len(cases()['cases'])} cases: {path}")
