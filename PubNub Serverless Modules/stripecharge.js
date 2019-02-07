// DO NOT USE THIS CODE CLIENT SIDE. FOR A PUBNUB SERVERLESS ENV ONLY.
// Set the module event type to "On Request".
export default (request, response) => {
    const db = require("kvstore");
    const vault = require("vault");
    const xhr = require("xhr");
    const token = request.params.token;
    const username = request.params.username;
    return db.get(username).then((dataFromDb) => {
        if (!dataFromDb)  {
            return vault.get("sk_test").then((apiKey) => {
                const http_options = {
                    "method": "POST",
                    "headers": {
                        "Authorization": "Bearer "+apiKey,
                    },
                };
                return xhr.fetch("https://api.stripe.com/v1/charges?amount=100&currency=usd&source="+token, http_options).then((resp) => {
                    if (resp.status == 200) {
                        db.set(username, {});
                    }
                    response.status = resp.status;
                    return response.send(resp);
                });
            });
       } else {
           console.log("The username already exists!");
           response.status = 200;
           return response.send("Allowed");
       }
    });
};
