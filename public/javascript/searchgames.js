
function autocomplete(inp, extra_callback = undefined)
{
    // I stole this shit from W3Schools lol

    var currentFocus;
    var arr = [];

    // Execute a function when someone writes in the text field
    inp.addEventListener("input", async function(e)
        {
            // Close any open lists
            closeAllLists();

            if (!this.value)  // Nothing in the box
                return false;

            currentFocus = -1;

            // Create a div that will contain the items
            var a = document.createElement("div");
            a.setAttribute("id", this.id + "autocomplete-list");
            a.setAttribute("class", "autocomplete-items");

            // Append the div element as a child for the autocomplete container
            this.parentNode.appendChild(a);

            // Try to get matching games from the database
            try
            {
                arr = await getSimilar(this.value);
            }
            catch (err)
            {
                // Keep previous values
            }

            // For each item in the array
            for (item of arr)
            {
                // Create a div element for each item
                var b = document.createElement("div");

                // Write into the element
                b.innerText = item;

                // Insert an input field that will hold the item's value
                var sanitize = item.replace("'", "&#39");
                b.innerHTML += "<input type='hidden' value='" + sanitize + "'>";

                // Execute a function when someone clicks on the item value
                b.addEventListener("click", function(e)
                    {
                        // Insert this value for the autocomplete text field
                        inp.value = this.getElementsByTagName("input")[0].value;

                        // Close the list of autocompleted values
                        closeAllLists();

                        if (extra_callback)  // Call the enter callback also
                            extra_callback();
                    }
                );

                a.appendChild(b);
            }  // for
        }  // function
    );  // addEventListener

    // Execute a function when someone presses a key on the keyboard
    inp.addEventListener("keydown", function(e)
        {
            var x = document.getElementById(this.id + "autocomplete-list");

            if (x)
                x = x.getElementsByTagName("div");
            
            if  (e.keyCode == 40)
            {
                // If the down key is pressed, increase the currentFocus variable
                currentFocus++;

                // And make the current item more visible
                addActive(x);
            }
            else if (e.keyCode == 38)
            {
                // If the up key is pressed, decrease the currentFocus variable
                currentFocus--;

                // And make the current item more visible
                addActive(x);
            }
            else if (e.keyCode == 13)
            {
                // If the enter key is pressed, prevent the form from being submitted
                e.preventDefault();

                if (currentFocus > -1)
                {
                    // and simulate a click on the "active" item
                    if (x)
                        x[currentFocus].click();
                }
            }  // if-else
        }  // function
    );  // addEventListener

    function addActive(x)
    {
        // A function to classify an item as active
        if (!x)
            return false;
        
        // Start by removing the "active" class on all items
        removeActive(x);

        if (currentFocus >= x.length)
            currentFocus = 0;

        if (currentFocus < 0)
            currentFocus = (x.length - 1);

        // Add class "autocomplete-active"
        x[currentFocus].classList.add("autocomplete-active");
    }

    function removeActive(x)
    {
        // A function to remove the "active" class from all autocomplete items
        for (item of x)
        {
            item.classList.remove("autocomplete-active");
        }
    }

    function closeAllLists(elem)
    {
        // Close all autocomplete lists in the document,
        // except the one passed as an argument
        var x = document.getElementsByClassName("autocomplete-items");

        for (item of x)
        {
            if (elem != item && elem != inp)
            {
                item.parentNode.removeChild(item);
            }
        }
    }

    // Execeute a function when someon clicks in the document
    document.addEventListener("click", function(e)
        {
            closeAllLists(e.target);
        }
    );
}

// Stole this from StackOverflow, yay
function sleepAsync(millis)
{
    return new Promise((resolve) =>
        {
            setTimeout(resolve, millis);
        }
    );
}

// The time of the last query
var last_query = undefined;

// The minimum time that needs to pass before database queries (in milliseconds)
const minCooldown = 250;

// Promise for waiting until cooldown
var cooldownPromise = null;

// Value to search for
var searchValue = '';

// Make a database query
async function getSimilar(input)
{
    // Get the current time
    var now = new Date().getTime();

    // Set the search value
    searchValue = input;

    if (last_query != undefined)
    {
        // Find the time since the last query
        var distance = now - last_query;
        var cooldown = distance % (1000 * 60);

        /// Too soon to query again
        if (cooldown < minCooldown)
        {
            // Wait until cooldown completes
            await sleepAsync(minCooldown - cooldown);

            // Check if this is not the most recent query
            if (searchValue != input)
            {
                // Throw out this query
                throw "Outdated query";
            }
        }
    }

    // Set the new last query time
    last_query = now;

    try
    {
        // Make a search request through ajax
        var url = '/games/all?search=' + encodeURIComponent(input);
        var response = await xhttpAsync('get', url);
        var responseText = response.responseText;

        // Return as JSON
        return JSON.parse(responseText);
    }
    catch (err)
    {
        console.log('Failed to query DB: ' + err);
        return [];
    }
}
