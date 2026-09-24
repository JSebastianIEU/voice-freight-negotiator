"""The price guardian: the part of the negotiator that cannot be talked into anything.

Plain Python, no framework imports below ``tools.py``:

- ``range``         one question, "may this amount be paid?", answered from the load record
- ``policy``        how far and how fast the agent concedes, decided in code, not by the LLM
- ``events``        what the guardian tells the world (the web client's Core reacts to these)
- ``tools``         the two functions the LLM may call; their replies never contain the range
- ``output_filter`` the second layer: no unvalidated amount reaches text-to-speech

See docs/decisions/ADR-004-price-guardian-in-code.md for why two layers.
"""
