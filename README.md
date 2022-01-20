# Luca Huelle - COMP1101 Programming (Black) Summative Assessment 1

_December 2021 - January 2022_

## Before you start!

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
snippets in 'cards' which other users can then comment on.

## Setup and running

### Installation

To perform a basic installation of the project (**_without_** any `JEST` testing or `eslint`
capacity)
, simply run `npm install --production=true` in this directory. This will install the dependencies
listed in `package.json` automatically.

Should you wish to be able to run tests and other associated dev commands (e.g. `npm test`
, `npm run pretest`), use just `npm install` without the production flag. .

### What's included and running the code

This project includes all the **client side code** (in the `\client` folder which includes
local `html`, `css` and `js` files) as well as **server-side code** for the api (in `app.js`
and `helperFunctions.js`). It also includes some additional files for repo management (
e.g. `.eslintrc.js`, `.gitignore`) and testing (`serverdb.json` and `serverdb.test.json`)

All code is **fully documented** inline. Wherever I have heavily used any online sources, the
string `[src]` is used in code.

#### Common tasks

- Run the server using `npm start`. This will start a server on
  port [port 8000](http://localhost:8000/). Visit this url to view the site. Terminate this server
  using `Ctrl+C` and then entering `y`.
- Test the styling of files using `npm run pretest`
- Test the api using JEST with `npm test`

#### API Documentation

The documentation of the API developed for the project (with source code in `app.js`) can be found
at https://documenter.getpostman.com/view/17830357/UVXnGETR (alternatively, an internet shortcut is
included in the project directory). The documentation was produced using Postman.

### Important notes on testing!

The JEST tests included in `server.test.js` run with **~85% coverage** of all server-side code.

Please note that sometimes the _asynchronous nature_ of some of the tests, most of which read/write
to the same `.json` database file, can result in test failures such as

```js
expect(received).toEqual(expected) // deep equality

Expected: 200
Received: 500
```

Where a `500 Internal Server Error` was returned by the api instead of the expected 200. In such a
case, **just re-run the tests again**. The same error is unlikely to occur again.

If tests fail with `TypeError: getDbData(...).cards.at is not a function` or similar, your **version
of nodejs is likely out of date** (see above).
