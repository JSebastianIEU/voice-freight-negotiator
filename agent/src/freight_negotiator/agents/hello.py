"""Milestone 1: the smallest agent that proves the pipeline works end to end.

No negotiation, no tools. If you can talk to this from the browser, interrupt it
mid-sentence and get a sensible reply, the transport, VAD, STT, turn detection,
LLM and TTS are all wired correctly. Everything after this milestone changes the
agent's brain, not its plumbing.
"""

from livekit.agents import Agent

INSTRUCTIONS = """\
You are a friendly voice assistant used to test a real-time voice pipeline.
You are speaking, not writing: keep replies to one or two short sentences,
no lists, no markdown, no emojis. If the user asks what you can do, say that
for now you only chat, and that soon you will negotiate freight rates.
"""


class HelloAgent(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=INSTRUCTIONS)
