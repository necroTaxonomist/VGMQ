
function State(name, onEntry = function() {}, onExit = function() {})
{
    this.name = name;
    this.onEntry = onEntry;
    this.onExit = onExit;
    this.parent = null;

    this.handle = async function(name, event = {})
    {
        if (this[name])
        {
            let ret = this[name](event);
            if (Promise.resolve(ret))
                await ret;
        }
    }

    this.addHandler = function(name, handler)
    {
        this[name] = handler;
    }
}

function StateMachine(states = [])
{
    this.states = {};
    for (state of states)
    {
        this.states[state.name] = state;
        state.parent = this;
    }

    this.cur_state = null;

    this.handle = async function(name, event = {})
    {
        // Pass the event to the current state
        if (this.cur_state)
        {
            let ret = this.cur_state.handle(name, event);
            if (Promise.resolve(ret))
                await ret;
        }
    };

    this.goto = async function(state_name)
    {
        if (this.states[state_name])  // Valid state
        {
            // Call exit for current state
            if (this.cur_state)
            {
                let ret = this.cur_state.onExit();
                if (Promise.resolve(ret))
                    await ret;
            }

            // Set the new state
            this.cur_state = this.states[state_name];

            // Call enter for the new state
            let ret = this.cur_state.onEntry();
            if (Promise.resolve(ret))
                await ret;
        }
    };

    this.addState = function(state)
    {
        this.states[state.name] = state;
        state.parent = this;
    };
}

// This is used by both client and server
if (!(typeof window != 'undefined' && window.document))
{
    module.exports =
    {
        State,
        StateMachine
    };
}