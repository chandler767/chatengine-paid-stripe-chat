export default (request, response) => {
    const db = require("kvstore");
    const username = request.params.username;
    return db.get(username).then((dataFromDb) => {
        if (!dataFromDb)  {
            console.log("The username does not exist!");
           // db.set(username, {}); // Uncomment to allow on later requests.
            response.status = 401;
            return response.send("Not Allowed");
       } else {
           console.log("The username already exists!");
           response.status = 200;
           return response.send("Allowed");
       }
    });
};
