import discord
import pickle

start_index = 2
future_runs = []
past_runs = []

future_runs_filename = "future_runs.pk"
past_runs_filename = "past_runs.pk"

# I know support and reserve aren't *actual* elements.
elements = ["earth", "wind", "water", "fire", "lightning", "ice", "support", "reserve"]

# The Fire Place specific values

signup_channel_id = 943732635597963294

icons = {
    "earth": "<:earthicon:941933371532148796>",
    "wind": "<:windicon:941933393241849867>",
    "water": "<:watericon:941933336031543336>",
    "fire": "<:fireicon:941933428251717692>",
    "lightning": "<:lightningicon:941933355719593994>",
    "ice": "<:iceicon:941933411990401044>",
    "support": "ℹ️",
    "reserve": ""
}

hexes = {
    "earth": "<:earthhex:941931780108345355>",
    "wind": "<:windhex:941931797917347960>",
    "water": "<:waterhex:941931742107934810>",
    "fire": "<:firehex:941931847129108521>",
    "lightning": "<:lightninghex:941931762009931826>",
    "ice": "<:icehex:941931833275342929>",
    "support": "ℹ️",
    "reserve": ""
}

sp_emoji = "<:sp:944158078440456233>"

class Run:
    def __init__(self, run_id, raid_lead, time):
        self.run_id = run_id
        self.raid_lead = raid_lead
        self.time = time

    overview_message_id = None
    roster_message_id = None

    leads = {
        "earth": None, "wind": None, "water": None, "fire": None, "lightning": None, "ice": None, "support": None
    }

    roster = {
        "earth": [], "wind": [], "water": [], "fire": [], "lightning": [], "ice": [], "support": [], "reserve": []
    }

    # format party lead string for use in Overview (either None or <@ID>)
    def format_lead(self, key):
        if self.leads[key] is None:
            return None
        return f"<@{self.leads[key]}>"

    # caluclate no. of party members (used in roster field title display)
    def calculate_party_members(self, key):
        lead = 0 if key == "reserve" or self.leads[key] is None else 1
        return lead + len(self.roster[key])

    def format_party_title(self, element):
        if element == "reserve":
            return f"Reserves ({self.calculate_party_members(element)})"
        return f"{icons[element]} {element.capitalize()} ({self.calculate_party_members(element)}/8)"

    def generate_embed_overview(self):
        embed = discord.Embed()

        leads_list = ""
        for element in elements[:-1]:
            leads_list += f"\n{hexes[element]} {self.format_lead(element)}"
        print(leads_list)

        embed.title = f"Run ID: #{self.run_id} - Overview"
        embed.description = (f"**Raid Lead**: <@{self.raid_lead}>\n"
                             f"**Time**: <t:{self.time}:F> (<t:{self.time}:R>)\n\n"
                             f"**Party Leads:**"
                             f"{leads_list}")
        return embed

    def generate_embed_roster(self):
        embed = discord.Embed()
        embed.title = f"Run ID: #{self.run_id} - Roster"
        embed.description = (f"**Raid Lead**: <@{self.raid_lead}>\n"
                             f"**Time**: <t:{self.time}:F> (<t:{self.time}:R>)\n{sp_emoji}")
        for e in elements:
            embed.add_field(name=self.format_party_title(e), value="None")
        return embed

    # update embeds on overview and roster messages (requires a client)
    def update_embeds(self, client):
        return

# startup
try:
    future_file = open(future_runs_filename, "rb")
    future_runs = pickle.load(future_file)
    future_file.close()
except IOError:
    print("Unable to load stored runs.")


def make_new_run(raid_lead, time):
    run_id = start_index + len(future_runs) + len(past_runs)
    future_runs.append(Run(run_id, raid_lead, time))
    return future_runs[-1]


def save_runs():
    future_file = open(future_runs_filename, "wb")
    pickle.dump(future_runs, future_file)
    future_file.close()


async def request_new_run(client, message, time):
    run = make_new_run(message.author.id, time)
    await message.channel.send((f"Created run with ID #{run.run_id}, led by <@{run.raid_lead}>, "
                                f"scheduled for <t:{run.time}:F> (<t:{run.time}:R>)."))
    signup_channel = client.get_channel(signup_channel_id)
    overview_message = await signup_channel.send(embed=run.generate_embed_overview())
    roster_message = await signup_channel.send(embed=run.generate_embed_roster())
    run.overview_message_id = overview_message.id
    run.roster_message_id = roster_message.id
    print(f"{run.overview_message_id} {run.roster_message_id}")
    save_runs()

