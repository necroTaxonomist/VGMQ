
async function xhttpAsync(action, url, data = undefined, headers={})
{
    // Submit through ajax
    var xhr = new XMLHttpRequest();

    // Get the response
    return new Promise(function(resolve, reject)
        {
            xhr.onreadystatechange = function()
            {
                if (xhr.readyState == 4)
                {
                    if (xhr.status >= 300)
                    {
                        reject("Error, status code = " + xhr.status)
                    }
                    else
                    {
                        resolve(xhr);
                    }
                }
            }

            xhr.open(action, url, true);

            for (name in headers)
            {
                xhr.setRequestHeader(name, headers[name]);
            }

            if (data == undefined)
                xhr.send();
            else
                xhr.send(data);
        }
    );
}

async function xhttpAsyncForm(url, form)
{
    // Convert formdata to a string
    const str = new URLSearchParams(form).toString();
    return xhttpAsync('post', url, str, { "Content-Type": "application/x-www-form-urlencoded" });
}