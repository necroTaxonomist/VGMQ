
function State(name, onEntry = function() {}, onExit = function() {})
{
    this.name = name;
    this.onEntry = onEntry;
    this.onExit = onExit;
    this.parent = null;

    this.handle = function(event)
    {
        if (this[event.name])
        {
            this[event.name](event);
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

    this.handle = function(event)
    {
        // Pass the event to the current state
        if (this.cur_state)
        {
            this.cur_state.handle(event);
        }
    }

    this.goto = function(state_name)
    {
        if (this.states[state_name])  // Valid state
        {
            // Call exit for current state
            if (this.cur_state)
            {
                this.cur_state.onExit();
            }

            // Set the new state
            this.cur_state = this.states[state_name];

            // Call enter for the new state
            this.cur_state.onEntry();
        }
    }

    this.addState = function(state)
    {
        this.states[state.name] = state;
        state.parent = this;
    }
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