const express = require('express');

async function run() {
    const app = express();
    app.use(express.json());

    const port = 3000;

    app.listen(port, () => {
        console.log("Server Listening on PORT:", port);
    });

    // Modifica il metodo da get a post e l'endpoint in "/api/dati"
    app.post("/status", (request, response) => {
        // Accedi ai dati inviati nel corpo della richiesta POST
        const postData = request.body;

        // Puoi eseguire ulteriori operazioni con i dati inviati...
        console.log('Dati ricevuti:', postData);
        response.sendStatus(200);
    });
}

run();