# Luca Huelle - Programming (Black) \[COMP1101\] - Summative Assessment 1

_December 2021 - January 2022_

## _Key points in this README_

- [About the included video](#notes-on-the-accompanying-functionality-demonstration-video)
- [⚠ IMPORTANT - Before you run any code!](#before-you-run-any-code)
- [Setup and installation](#setup-and-running)
- [Where is the API Documentation?](#api-documentation)
- [⚠ IMPORTANT - Why are some JEST tests failing with `Received: 500`?](#important-notes-on-testing)

## Notes on the accompanying functionality demonstration video

**Virtually all** API endpoints are covered, at least indirectly (i.e. **shown in the network log**
displayed at all times), at some point in the video. The only omissions are as follows:

- `GET /comments` (with no query parameters)
- `GET /cards?ids=...`
- `GET /comments/:id`

This is simply because their 'mirroring endpoint' is shown with identical functionality (merely
operating on a different entity). In the same order again, the equivalent endpoints which _are_
demonstrated at some point in the video are:

- `GET /cards` (with no query parameters)
- `GET /comments?ids=...`
- `GET /cards/:id`

Note that all endpoints have been written to be more rigorous than just accepting data from the web
app. That is, there are errors and status codes, such as `400 Bad Request`, not shown in the video
which are still implemented.

However, **all** client side Javascript and HTML/Bootstrap code _is_ demonstrated in some way.

## Before you run any code!

Before running any tests and/or code, please run both `node --version` and `npm --version` and
confirm you are using at least

- nodejs version: `v16.13.1`
- npm: `8.1.4`

All code was written and tested with these versions in _JetBrain's WebStorm 2021.2.2_.

## About the project

I wasn't able to take part in the [Advent of Code](https://adventofcode.com/) this year since I was
too busy with this project 😂. So this is a one-page website that lets users share interesting
comments and solutions to the daily problems from the subreddit which can otherwise easily be missed
amongst all the activity on each day. Users can highlight new comments and their associated code
snippets in 'cards' which other users can then comment on. Comments can be edited.

## Setup and running

### Installation

To perform a basic installation of the project (**_without_** any `JEST` testing or `eslint`
capacity), simply run `npm install --production=true` in this directory. This will install the
dependencies listed in `package.json` automatically.

Should you wish to be able to run tests and other associated dev commands (e.g. `npm test`,
`npm run pretest`), use just `npm install` without the `production` flag.

### What's included and running the code

This project includes all the **client side code** (in the `\client` folder which includes
local `html`, `css` and `js` files) as well as **server-side code** for the API (in `app.js`
and `helperFunctions.js`). It also includes some additional files for repo management (
e.g. `.eslintrc.js`, `.gitignore`) and testing (`serverdb.json` and `serverdb.test.json`)

All code is **fully documented** inline. Wherever I have heavily used any online sources, the
string `[src]` is used in code.

#### Common tasks

- Run the server using `npm start`. This will start a server on
  port [port 8000](http://localhost:8000/). Visit this url to view the site. Terminate this server
  using `Ctrl+C` and then entering `y`.
- Test the styling of files using `npm run pretest`
- Test the API using JEST with `npm test`
- To run the server in a development environment using `nodemon`, use `npm run run`

#### API Documentation

The documentation of the API developed for the project (with source code in `app.js`) can be found
[online at getpostman.com](https://documenter.getpostman.com/view/17830357/UVXnGETR)
(alternatively, an internet shortcut is included in the project directory). The documentation was
produced using Postman.

### Important notes on testing!

The JEST tests included in `server.test.js` run with **~85% coverage** of all server-side code.

Please note that sometimes the _asynchronous nature_ of some of the tests, most of which read/write
to the same `.json` database file, can result in test failures such as

```js
expect(received).toEqual(expected) // deep equality

Expected: 200
Received: 500
```

Where a `500 Internal Server Error` was returned by the API instead of the expected 200. In such a
case, **just re-run the tests again**. The same error is unlikely to occur again.

If tests fail with `TypeError: getDbData(...).cards.at is not a function` or similar, your **version
of nodejs is likely out of date** (see above).

## Licenses

- `favicon.png` Christmas Tree emoji © Microsoft
  ([MS Docs](https://docs.microsoft.com/en-us/typography/fonts/font-faq#document-embedding))
- Roboto Mono font licensed under the _Apache License, Version 2.0_
  ([Google Fonts](https://fonts.google.com/specimen/Roboto+Mono?query=roboto#license))
- highlight.js licensed under the _BSD 3-Clause "New" or "Revised" License_
  ([GitHub/highlightjs](https://github.com/highlightjs/highlight.js/blob/main/LICENSE))
- Bootstrap licensed under the _MIT License_
  ([GitHub/twbs](https://getbootstrap.com/docs/5.1/about/license/))
- Luxon licensed under the _MIT License_
  ([GitHub/moment](https://github.com/moment/luxon/blob/master/LICENSE.md))
