# Incident communications

## Status page / customer update

Short, plain, no internal names, no guessed causes, no ETA you can't keep. Always say when the next update is.

**Investigating**
> **<Feature> is <failing / slow> for some users**
> We're investigating reports that <what users see, e.g. "checkout returns an error">. <Workaround if any, e.g. "Orders already placed are not affected.">. Next update by <hh:mm timezone>.

**Identified**
> We've found the cause of <the problem> and are working on a fix. <What still doesn't work>. Next update by <hh:mm>.

**Mitigated / Monitoring**
> A fix is in place and <feature> is working again. We're watching closely to make sure it stays that way. If you still see <the problem>, <what to do>. Next update by <hh:mm>.

**Resolved**
> <Feature> has been working normally since <hh:mm timezone>. Between <start> and <end>, <what users experienced, and who>. <Anything users need to do, e.g. "orders that failed were not charged; please retry">. We'll publish what happened and what we're changing.

## Internal update (channel, every 30 min for SEV1/2)

```
[SEV<n>] <title>, <state> as of <hh:mm>
Impact: <who and what, with the number>
Done since last update: <actions>
Now: <current action, who>
Next update: <hh:mm>
Need: <people, access, decisions>
```

## Asking for help (Condition, actions, needs)

```
Condition: <what's broken, impact>
Actions so far: <what's been tried, results>
Needs: <the specific person, skill or access, and by when>
```

## Handoff

```
Handing off IC for <incident> at <hh:mm>.
State: <sev, impact, investigating / mitigated>
Tried: <actions and results>
Current hypothesis: <...>
In flight: <actions running, who owns each>
Temporary changes to undo later: <flags, scaling, blocks>
Next update due: <hh:mm>, to <channel / status page>
```

Then: "You're now the incident commander, OK?" Leave only after an explicit yes.
