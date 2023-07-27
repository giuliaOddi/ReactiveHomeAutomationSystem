# TODO REST Server

REST APIs for the [TODO web application][1] used as a training bench for the university course "Sistemi Orientati ad
Internet" at the University of Parma, 2021-2022.

## How to run

```shell
npm i
npm start
```

This will start the server on port 8000.

For development purpose, you can also automatically re-run the server if source files change:

```shell
npm run watch
```

## How to run with Traefik

Traefik acts as a reverse proxy and we can exploit that to expose the web app and the server APIs as a whole. First
download [Traefik][2].

The install `http-server`:

```shell
npm i -g http-server
```

Now open three terminals:

- in the first one, enter the `todo-server` project and run `npm start` (or `npm run watch`)
- in the second one, enter the `todo-server` project (again) and run `traefik`
- in the third terminal, enter the `todo-app` and run `http-server -p 7001 .`

Finally, point your browser to `http://localhost:9000`.

## Setting up OpenID Connect with Google

First, make sure you have a Google account (a Gmail account will be just fine). Also, make sure you can login to
the [Google Cloud Platform (GCP) console][3].

Follow the steps describe in [this documentation][4] up to the playground section (included).

[1]: https://github.com/SOI-Unipr/todo-app

[2]: https://doc.traefik.io/traefik/getting-started/install-traefik/

[3]: https://console.cloud.google.com

[4]: https://developers.google.com/identity/protocols/oauth2/openid-connect
