Components:

CreateEvent text command
    Run within a channel in the server
    Expected parameters: time
        Maybe some natural language parsing later

Cancel text command
    Parameters: id
    Cancels the run.

PullReserves text command (maybe)
    Simply expedites the reserve password posting.

Embeds
    Two messages.

    Embed 1: Overview
        List event creator (raid lead)
        List dynamic timestamp
        List a little description of the run (type / purpose / conditions).
        Leads (one of each element)
    Reacts:
        Fancy Discord button reacts for party leads. Click again to remove.
        DM if it fails.

    Embed 2: Roster
        Show list of people who have signed up
        Lists:
            Vertical: Fire, Ice, Wind, Earth, Lightning, Water, Support
            Horizontal: Reserves
        Bold party leads.
    Reacts:
        Fancy Discord button reacts for party members (different colours).
        DM if it fails, signing up for the next free party, or reserves otherwise.

Runtime DMs
    15min prior, party leads are DMed with a party-specific password.
    0min prior, all rostered players are DMed with their party-specific password.
    15min after, reserves are DMed ALL party-specific passwords (a list).
    Start time is hopefully X:15-X:30.


