import discord

signup_channel_id = 943732635597963294
start_index = 2
upcoming_runs = []
past_runs = []


class Run:
    def __init__(self, run_id, raid_lead, time):
        self.run_id = run_id
        self.raid_lead = raid_lead
        self.time = time

    lead_message_id = None
    roster_message_id = None

    leads = {
        "earth":  None, "wind": None, "water": None,
        "fire": 97139537569910784, "lightning": None, "ice": None,
        "support": None
    }

    roster = {
        "earth": [], "wind": [], "water": [],
        "fire": [], "lightning": [], "ice": [],
        "support": [],
        "reserve": []
    }

    def format_lead(self, key):
        if self.leads[key] is None:
            return None
        return f"<@{self.leads[key]}>"


def make_new_run(raid_lead, time):
    run_id = start_index + len(upcoming_runs) + len(past_runs)
    upcoming_runs.append(Run(run_id, raid_lead, time))
    return upcoming_runs[-1]


def generate_run_embed_leads(client, run):
    embed = discord.Embed()
    embed.title = f"Run ID: #{run.run_id}"
    embed.description = (f"**Raid Lead**: <@{run.raid_lead}>\n"
                        f"**Time**: <t:{run.time}:F> (<t:{run.time}:R>)\n\n"
                        f"__Party Leads__\n"
                        f"<:earthhex:941931780108345355> {run.format_lead('earth')}\n"
                        f"<:windhex:941931797917347960> {run.format_lead('wind')}\n"
                        f"<:waterhex:941931742107934810> {run.format_lead('water')}\n"
                        f"<:firehex:941931847129108521> {run.format_lead('fire')}\n"
                        f"<:lightninghex:941931762009931826> {run.format_lead('lightning')}\n"
                        f"<:icehex:941931833275342929> {run.format_lead('ice')}\n"
                        f"ℹ️ {run.format_lead('support')}")
    # client.get_channel(signup_channel_id)
    return embed


def generate_run_embed_roster(client):
    return


async def regenerate_run(client, run=None):
    if run is None:
        # do them all
        return
    else:
        return

async def request_new_run(client, message, time):
    # actually do logic shit
    run = make_new_run(message.author.id, time)
    await message.channel.send((f"Created run with ID #{run.run_id}, led by <@{run.raid_lead}>,"
                                f"scheduled for <t:{run.time}:F> (<t:{run.time}:R>)."))
    signup_channel = client.get_channel(signup_channel_id)
    await signup_channel.send(embed=generate_run_embed_leads(client, run))


