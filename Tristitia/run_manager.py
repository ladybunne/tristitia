import discord
from discord import ActionRow, Button, ButtonStyle
import pickle

start_index = 2
future_runs = []
past_runs = []
max_party_size = 8

future_runs_filename = "future_runs.pk"
past_runs_filename = "past_runs.pk"

# I know support and reserve aren't *actual* elements.
elements = ["earth", "wind", "water", "fire", "lightning", "ice", "support", "reserve"]

# The Fire Place specific values

guild_id = 931496853873238046
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

element_button_styles = {
    "earth": ButtonStyle.grey, "wind": ButtonStyle.grey, "water": ButtonStyle.grey,
    "fire": ButtonStyle.grey, "lightning": ButtonStyle.grey, "ice": ButtonStyle.grey,
    "support": ButtonStyle.blurple, "reserve": ButtonStyle.green,
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

    # format party title (for roster menu)
    def format_party_title(self, element):
        if element == "reserve":
            return f"Reserves ({self.calculate_party_members(element)})"
        return f"{icons[element]} {element.capitalize()} ({self.calculate_party_members(element)}/{max_party_size})"

    # format a party's list of members
    def format_party_list(self, element):
        if len(self.roster[element]) == 0:
            return "None"
        else:
            party_list = ""
            for user_id in self.roster[element]:
                party_list += f"<@{user_id}>\n"
            return party_list

    # generate the overview embed
    def generate_embed_overview(self):
        embed = discord.Embed()

        leads_list = ""
        for element in elements[:-1]:
            leads_list += f"\n{hexes[element]} {self.format_lead(element)}"

        embed.title = f"Run ID: #{self.run_id} - Overview"
        embed.description = (f"**Raid Lead**: <@{self.raid_lead}>\n"
                             f"**Time**: <t:{self.time}:F>, <t:{self.time}:R>\n\n"
                             f"**Party Leads:**"
                             f"{leads_list}")
        return embed

    # generate the roster embed
    def generate_embed_roster(self):
        embed = discord.Embed()
        embed.title = f"Run ID: #{self.run_id} - Roster"
        embed.description = (f"**Raid Lead**: <@{self.raid_lead}>\n"
                             f"**Time**: <t:{self.time}:F>, <t:{self.time}:R>\n{sp_emoji}")
        for e in elements:
            embed.add_field(name=self.format_party_title(e), value=self.format_party_list(e))
        return embed

    # generate the overview's buttons
    def generate_overview_buttons(self):
        button_list = []
        for e in elements[:-1]:
            button_list.append(Button(label=f"{e} lead".title(),
                                      custom_id=e + "_lead",
                                      style=element_button_styles[e],
                                      emoji=hexes[e]))
        row_1 = button_list[:3] + [button_list[-1]]
        row_2 = button_list[3:6]
        return [row_1, row_2]

    # generate the roster's buttons
    def generate_roster_buttons(self):
        button_list = []
        for e in elements:
            button_list.append(Button(label=f"{e} Party".title() if e != "reserve" else "Reserves",
                                      custom_id=e + "_party",
                                      style=element_button_styles[e],
                                      emoji=icons[e] if e != "reserve" else None))
        row_1 = button_list[:3] + [button_list[-2]]
        row_2 = button_list[3:6] + [button_list[-1]]
        return [row_1, row_2]

    # update embeds on overview and roster messages (requires a client)
    def update_embeds(self, client):
        return

    def check_current_party(self, user_id):
        for e in elements:
            if user_id in self.roster[e]:
                return e
        return None

    def register_party_lead(self, user_id, element):
        return

    def register_party_member(self, user_id, element):
        print("blah")

        existing_party = self.check_current_party(user_id)
        changed = False

        # if in this party, remove
        if element == existing_party:
            try:
                self.roster[element].remove(user_id)
                print(f"removed user {user_id} from {element} party")
                changed = True
            except ValueError:
                print("Something broke.")

        # if in another party
        elif existing_party is not None:
            # uh idk sort this out later
            print("idfk")
            return

        # join the current party if it's not full
        else:
            if len(self.roster[element]) < max_party_size:
                self.roster[element].append(user_id)
                print(f"added user {user_id} to {element} party")
                changed = True
            else:
                print(f"party {element} is full, user {user_id} could not join")

        return changed


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


def register_party_lead():
    return


def get_run_from_interaction(i: discord.Interaction):
    # figure out which run is being edited
    for r in future_runs:
        if r.roster_message_id == i.message_id:
            return r

    print("very bad stuff")
    return Run(0, 0, 0)


async def update_embeds(client, run):
    signup_channel = client.get_guild(guild_id).get_channel(signup_channel_id)
    overview_message = await signup_channel.fetch_message(run.overview_message_id)
    roster_message = await signup_channel.fetch_message(run.roster_message_id)
    await overview_message.edit(embed=run.generate_embed_overview())
    await roster_message.edit(embed=run.generate_embed_roster())


async def request_new_run(client, message, time):
    run = make_new_run(message.author.id, time)
    await message.channel.send((f"Created run with ID #{run.run_id}, led by <@{run.raid_lead}>, "
                                f"scheduled for <t:{run.time}:F> (<t:{run.time}:R>)."))
    signup_channel = client.get_channel(signup_channel_id)
    overview_message = await signup_channel.send(embed=run.generate_embed_overview(),
                                                 components=run.generate_overview_buttons())
    roster_message = await signup_channel.send(embed=run.generate_embed_roster(),
                                               components=run.generate_roster_buttons())
    run.overview_message_id = overview_message.id
    run.roster_message_id = roster_message.id
    save_runs()
