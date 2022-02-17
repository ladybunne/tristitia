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
        "earth": None, "wind": None, "water": None,
        "fire": None, "lightning": None, "ice": None,
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

    def calculate_party_members(self, key):
        return (0 if self.leads[key] is None else 1) + len(self.roster[key])


def make_new_run(raid_lead, time):
    run_id = start_index + len(upcoming_runs) + len(past_runs)
    upcoming_runs.append(Run(run_id, raid_lead, time))
    return upcoming_runs[-1]


def generate_run_embed_overview(run):
    embed = discord.Embed()
    embed.title = f"Run ID: #{run.run_id} - Overview"
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
    return embed


def generate_run_embed_roster(run):
    embed = discord.Embed()
    embed.title = f"Run ID: #{run.run_id} - Roster"
    embed.description = (f"**Raid Lead**: <@{run.raid_lead}>\n"
                         f"**Time**: <t:{run.time}:F> (<t:{run.time}:R>)\n\n"
                         f"__Parties__")
    embed.add_field(name=f"<:earthicon:941933371532148796> Earth Party ({run.calculate_party_members('earth')}/8)",
                    value="None")
    embed.add_field(name=f"<:windicon:941933393241849867> Wind Party ({run.calculate_party_members('wind')}/8)",
                    value="None")
    embed.add_field(name=f"<:watericon:941933336031543336> Water Party ({run.calculate_party_members('water')}/8)",
                    value="None")
    embed.add_field(name=f"<:fireicon:941933428251717692> Fire Party ({run.calculate_party_members('fire')}/8)",
                    value="None")
    embed.add_field(name=f"<:lightningicon:941933355719593994> Lightning Party ({run.calculate_party_members('lightning')}/8)",
                    value="None")
    embed.add_field(name=f"<:iceicon:941933411990401044> Ice Party ({run.calculate_party_members('ice')}/8)",
                    value="None")
    embed.add_field(name=f"ℹ️ Support Party ({run.calculate_party_members('support')}/8)",
                    value="None")
    embed.add_field(name=f"Reserves",
                    value="None")
    return embed


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
    await signup_channel.send(embed=generate_run_embed_overview(run))
    await signup_channel.send(embed=generate_run_embed_roster(run))
