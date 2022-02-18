import re

import discord

import run_manager as rm


async def on_ready(client):
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


async def on_click_lead(client, i: discord.Interaction, button, element):
    print(f"tried to sign up as {element} lead")
    await i.defer()


async def on_click_party(client, i: discord.Interaction, button, element):
    print(f"tried to join {element} party")
    run = rm.get_run_from_interaction(i)
    if run is None:
        await i.defer()
    else:
        if run.register_party_member(i.user_id, element):
            await i.edit(embed=run.generate_embed_roster())

        else:
            await i.defer()

