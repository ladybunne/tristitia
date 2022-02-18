import re

import run_manager as rm


def on_ready(client):
    print('We have logged in as {0.user}'.format(client))


async def on_message(client, message):
    if message.author == client.user:
        return

    if message.content.startswith("!new"):
        m = re.search("[0-9]{8,}", message.content)
        if m is None:
            await message.channel.send("Expected argument: time (use Unix time)")
        time = m.group(0)
        await rm.request_new_run(client, message, time)
