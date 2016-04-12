# Warning!

This project is provided as is and still in heavy development. 

**DO NOT USE IN PRODUCTION**

## Setup

You need to provide the Primus library from server side.

    const primus = new Primus(server, ...);
    primus.library();

This exposes a proper configured Primus client per default at `/primus/primus.js'.

You can include this file in your ember application then by adding the following line to your `index.html`.

    <script src="<SERVER_URL>/primus/primus.js"></script>

Now you can use the `PrimusDataAdapter` like any other adapter in Ember.

# Ember-data-primus

This README outlines the details of collaborating on this Ember addon.

## Installation

* `git clone` this repository
* `npm install`
* `bower install`

## Running

* `ember server`
* Visit your app at http://localhost:4200.

## Running Tests

* `npm test` (Runs `ember try:testall` to test your addon against multiple Ember versions)
* `ember test`
* `ember test --server`

## Building

* `ember build`

For more information on using ember-cli, visit [http://www.ember-cli.com/](http://www.ember-cli.com/).
