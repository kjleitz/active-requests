# active-requests

A simple library for tracking how many HTTP requests are pending for a page.

## Installation

### via CDN

You can add `active-requests` to the document in a `<script>` tag (where it will be available globally and start tracking **immediately**) using a CDN link, like so:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Stuff</title>
    <!-- ... -->
    <script src="//cdn.jsdelivr.net/npm/active-requests"></script>
    <!-- ... -->
  </head>
  <body></body>
</html>
```

If you want to be able to track requests made from other scripts statically rendered into the document, you'll probably want to include the script tag as high in the `<head>` as you can manage.

Using this method of installation, you will have access to the `activeRequests` object globally on the window, and it will immediately start tracking requests.

### via `npm`/`yarn`

Install with:

```
yarn add active-requests
```

...or:

```
npm install active-requests
```

**Note:** If you're using TypeScript, types are already included; there's no need to install `@types/active-requests`, for instance.

Then import and initialize, like so:

```js
import activeRequests from 'active-requests';

activeRequests.start();
```

## Usage

### Initialization

If you install `active-requests` by including a CDN src'd script tag like in the example above, you don't need to initialize with `activeRequests.start()`. However, if you are importing the library into another script, you will need to initialize it explicitly. You can do so like this:

```ts
activeRequests.start();
```

You can also stop `activeRequests` from tracking any more new requests, with:

```ts
activeRequests.stop();
```

Once `activeRequests.stop()` is called, it will still finish/timeout any requests that it _was_ tracking before the call to `stop()`, but it will not register any new requests.

### Check the total number of currently-active requests

Count the number of requests that are currently active:

```ts
setInterval(() => console.log(activeRequests.count, 'active'), 100);

console.log('stage 1:', activeRequests.count, 'active');

// Works with vanilla XHRs and anything that uses XMLHttpRequest...
const xhr = new XMLHttpRequest();
xhr.addEventListener('load', () => console.log('xhr finished!'));
xhr.open('https://foo.bar/1');
xhr.send();

console.log('stage 2:', activeRequests.count, 'active');

// Works with fetch and anything that uses fetch...
fetch('https://foo.bar/2').then(() => console.log('fetch finished!'));

console.log('stage 3:', activeRequests.count, 'active');

// For example, jQuery AJAX requests work fine...
$.get('https://foo.bar/3').then(() => console.log('jquery finished!'))

console.log('stage 4:', activeRequests.count, 'active');

// And so do requests made with axios...
axios.get('https://foo.bar/4').then(() => console.log('axios finished!'))

console.log('stage 5:', activeRequests.count, 'active');

// The logs should look something like this:
//
//   stage 1: 0 active
//   stage 2: 1 active
//   stage 3: 2 active
//   stage 4: 3 active
//   stage 5: 4 active
//   4 active
//   4 active
//   4 active
//   4 active
//   xhr finished! active
//   3 active
//   3 active
//   fetch finished! active
//   2 active
//   2 active
//   2 active
//   2 active
//   jquery finished! active
//   1 active
//   1 active
//   axios finished! active
//   0 active
//   0 active
//   0 active
//
// ...and so on.
```

### Get a list of currently-active requests

Access currently-active requests with `fetchRequests` and `xhrRequests`:

```ts
console.log(activeRequests.fetchRequests); //=> []
console.log(activeRequests.xhrRequests);   //=> []

const fetch1 = fetch('https://example.com/1').then((resp) => { /* ... */ });
const fetch2 = fetch('https://example.com/2').then((resp) => { /* ... */ });

console.log(activeRequests.fetchRequests); //=> [Promise<Response>, Promise<Response>]
console.log(activeRequests.xhrRequests);   //=> []

console.log(fetch1 === activeRequests.fetchRequests[0]); //=> true
```

```ts
console.log(activeRequests.fetchRequests); //=> []
console.log(activeRequests.xhrRequests);   //=> []

const xhr1 = axios.get('https://example.com/1').then((resp) => { /* ... */ });
const xhr2 = axios.get('https://example.com/2').then((resp) => { /* ... */ });

console.log(activeRequests.fetchRequests); //=> []
console.log(activeRequests.xhrRequests);   //=> [XMLHttpRequest, XMLHttpRequest]

console.log(xhr1 === activeRequests.fetchRequests[0]); //=> true
```

### Check to see if `activeRequests` is running

See if `activeRequests` has been initialized/started (or stopped) with `activeRequests.running`:

```ts
import activeRequests from 'active-requests';

console.log(activeRequests.running); //=> false

activeRequests.start();

console.log(activeRequests.running); //=> true

activeRequests.stop();

console.log(activeRequests.running); //=> false
```

### Settings

Configure behavior with `activeRequest.settings`:

```ts
const settings = {
  debug: true,    // Log helpful information to the console whenever a request
                  // starts, finishes, or times out. Default: false.

  timeout: 10000, // Number of milliseconds to wait for a request to finish
                  // before considering it "inactive" for tracking purposes.
                  // This does NOT cancel the request, it just counts it as
                  // having "finished early." Default: -1 (no timeout).
};

// Modify the settings directly:
activeRequests.settings.debug = true;

// Replace them:
activeRequests.settings = settings;

// Or, just pass them to `activeRequests.start()` when initializing:
activeRequests.start(settings);
```

## But... why?

The idea for this library came from a need to wait for AJAX requests to finish during test runs using [Capybara](https://github.com/teamcapybara/capybara) for Rails. Previously, most AJAX requests in the app had used jQuery's `$.ajax` in some way, so the existing strategy was to keep checking `jQuery.active`; once it returned `0`, you knew whatever request you'd triggered was complete and you could move on to the rest of the integration test being sure that the asynchronous action had finished loading (i.e., any new DOM content was rendered) and you could assert presence for certain UI elements.

When that project began moving to newer technologies, there was an issue: there's no one source of truth anymore, re: "request tracking." Now there were multiple libraries (axios, for example, does not have an equivalent to jQuery's `jQuery.active`), and also multiple underlying methods for making HTTP requests (both `XMLHttpRequest` and `fetch`).

So... this solves that problem. Yay!

## Contributing

Bug reports and pull requests for this project are welcome at its [GitHub page](https://github.com/kjleitz/active-requests). If you choose to contribute, please be nice so I don't have to run out of bubblegum, etc.

## License

This project is open source, under the terms of the [MIT license](https://github.com/kjleitz/jivescript/blob/master/LICENSE).
