const express = require('express');

const app = express ();
app.use(express.json());

app.listen(PORT, () => {
    console.log("Server Listening on PORT:", port);
});

// NB sostituire get con post
app.get("/status", (request, response) => {
    const status = {
        "Status": "Running"
    };

    response.send(status);
});