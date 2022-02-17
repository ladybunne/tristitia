import discord
import logging

import client_events as ce

logging.basicConfig(level=logging.INFO)

client = discord.Client()

@client.event
async def on_ready():
    await ce.on_ready(client)

@client.event
async def on_message(message):
    await ce.on_message(client, message)

tokenFile = open("token.txt")
token = tokenFile.read()
tokenFile.close()

client.run(token)
