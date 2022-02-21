import calendar

import discord
import jsonpickle
import random
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from discord import Button, ButtonStyle

START_INDEX = 2
MAX_PARTY_SIZE = 8

FUTURE_RUNS_FILENAME = "future_runs.json"
PAST_RUNS_FILENAME = "past_runs.json"

# -15, 0, 10
LEADS_TIME_DELTA = -1
MEMBERS_TIME_DELTA = 0
RESERVES_TIME_DELTA = 1

# async events to notify people of passwords and stuff
scheduler = AsyncIOScheduler(timezone="utc")
scheduler.start()

# randomiser for passwords
random.seed()

# I know support and reserve aren't *actual* elements.
ELEMENTS = ["earth", "wind", "water", "fire", "lightning", "ice", "support", "reserve"]

MSG_PARTY_LEAD_SWAP_TO_MEMBER = (
    "**Unable to join {icon}{element_party} Party**. You are currently registered as **{hex}{element_lead} Lead**.\n"
    "Please unregister from the lead position, by clicking the button again, if you wish to join a party as a non-lead."
)

MSG_NOTIFY_LEADS = (
    "Hello, Run #{run_id}'s **{hex}{element} Lead**! It's time to put up your party!\n"
    "**The password for your party ({element}) is __{password}__**.\n\n"
    
    "Please put up your party ASAP, with the above password, under Adventuring Forays -> Eureka Hydatos.\n"
    "Copy this text and use it for the party description:\n"
    "```The Fire Place vs BA, Run #{run_id} - {element} Party```\n"
    
    "Please ensure you have, in total, **1 tank**, **2 healers** and **5 any** slots listed, minus yourself.\n"
    "Leave all other settings untouched.\n\n"
    
    "Party members will receive passwords <t:{time}:R>, at <t:{time}:F>. "
    "Please have your party up and configured by then!\n\n"
    
    "If you have any questions about this process, please DM Athena (<@97139537569910784>)! Thank you!"
)

MSG_NOTIFY_MEMBERS = (
    "Hello, members of Run #{run_id}'s **{icon}{element} Party**! It's time to join your party!\n"
    "**The password for your party ({element}) is __{password}__**.\n\n"
    
    "Please look under Private in the Party Finder for your party. It should be listed under Adventuring Forays -> "
    "Eureka Hydatos, with **{icon}{element}** as the listed element and <@{lead}> as the party lead.\n\n"
    
    "Please try and join before <t:{time}:F>, <t:{time}:R> - reserves will receive all passwords at that time!\n"
    "If you are able, please join as a **tank** or **healer** - BA can't happen without them!\n\n"
    
    "If you need help, feel free to ask here in this thread. your lead (<@{lead}>) should see it. "
    "If it's urgent, ping them!\n\n"
    
    "If you have any questions about this process, please DM Athena! Thank you!"
)

MSG_NOTIFY_RESERVES = (
    "Hello, reserves of Run #{run_id}! It's your time to shine!\n"
    "Below are the passwords to **ALL parties**. With these, you can fill any remaining spots! Go go!\n\n"
    
    "{password_list}\n\n"
    
    "If any parties are still up, they'll be under Private in the Party Finder. They should be listed under "
    "Adventuring Forays -> Eureka Hydatos, with the element in the description.\n\n"
    
    "Act quick! There's no guarantee that there _are_ open spots. If there aren't, I'm deeply sorry!\n"
    "Please still come into the instance either way - having people on hand is always helpful, and who knows? "
    "You might end up on the run after all, if emergency fills are needed!\n\n"

    "If you have any questions about this process, please DM Athena! Thank you!"
)

MSG_PARTY_THREAD_NAME = "Run {run_id} - {element} Party"

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
        self.passwords = {
            "earth": None, "wind": None, "water": None, "fire": None, "lightning": None, "ice": None, "support": None
        }
        self.threads = {
            "earth": None, "wind": None, "water": None, "fire": None, "lightning": None, "ice": None,
            "support": None, "reserve": None
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
            party_list = f"⭐<@{self.leads[element]}>"
        if len(self.roster[element]) > 0:
            party_list += "\n"
        for user_id in self.roster[element]:
            party_list += f"<@{user_id}>"
            if len(self.roster[element]) == 0 or self.roster[element][-1] != user_id:
                party_list += "\n" if element != "reserve" else ", "
        if party_list == "":
            party_list = "None"
        return party_list

    def leads_notify_time(self):
        return datetime.utcfromtimestamp(self.time) + timedelta(minutes=LEADS_TIME_DELTA)

    def members_notify_time(self):
        return datetime.utcfromtimestamp(self.time) + timedelta(minutes=MEMBERS_TIME_DELTA)

    def reserves_notify_time(self):
        return datetime.utcfromtimestamp(self.time) + timedelta(minutes=RESERVES_TIME_DELTA)

    def generate_passwords(self):
        def generate_password():
            password = ""
            for _ in range(4):
                password += str(random.randrange(10))
            return password

        for element in self.passwords:
            self.passwords[element] = generate_password()

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

    async def register_party_lead(self, i: discord.Interaction, element):
        user_id = i.user_id
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

    async def register_party_member(self, i: discord.Interaction, element):
        user_id = i.user_id
        existing_party = self.check_current_party(user_id)
        existing_lead = self.check_current_lead(user_id)
        changed = False

        # if already leading, can't join another party
        if existing_lead is not None:
            try:
                await i.user.send((
                    f"{MSG_PARTY_LEAD_SWAP_TO_MEMBER}".format(icon=ICONS[element],
                                                              element_party=element.capitalize(),
                                                              hex=HEXES[existing_lead],
                                                              element_lead=existing_lead.capitalize())))
            except:
                print(f"unable to DM user {user_id} about swapping off lead")
            return False

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

    async def notify_leads(self, client):
        members_notify_time = self.members_notify_time()

        for element in ELEMENTS[:-1]:
            # generate passwords now!
            if self.leads[element] is None:
                print(f"no lead found for element: {element}")
                continue

            user = await client.fetch_user(self.leads[element])
            if user is None:
                print(f"{element} lead could not be retrieved")
                continue

            try:
                await user.send(f"{MSG_NOTIFY_LEADS}".format(hex=HEXES[element],
                                                             element=element.capitalize(),
                                                             run_id=self.run_id,
                                                             password=self.passwords[element],
                                                             time=calendar.timegm(members_notify_time.utctimetuple())))
            except:
                print(f"unable to send DM to lead with ID: {user.id}")

    async def notify_members(self, client):
        signup_channel = client.get_guild(GUILD_ID).get_channel(SIGNUP_CHANNEL_ID)
        reserves_notify_time = self.reserves_notify_time()

        # if even a single thread exists, this has likely already happened
        for existing_thread in self.threads.values():
            if existing_thread is not None:
                return

        # private threads for this
        for element in ELEMENTS[:-1]:
            # if roster is totally empty, skip it
            if self.leads[element] is None and not self.roster[element]:
                continue

            # create thread
            thread = await signup_channel.create_private_thread(name=MSG_PARTY_THREAD_NAME.
                                                                format(element=element.capitalize(),
                                                                       run_id=self.run_id),
                                                                minutes=1440)
            self.threads[element] = thread["id"]

            message = (f"{self.format_party_list(element)}\n\n"
                       f"{MSG_NOTIFY_MEMBERS}".format(icon=ICONS[element],
                                                      element=element.capitalize(),
                                                      run_id=self.run_id,
                                                      password=self.passwords[element],
                                                      lead=self.leads[element],
                                                      time=calendar.timegm(reserves_notify_time.utctimetuple())))
            thread_message_json = await client.send_message_in_thread(thread["id"], message)

        save_runs()
        return

    async def notify_reserves(self, client):
        signup_channel = client.get_guild(GUILD_ID).get_channel(SIGNUP_CHANNEL_ID)

        # TODO do this tomorrow
        return


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


def make_new_run(raid_lead, time):
    run_id = START_INDEX + len(future_runs) + len(past_runs)
    new_run = Run(run_id, raid_lead, time)
    new_run.generate_passwords()

    future_runs.append(new_run)
    return new_run


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
    except:
        print("unable to complete embed regeneration")


def schedule_run(client, run):
    async def notify_leads():
        await run.notify_leads(client)

    async def notify_members():
        await run.notify_members(client)

    async def notify_reserves():
        await run.notify_reserves(client)

    async def post_run_cleanup():
        return

    events = [(notify_leads, run.leads_notify_time()),
              (notify_members, run.members_notify_time()),
              (notify_reserves, run.reserves_notify_time())]

    for event in events:
        scheduler.add_job(event[0], "date", run_date=event[1])

    return


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
    schedule_run(client, run)
    save_runs()

# startup
future_runs = load_runs()
past_runs = load_runs(future=False)
