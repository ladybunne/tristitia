import discord
import requests
from discord.ext import commands
import logging

import client_events as ce

logging.basicConfig(level=logging.INFO)


async def create_public_thread(self, name, minutes):
    token = 'Bot ' + self._state.http.token
    url = f"https://discord.com/api/v9/channels/{self.id}/threads"
    headers = {
        "authorization": token,
        "content-type": "application/json"
    }
    data = {
        "name": name,
        "type": 11,
        "auto_archive_duration": minutes
    }

    return requests.post(url, headers=headers, json=data).json()


async def create_private_thread(self, name, minutes):
    token = 'Bot ' + self._state.http.token
    url = f"https://discord.com/api/v9/channels/{self.id}/threads"
    headers = {
        "authorization": token,
        "content-type": "application/json"
    }
    data = {
        "name": name,
        "type": 12,
        "auto_archive_duration": minutes
    }

    return requests.post(url, headers=headers, json=data).json()


async def send_message_in_thread(self, channel_id, message):
    token = 'Bot ' + self.http.token
    url = f"https://discord.com/api/v9/channels/{channel_id}/messages"
    headers = {
        "authorization": token,
        "content-type": "application/json"
    }
    data = {
        "channel_id": channel_id,
        "type": 0,
        "content": message
    }

    return requests.post(url, headers=headers, json=data).json()


discord.TextChannel.create_public_thread = create_public_thread
discord.TextChannel.create_private_thread = create_private_thread
commands.Bot.send_message_in_thread = send_message_in_thread

client = commands.Bot(command_prefix=commands.when_mentioned_or('!'))


@client.event
async def on_ready():
    await ce.on_ready(client)


@client.event
async def on_message(message):
    await ce.on_message(client, message)


# Join lead buttons

@client.on_click()
async def earth_lead(i: discord.Interaction, button):
    await ce.on_click_lead(client, i, button, "earth")


@client.on_click()
async def wind_lead(i: discord.Interaction, button):
    await ce.on_click_lead(client, i, button, "wind")


@client.on_click()
async def water_lead(i: discord.Interaction, button):
    await ce.on_click_lead(client, i, button, "water")


@client.on_click()
async def fire_lead(i: discord.Interaction, button):
    await ce.on_click_lead(client, i, button, "fire")


@client.on_click()
async def lightning_lead(i: discord.Interaction, button):
    await ce.on_click_lead(client, i, button, "lightning")


@client.on_click()
async def ice_lead(i: discord.Interaction, button):
    await ce.on_click_lead(client, i, button, "ice")


@client.on_click()
async def support_lead(i: discord.Interaction, button):
    await ce.on_click_lead(client, i, button, "support")


# Join party buttons

@client.on_click()
async def earth_party(i: discord.Interaction, button):
    await ce.on_click_party(client, i, button, "earth")


@client.on_click()
async def wind_party(i: discord.Interaction, button):
    await ce.on_click_party(client, i, button, "wind")


@client.on_click()
async def water_party(i: discord.Interaction, button):
    await ce.on_click_party(client, i, button, "water")


@client.on_click()
async def fire_party(i: discord.Interaction, button):
    await ce.on_click_party(client, i, button, "fire")


@client.on_click()
async def lightning_party(i: discord.Interaction, button):
    await ce.on_click_party(client, i, button, "lightning")


@client.on_click()
async def ice_party(i: discord.Interaction, button):
    await ce.on_click_party(client, i, button, "ice")


@client.on_click()
async def support_party(i: discord.Interaction, button):
    await ce.on_click_party(client, i, button, "support")


@client.on_click()
async def reserve_party(i: discord.Interaction, button):
    await ce.on_click_party(client, i, button, "reserve")


tokenFile = open("token.txt")
token = tokenFile.read()
tokenFile.close()

client.run(token)
