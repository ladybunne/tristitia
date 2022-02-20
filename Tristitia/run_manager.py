import discord
import jsonpickle
from discord import Button, ButtonStyle

START_INDEX = 2
MAX_PARTY_SIZE = 8

FUTURE_RUNS_FILENAME = "future_runs.json"
PAST_RUNS_FILENAME = "past_runs.json"

# I know support and reserve aren't *actual* elements.
ELEMENTS = ["earth", "wind", "water", "fire", "lightning", "ice", "support", "reserve"]

# The Fire Place specific values

GUILD_ID = 931496853873238046
SIGNUP_CHANNEL_ID = 943732635597963294

ICONS = {
    "earth": "<:earthicon:941933371532148796>",
    "wind": "<:windicon:941933393241849867>",
    "water": "<:watericon:941933336031543336>",
    "fire": "<:fireicon:941933428251717692>",
    "lightning": "<:lightningicon:941933355719593994>",
    "ice": "<:iceicon:941933411990401044>",
    "support": "ℹ️",
    "reserve": ""
}

HEXES = {
    "earth": "<:earthhex:941931780108345355>",
    "wind": "<:windhex:941931797917347960>",
    "water": "<:waterhex:941931742107934810>",
    "fire": "<:firehex:941931847129108521>",
    "lightning": "<:lightninghex:941931762009931826>",
    "ice": "<:icehex:941931833275342929>",
    "support": "ℹ️",
    "reserve": ""
}

ELEMENT_BUTTON_STYLES = {
    "earth": ButtonStyle.grey, "wind": ButtonStyle.grey, "water": ButtonStyle.grey,
    "fire": ButtonStyle.grey, "lightning": ButtonStyle.grey, "ice": ButtonStyle.grey,
    "support": ButtonStyle.blurple, "reserve": ButtonStyle.green,
}

SP_EMOJI = "<:sp:944158078440456233>"


class Run:
    def __init__(self, run_id, raid_lead, time):
        self.run_id = run_id
        self.raid_lead = raid_lead
        self.time = time
        self.overview_message_id = None
        self.roster_message_id = None
        self.leads = {
            "earth": None, "wind": None, "water": None, "fire": None, "lightning": None, "ice": None, "support": None
        }
        self.roster = {
            "earth": [], "wind": [], "water": [], "fire": [], "lightning": [], "ice": [], "support": [], "reserve": []
        }

    # format party lead string for use in Overview (either None or <@ID>)
    def format_lead(self, element):
        if self.leads[element] is None:
            return " None"
        return f"<@{self.leads[element]}>"

    # caluclate no. of party members (used in roster field title display)
    def calculate_party_members(self, element):
        lead = 0 if element == "reserve" or self.leads[element] is None else 1
        return lead + len(self.roster[element])

    # format party title (for roster menu)
    def format_party_title(self, element):
        if element == "reserve":
            return f"Reserves ({self.calculate_party_members(element)})"

        party_count = f"{self.calculate_party_members(element)}/{MAX_PARTY_SIZE}"

        # if all non-lead spots are occupied, say FULL
        if len(self.roster[element]) >= MAX_PARTY_SIZE - 1:
            party_count = "FULL"

        return f"{ICONS[element]} {element.capitalize()} ({party_count})"

    # format a party's list of members
    def format_party_list(self, element):
        party_list = ""
        if element != "reserve" and self.leads[element] is not None:
            party_list = f"⭐<@{self.leads[element]}>\n"
        for user_id in self.roster[element]:
            party_list += f"<@{user_id}>"
            if len(self.roster[element]) == 0 or self.roster[element][-1] != user_id:
                party_list += "\n" if element != "reserve" else ", "
        if party_list == "":
            party_list = "None"
        return party_list

    # generate the overview embed
    def generate_embed_overview(self):
        embed = discord.Embed()

        def lead(element):
            return f"{HEXES[element]}{self.format_lead(element)}"

        leads_list = (f"\n{lead('earth')} {lead('wind')} {lead('water')}\n"
                      f"{lead('fire')} {lead('lightning')} {lead('ice')}\n"
                      f"{lead('support')}")

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
                             f"**Time**: <t:{self.time}:F>, <t:{self.time}:R>\n{SP_EMOJI}")
        for e in ELEMENTS:
            embed.add_field(name=self.format_party_title(e), value=self.format_party_list(e))
        return embed

    def check_current_lead(self, user_id):
        for e in ELEMENTS[:-1]:
            if user_id == self.leads[e]:
                return e
        return None

    def check_current_party(self, user_id):
        for e in ELEMENTS:
            if user_id in self.roster[e]:
                return e
        return None

    def lead_add(self, user_id, element):
        if self.leads[element] is None:
            self.leads[element] = user_id
            return True
        else:
            # this lead is occupied by someone else
            return False

    def lead_remove(self, user_id, element):
        if self.leads[element] == user_id:
            self.leads[element] = None
            return True
        else:
            # can't remove, not this lead
            return False

    def party_add(self, user_id, element):
        if user_id not in self.roster[element]:
            # -1 is because of leads
            if len(self.roster[element]) < MAX_PARTY_SIZE - 1:
                self.roster[element].append(user_id)
                return True
            else:
                # party full
                return False
        else:
            # already in party
            return False

    def party_remove(self, user_id, element):
        if user_id in self.roster[element]:
            try:
                self.roster[element].remove(user_id)
                return True
            except ValueError:
                # weird shit
                return False
        else:
            # already not in party
            return False

    def register_party_lead(self, user_id, element):
        existing_party = self.check_current_party(user_id)
        existing_lead = self.check_current_lead(user_id)
        changed = False

        # if leading this party, remove
        if element == existing_lead:
            changed = self.lead_remove(user_id, element)

        # if leading another party, move
        elif existing_lead is not None:
            if self.lead_add(user_id, element):
                if self.lead_remove(user_id, existing_lead):
                    changed = True
                else:
                    print("moved party lead could not be removed from previous lead position")

        # lead the selected party if no leader
        else:
            changed = self.lead_add(user_id, element)
            # if previously in a party, remove from party
            if changed and existing_party is not None:
                if self.party_remove(user_id, existing_party):
                    return changed
                else:
                    print("party member, moved to lead, could not be removed from previous party")

        return changed

    def register_party_member(self, user_id, element):
        existing_party = self.check_current_party(user_id)
        existing_lead = self.check_current_lead(user_id)
        changed = False

        # if already leading, can't join another party
        if existing_lead is not None:
            # DM about this.
            return changed

        # if in this party, remove
        elif element == existing_party:
            changed = self.party_remove(user_id, element)

        # if in another party, move
        elif existing_party is not None:
            if self.party_add(user_id, element):
                if self.party_remove(user_id, existing_party):
                    changed = True
                else:
                    print("moved party member could not be removed from previous party")

        # join the current party if it's not full
        else:
            changed = self.party_add(user_id, element)

        return changed

    async def send_embed_messages(self, signup_channel):
        overview_message = await signup_channel.send(embed=self.generate_embed_overview(),
                                                     components=generate_overview_buttons())
        roster_message = await signup_channel.send(embed=self.generate_embed_roster(),
                                                   components=generate_roster_buttons())
        self.overview_message_id = overview_message.id
        self.roster_message_id = roster_message.id


def load_runs(future=True):
    try:
        file = open(FUTURE_RUNS_FILENAME if future else PAST_RUNS_FILENAME, "r")
        loaded_runs = jsonpickle.decode(file.read())
        file.close()
        return loaded_runs
    except IOError:
        print(f"Unable to load {'future' if future else 'past'} runs.")
        return []


def save_runs():
    try:
        future_file = open(FUTURE_RUNS_FILENAME, "w")
        future_runs_out = jsonpickle.encode(future_runs, keys=True)
        future_file.write(future_runs_out)
        future_file.close()
        past_file = open(PAST_RUNS_FILENAME, "w")
        past_runs_out = jsonpickle.encode(past_runs, keys=True)
        past_file.write(past_runs_out)
        past_file.close()
        return True
    except IOError:
        print("saving failed")
        return False


# startup
future_runs = load_runs()
past_runs = load_runs(future=False)


def make_new_run(raid_lead, time):
    run_id = START_INDEX + len(future_runs) + len(past_runs)
    future_runs.append(Run(run_id, raid_lead, time))
    return future_runs[-1]


def get_run_from_interaction(i: discord.Interaction):
    # figure out which run is being edited
    for r in future_runs:
        if r.overview_message_id == i.message_id or r.roster_message_id == i.message_id:
            return r

    return None


async def update_embed(client, run, overview=True):
    signup_channel = client.get_guild(GUILD_ID).get_channel(SIGNUP_CHANNEL_ID)
    try:
        message_id = run.overview_message_id if overview else run.roster_message_id
        message = await signup_channel.fetch_message(message_id)
        generated_embed = run.generate_embed_overview() if overview else run.generate_embed_roster()
        await message.edit(embed=generated_embed)
        return True
    except discord.errors.NotFound:
        await regenerate_embeds(client)
        return False


async def regenerate_embeds(client):
    signup_channel = client.get_guild(GUILD_ID).get_channel(SIGNUP_CHANNEL_ID)

    try:
        # delete all messages in channel
        old_messages = await signup_channel.history().flatten()

        for old_message in old_messages:
            await old_message.delete()

        regen_message = await signup_channel.send("Regenerating embeds, please wait.")

        for run in future_runs:
            await run.send_embed_messages(signup_channel)

        await regen_message.delete()
    except Exception:
        print("unable to complete embed regeneration")


# generate the roster's buttons
def generate_roster_buttons():
    button_list = []
    for e in ELEMENTS:
        button_list.append(Button(label=f"{e} Party".title() if e != "reserve" else "Reserves",
                                  custom_id=e + "_party",
                                  style=ELEMENT_BUTTON_STYLES[e],
                                  emoji=ICONS[e] if e != "reserve" else None))
    row_1 = button_list[:3] + [button_list[-2]]
    row_2 = button_list[3:6] + [button_list[-1]]
    return [row_1, row_2]


# generate the overview's buttons
def generate_overview_buttons():
    button_list = []
    for e in ELEMENTS[:-1]:
        button_list.append(Button(label=f"{e} lead".title(),
                                  custom_id=e + "_lead",
                                  style=ELEMENT_BUTTON_STYLES[e],
                                  emoji=HEXES[e]))
    row_1 = button_list[:3] + [button_list[-1]]
    row_2 = button_list[3:6]
    return [row_1, row_2]


async def request_new_run(client, message, time):
    run = make_new_run(message.author.id, time)
    await message.channel.send((f"Created run with ID #{run.run_id}, led by <@{run.raid_lead}>, "
                                f"scheduled for <t:{run.time}:F> (<t:{run.time}:R>)."))
    signup_channel = client.get_channel(SIGNUP_CHANNEL_ID)
    await run.send_embed_messages(signup_channel)
    save_runs()
